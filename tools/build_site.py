#!/usr/bin/env python3
"""Assemble the whole course suite into a static site under `docs/` for GitHub Pages.

The site is four levels deep:

    docs/index.html                 the landing: specialties with year cards inside
    docs/<year>/index.html          the year page: one card per discipline
    docs/<year>/<slug>/index.html   the discipline plan (syllabus)
    docs/<year>/<slug>/<chapter>.html  a lecture or a practical

Sources:
    site.json                       specialties, their year cards and accents
    courses/<year>/<slug>/course.json   the discipline card + syllabus

Builds every discipline (course page + written chapters), copies each one to
docs/<year>/<slug>/, copies downloadable reports, and writes the landing and
year pages.

Usage:
    python tools/build_site.py            # from the project root
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
KS = HERE / "ks" / "scripts"
sys.path.insert(0, str(KS))

from _pages import code_class, esc, lesson_slots, load_course, page, plural_lessons  # noqa: E402

SITE = ROOT / "docs"
COURSES = ROOT / "courses"
SITE_JSON = ROOT / "site.json"

YEAR_FALLBACK = {"accent": "#2F6F5E", "tint": "#DDEBE5", "accentDark": "#5CC4A4", "tintDark": "#18302A"}

CARD_CSS = r"""
.course-card{--c-accent:var(--cl-accent);--c-tint:var(--cl-tint)}
@media (prefers-color-scheme: dark){:root:not([data-theme=light]) .course-card{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}}
:root[data-theme=dark] .course-card{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}
.course-card.pending{opacity:.62}.course-card.pending:hover{opacity:1}
.course-card .art .glyph.code-md{font-size:84px;right:-2px;bottom:-12px}
.course-card .art .glyph.code-lg{font-size:56px;right:10px;bottom:10px;letter-spacing:-.04em}
.course-card .art .glyph.code-xl{font-size:42px;right:12px;bottom:14px;letter-spacing:-.03em}

/* bento grid for the discipline and year cards */
.bento{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px;grid-auto-flow:dense}
.bento .course-card{grid-column:span 2}
.bento .course-card:nth-child(5n+1),.bento .course-card:nth-child(5n+2){grid-column:span 3}
.bento .course-card:nth-child(5n+1) .art{height:236px}
.bento .course-card:nth-child(5n+2) .art{height:216px}
.years-grid.bento{grid-template-columns:repeat(3,minmax(0,1fr))}
.years-grid.bento .course-card,.years-grid.bento .course-card:nth-child(n){grid-column:span 1}
.years-grid.bento .course-card:nth-child(3n+1){grid-column:span 2}
.years-grid.bento .course-card:nth-child(3n){grid-column:span 3}
.years-grid.bento .course-card:nth-child(3n) .art{height:176px}
@media(max-width:980px){
  .bento,.years-grid.bento{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bento .course-card,.bento .course-card:nth-child(n),
  .years-grid.bento .course-card,.years-grid.bento .course-card:nth-child(n){grid-column:span 1}
  .bento .course-card:nth-child(3n+1) .art,.bento .course-card:nth-child(3n+2) .art{height:220px}
}
@media(max-width:620px){
  .bento,.years-grid.bento{grid-template-columns:1fr}
  .years-grid.bento .course-card:nth-child(3n+1),.years-grid.bento .course-card:nth-child(3n){grid-column:span 1}
}

/* live shader background on discipline cards */
.shader-card{position:relative;isolation:isolate;overflow:hidden;background:#08090D;color:#fff;border-color:rgba(255,255,255,.14)}
.shader-card.pending{opacity:.8}
.shader-card .shader-bg{position:absolute;inset:0;display:block;width:100%;height:100%;z-index:0;pointer-events:none;background:linear-gradient(135deg,#08090D,var(--c-accent) 58%,#08090D)}
.shader-card .art,.shader-card .body{position:relative;z-index:1}
.shader-card .art{background:transparent}
.shader-card .body{background:rgba(8,9,13,.68);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid rgba(255,255,255,.12)}
.shader-card .pill{background:rgba(8,9,13,.55);color:#fff;border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px)}
.shader-card .pill.dark{background:color-mix(in srgb,var(--c-accent) 72%,#08090D);border-color:color-mix(in srgb,var(--c-accent) 55%,#fff);color:#fff}
.shader-card .ch{color:rgba(255,255,255,.7);text-shadow:0 1px 10px rgba(0,0,0,.7)}
.shader-card .glyph{color:var(--c-accent);opacity:.9;text-shadow:0 2px 18px rgba(0,0,0,.8),0 0 2px rgba(0,0,0,.5)}
.shader-card h3{color:#fff}
.shader-card p{color:rgba(255,255,255,.76)}
.shader-card .spec{color:rgba(255,255,255,.6)}
.shader-card:hover{box-shadow:0 26px 70px -28px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.16)}

/* year cards stay light but follow the same bento rhythm */
.years-grid.bento .year-card .art{background:var(--c-tint)}
.years-grid.bento .year-card:nth-child(3n) .body{padding-bottom:26px}

.specialty{border:1px solid var(--rule);border-radius:var(--radius);background:var(--card);margin:0 0 14px;overflow:hidden}
.specialty summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:16px 20px;font:700 18px/1.3 var(--font-display)}
.specialty summary::-webkit-details-marker{display:none}
.specialty summary::after{content:'+';margin-left:8px;font:600 18px var(--font-mono);color:var(--accent)}
.specialty[open] summary::after{content:'−'}
.specialty .spec-count{font:12px var(--font-mono);color:var(--ink-2);margin-left:auto}
.specialty .years-grid{padding:0 16px 16px}
.specialty-empty{margin:0;padding:0 20px 18px;color:var(--ink-2)}
"""

SHADER_SCRIPT = r"""
(function(){
  var cards = [].slice.call(document.querySelectorAll('.shader-card'));
  if(!cards.length) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vsrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fsrc = `precision highp float;uniform vec2 u_res;uniform float u_time;
  uniform vec3 u_c1;uniform vec3 u_c2;uniform vec3 u_c3;uniform float u_seed;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
  void main(){
    vec2 uv=(gl_FragCoord.xy*2.-u_res)/min(u_res.x,u_res.y);
    uv += vec2(u_seed*1.7,u_seed*1.1);
    float t=u_time*.05+u_seed*3.0;
    vec2 q=vec2(fbm(uv*1.15+t*.7),fbm(uv*1.15-t*.5));
    float r=fbm(uv*1.4+q*1.9+vec2(t*.6,0.));
    vec3 col=vec3(.031,.035,.051);
    col=mix(col,u_c1,smoothstep(.30,.82,r)*.95);
    col=mix(col,u_c2,smoothstep(.50,.90,fbm(uv*2.1-q*1.6+t*.4))*.45);
    col=mix(col,u_c3,smoothstep(.60,.95,r+q.x*.3)*.5);
    col*=.82+.50*q.y;
    gl_FragColor=vec4(col,1.);
  }`;
  function hexRgb(hex){
    hex = String(hex||'#7C5CFF').replace('#','');
    if(hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
    var n = parseInt(hex,16);
    if(isNaN(n)) return [.486,.361,1];
    return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];
  }
  function rgbHsl(c){
    var r=c[0],g=c[1],b=c[2],max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2,d=max-min;
    if(d){ s=l>.5?d/(2-max-min):d/(max+min);
      if(max===r) h=(g-b)/d+(g<b?6:0);
      else if(max===g) h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h/=6; }
    return [h,s,l];
  }
  function hue(h,s,l){
    function f(n){var k=(n+h*12)%12;return l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,Math.min(9-k,1)));}
    return [f(0),f(8),f(4)];
  }
  function palette(hex, seed){
    var hsl=rgbHsl(hexRgb(hex)), h=(hsl[0]+(seed-.5)*.16+1)%1, s=Math.max(.6,hsl[1]);
    return [hue(h,s,.6),hue((h+.13)%1,.78,.62),hue((h+.87)%1,.72,.64)];
  }
  function shader(gl,type,src){
    var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s;
  }
  function init(card,index){
    var cv=card.querySelector('canvas'); if(!cv) return;
    var gl=null;
    try { gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'}) || cv.getContext('experimental-webgl'); } catch(e) {}
    if(!gl){ return; }
    var pr=gl.createProgram();
    gl.attachShader(pr,shader(gl,gl.VERTEX_SHADER,vsrc));
    gl.attachShader(pr,shader(gl,gl.FRAGMENT_SHADER,fsrc));
    gl.linkProgram(pr); gl.useProgram(pr);
    var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var uRes=gl.getUniformLocation(pr,'u_res'),uT=gl.getUniformLocation(pr,'u_time');
    var uC1=gl.getUniformLocation(pr,'u_c1'),uC2=gl.getUniformLocation(pr,'u_c2'),uC3=gl.getUniformLocation(pr,'u_c3');
    var uSeed=gl.getUniformLocation(pr,'u_seed');
    var seed=parseFloat(card.getAttribute('data-seed'))||0;
    var colors=palette(card.getAttribute('data-accent'),seed);
    gl.uniform3f(uC1,colors[0][0],colors[0][1],colors[0][2]);
    gl.uniform3f(uC2,colors[1][0],colors[1][1],colors[1][2]);
    gl.uniform3f(uC3,colors[2][0],colors[2][1],colors[2][2]);
    gl.uniform1f(uSeed,seed);
    function size(){
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=cv.clientWidth||card.clientWidth||640, h=cv.clientHeight||card.clientHeight||360;
      cv.width=Math.max(1,Math.round(w*dpr)); cv.height=Math.max(1,Math.round(h*dpr));
      gl.viewport(0,0,cv.width,cv.height);
    }
    function draw(now){
      gl.uniform2f(uRes,cv.width,cv.height);
      gl.uniform1f(uT,(now/1000)+seed*4.0);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    size();
    if(reduced){ draw(42000); return; }
    if(!('IntersectionObserver' in window)){ draw(42000); return; }
    var running=false, raf=0;
    function frame(now){ draw(now); raf=requestAnimationFrame(frame); }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting && !running){ running=true; raf=requestAnimationFrame(frame); }
        else if(!en.isIntersecting && running){ running=false; cancelAnimationFrame(raf); }
      });
    },{threshold:.02});
    io.observe(cv);
    window.addEventListener('resize',function(){ size(); if(!running) draw(performance.now()); });
  }
  cards.forEach(init);
})();
"""



def plural_disciplines(n: int) -> str:
    n = abs(int(n)) % 100
    if 11 <= n <= 14:
        return "дисциплин"
    n %= 10
    if n == 1:
        return "дисциплина"
    if n in (2, 3, 4):
        return "дисциплины"
    return "дисциплин"


def load_site() -> dict:
    if SITE_JSON.exists():
        return json.loads(SITE_JSON.read_text(encoding="utf-8"))
    return {"title": "Материалы", "tagline": "Все курсы", "specialties": []}


def all_years(site: dict) -> list:
    years = []
    for specialty in site.get("specialties", []):
        years.extend(specialty.get("years", []))
    if not years:
        years = site.get("years", [])
    return sorted(years, key=lambda y: y.get("order", 99))


def plural_courses(n: int) -> str:
    n = abs(int(n)) % 100
    if 11 <= n <= 14:
        return "курсов"
    n %= 10
    if n == 1:
        return "курс"
    if n in (2, 3, 4):
        return "курса"
    return "курсов"


def year_of(course_dir: Path) -> str:
    """The year is the folder between courses/ and the discipline slug."""
    return course_dir.parent.name


def discover_courses():
    """Every courses/<year>/<slug>/course.json, sorted by year then order/title."""
    found = []
    for cj in sorted(COURSES.glob("*/*/course.json")):
        if cj.parts[-3] == "_anatomy":
            continue
        c = load_course(cj)
        found.append((year_of(cj.parent), cj.parent, c))
    found.sort(key=lambda t: (t[0], t[2].get("order", 99), t[2].get("title", "")))
    return found


def build_courses(discovered):
    built = []
    for year, course_dir, _ in discovered:
        r = subprocess.run([sys.executable, str(KS / "build_course.py"), str(course_dir)],
                           capture_output=True, text=True)
        print((r.stdout or r.stderr).strip())
        if r.returncode == 0:
            built.append((year, course_dir))
    return built


def copy_course(year: str, course_dir: Path) -> dict:
    c = load_course(course_dir / "course.json")
    slug = c["slug"]
    src = course_dir / "dist"
    dst = SITE / year / slug
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("shots*"))
    for shots_dir in dst.glob("shots*"):
        shutil.rmtree(shots_dir, ignore_errors=True)
    for page in dst.rglob("*.html"):
        text = page.read_text(encoding="utf-8")
        if 'href="#course-list"' in text:
            rel = os.path.relpath(SITE / "index.html", page.parent).replace("\\", "/")
            page.write_text(text.replace('href="#course-list"', f'href="{rel}"'), encoding="utf-8")
    reports = course_dir / "reports"
    if reports.exists():
        for target in (dst / "reports", src / "reports"):
            target.mkdir(parents=True, exist_ok=True)
            for f in reports.iterdir():
                if f.is_file() and f.suffix.lower() in (
                    ".docx", ".csv", ".pdf", ".xlsx", ".sql", ".json", ".yaml", ".yml", ".py"
                ) and not f.name.startswith("make_"):
                    shutil.copy2(f, target / f.name)
    return c


def year_vars(y: dict) -> str:
    return (f"--cl-accent:{esc(y.get('accent', YEAR_FALLBACK['accent']))};"
            f"--cl-tint:{esc(y.get('tint', YEAR_FALLBACK['tint']))};"
            f"--cd-accent:{esc(y.get('accentDark', YEAR_FALLBACK['accentDark']))};"
            f"--cd-tint:{esc(y.get('tintDark', YEAR_FALLBACK['tintDark']))};")


def card_vars(c: dict) -> str:
    accent_dark = c.get("accentDark") or c.get("accent") or YEAR_FALLBACK["accentDark"]
    tint_dark = c.get("tintDark") or c.get("tint") or YEAR_FALLBACK["tintDark"]
    return (f"--cl-accent:{esc(c.get('accent', YEAR_FALLBACK['accent']))};"
            f"--cl-tint:{esc(c.get('tint', YEAR_FALLBACK['tint']))};"
            f"--cd-accent:{esc(accent_dark)};"
            f"--cd-tint:{esc(tint_dark)};")


def discipline_card(c: dict) -> str:
    n = lesson_slots(c.get("chapters", []))
    avail = c.get("status") == "available"
    code = c.get("code", "")
    spec = " · ".join(x for x in [esc(code), esc(c.get("level", "")),
                                  f"{c['hours']} ч" if c.get("hours") else None,
                                  f"{n} {plural_lessons(n)}" if n else None,
                                  esc(c.get("assessment", ""))] if x)
    card_class = "course-card shader-card" if avail else "course-card pending shader-card"
    glyph_class = "glyph" + (f" {code_class(code)}" if code_class(code) else "")
    accent = c.get("accent", YEAR_FALLBACK["accent"])
    seed = (sum(ord(ch) for ch in c.get("slug", "")) % 97) / 97.0
    return (
        f'<a class="{card_class}" href="{esc(c["slug"])}/index.html" style="{card_vars(c)}" '
        f'data-accent="{esc(accent)}" data-seed="{seed:.3f}">'
        f'<canvas class="shader-bg" width="640" height="360" aria-hidden="true" '
        f'style="background:linear-gradient(135deg,#08090D,{esc(accent)} 58%,#08090D)"></canvas>'
        f'<div class="art"><span class="pill{" dark" if avail else ""}">'
        f'{"Доступно" if avail else "Не готово"}</span><span class="ch">{n} зан.</span>'
        f'<div class="{glyph_class}" aria-hidden="true">{esc(code)}</div></div>'
        f'<div class="body"><h3>{esc(c["title"])}</h3>'
        f'<p>{esc(c.get("tagline", ""))}</p>'
        f'<div class="spec">{spec}</div></div></a>')


def year_page(y: dict, courses: list):
    yid = str(y["id"])
    body = (f'<main class="catalog">'
            f'<div class="crumbs"><a href="../index.html">Все курсы</a><span>/</span>'
            f'<span>{esc(y.get("title", yid))}</span></div>'
            f'<header class="hero"><div class="badges"><span class="pill dark">'
            f'{esc(y.get("title", yid))}</span></div>'
            f'<h1 style="max-width:100%">{esc(y.get("title", yid))}</h1>'
            f'<p class="dek" style="max-width:100%">{esc(y.get("tagline", ""))}</p>'
            f'<div class="glyph" aria-hidden="true">{esc(y.get("code", yid))}</div></header>')
    if courses:
        cards = "".join(discipline_card(c) for c in courses)
        head = (f'<div class="catalog-head"><h2 class="nonum">Дисциплины</h2>'
                f'<span class="count">{len(courses)} {plural_disciplines(len(courses))}</span></div>')
        body += f'{head}<div class="grid bento">{cards}</div>'
    else:
        body += '<article class="prose"><p>Дисциплины этого курса ещё не добавлены.</p></article>'
    body += '</main>'
    css = '.crumbs{margin:0 0 16px}' + CARD_CSS
    out = SITE / yid / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page(f'{y.get("title", yid)} · Материалы дисциплин', body,
                        year_vars(y), css, SHADER_SCRIPT), encoding="utf-8")
    print(f"wrote {out}: {len(courses)} {plural_disciplines(len(courses))}")


def year_card(y: dict, courses: list) -> str:
    yid = str(y["id"])
    total = sum(lesson_slots(c.get("chapters", [])) for c in courses)
    spec = (f'{len(courses)} {plural_disciplines(len(courses))}'
            + (f" · {total} {plural_lessons(total)}" if total else ""))
    return (
        f'<a class="course-card year-card" href="{esc(yid)}/index.html" style="{year_vars(y)}">'
        f'<div class="art"><span class="ch">{len(courses)} дисц.</span>'
        f'<div class="glyph" aria-hidden="true">{esc(y.get("code", yid))}</div></div>'
        f'<div class="body"><h3>{esc(y.get("title", yid))}</h3>'
        f'<p>{esc(y.get("tagline", ""))}</p><div class="spec">{esc(spec)}</div></div></a>')


def landing(site: dict, by_year: dict):
    blocks = []
    specialties = site.get("specialties", [])
    for specialty in specialties:
        years = sorted(specialty.get("years", []), key=lambda y: y.get("order", 99))
        cards = "".join(year_card(y, by_year.get(str(y["id"]), [])) for y in years)
        body = (f'<div class="grid years-grid bento">{cards}</div>' if cards
                else '<p class="specialty-empty">Дисциплины пока не добавлены.</p>')
        open_attr = " open" if specialty.get("open") else ""
        blocks.append(
            f'<details class="specialty"{open_attr}><summary>'
            f'<span>{esc(specialty.get("title", specialty.get("id", "")))}</span>'
            f'<span class="spec-count">{len(years)} {plural_courses(len(years))}</span>'
            f'</summary>{body}</details>')
    body = (f'<main class="catalog"><header class="hero">'
            f'<h1 style="max-width:100%">{esc(site.get("title", "Материалы"))}</h1>'
            f'<p class="dek" style="max-width:100%">{esc(site.get("tagline", "Все курсы"))}</p></header>'
            f'<div class="specialties">{"".join(blocks)}</div></main>')
    (SITE / "index.html").write_text(
        page(site.get("title", "Материалы"), body, "", CARD_CSS), encoding="utf-8")
    print(f"wrote {SITE / 'index.html'}: {len(specialties)} specialties, {len(all_years(site))} years")


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    (SITE / ".nojekyll").write_text("", encoding="utf-8")

    site = load_site()
    discovered = discover_courses()
    built = build_courses(discovered)
    by_year = {}
    for year, course_dir in built:
        c = copy_course(year, course_dir)
        by_year.setdefault(year, []).append(c)

    for y in all_years(site):
        year_page(y, by_year.get(str(y["id"]), []))
    landing(site, by_year)
    print(f"site written to {SITE}: {len(built)} course(s)")


if __name__ == "__main__":
    main()
