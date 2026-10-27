#!/usr/bin/env python3
"""Build course pages from course.json files.

Usage:
    python3 build_course.py courses/<slug>            # course page + every written chapter → courses/<slug>/dist/
    python3 build_course.py courses/ --catalog        # catalog of every course → courses/catalog.html

The course page shows the hero, outcomes and the syllabus (chapter status, minutes,
topics). Chapters with a chapter.md are built with build_chapter.py and linked.
"""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _pages import accent_vars, code_class, esc, lesson_slots, load_course, page, plural_lessons, rail, ASSETS  # noqa: E402
from availability import is_open, load_availability, summary  # noqa: E402
from plan_xlsx import plan_filename, write_plan_xlsx  # noqa: E402

HERE = Path(__file__).resolve().parent
SHADER_JS = (ASSETS / "shader.js").read_text(encoding="utf-8")


def chapter_dir(c: dict) -> str:
    return c.get("dir") or f'{int(c["n"]):02d}-{c["slug"]}'


def price(c: dict) -> str:
    if c.get("price") in (None, ""):
        return ""
    cur = c.get("currency") or ""
    sym = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}.get(cur, f"{cur} " if cur else "")
    return f"{sym}{int(c['price']):,}"


def spec_line(c: dict, hours: int = None) -> str:
    h = hours if hours is not None else c.get("hours")
    bits = [c.get("level"), f'{h} ч' if h else None]
    if c.get("languages"):
        bits.append(" / ".join(c["languages"]))
    return " · ".join(b for b in bits if b)


def build_course(root: Path) -> Path:
    c = load_course(root / "course.json")
    dist = root / "dist"
    dist.mkdir(exist_ok=True)
    availability = load_availability(root)
    items, written = [], 0
    slot = 1
    for ch in c.get("chapters", []):
        pairs = max(1, round(int(ch.get("minutes") or 90) / 90))
        lesson = f"{slot}" if pairs == 1 else f"{slot}<br>-<br>{slot + pairs - 1}"
        slot += pairs
        dirname = chapter_dir(ch)
        d = root / "chapters" / dirname
        md = d / "chapter.md"
        open_ = is_open(c, dirname, availability)
        locked = md.exists() and not open_
        link = None
        if md.exists() and open_:
            r = subprocess.run([sys.executable, str(HERE / "build_chapter.py"), str(md)], capture_output=True, text=True)
            print(r.stdout.strip() or r.stderr.strip())
            if r.returncode == 0:
                link = f"{dirname}.html"
                written += 1
        elif locked:
            stale = dist / f"{dirname}.html"
            if stale.exists():
                stale.unlink()
        tags = [f"<span>{esc(t)}</span>" for t in ch.get("topics", [])[:6]]
        ST = {"planned": "план", "drafted": "черновик", "figures-pending": "фигуры готовятся", "published": "готово"}
        if locked:
            status = " · закрыто"
        else:
            status = "" if link else f' · {esc(ST.get(ch.get("status", "planned"), ch.get("status", "план")))}'
        title = esc(ch["title"])
        cls = ' class="locked"' if locked else ""
        inner = (f'<div class="n">{lesson}</div><h3>{title}</h3>'
                 f'<div class="mins">{esc(ch.get("minutes", ""))}{" мин" if ch.get("minutes") else ""}{status}</div>'
                 f'<p>{esc(ch.get("summary", ""))}</p><div class="tags">{"".join(tags)}</div>')
        card = (f'<a class="lesson-card" href="{link}">{inner}</a>' if link
                else f'<div class="lesson-card lesson-card-static">{inner}</div>')
        items.append(f'<li{cls}>{card}</li>')

    n_ch = len(c.get("chapters", []))
    slots = lesson_slots(c.get("chapters", []))
    meta = " · ".join(x for x in [
        f"{slots} {plural_lessons(slots)}" if slots else None,
        esc(c.get("assessment", "")),
        summary(c, availability),
    ] if x)
    outcomes = ""
    if c.get("outcomes"):
        outcomes = '<section class="outcomes"><b>В результате обучения вы сможете</b><ul>' + "".join(
            f"<li>{esc(o)}</li>" for o in c["outcomes"]) + "</ul></section>"
    prereq = ""
    if c.get("prerequisites"):
        prereq = '<section class="outcomes"><b>Требуется предварительно</b><ul>' + "".join(
            f"<li>{esc(o)}</li>" for o in c["prerequisites"]) + "</ul></section>"
    price_pill = f'<span class="pill">{esc(price(c))}</span>' if price(c) else ""
    code = c.get("code", "")
    glyph_class = "glyph" + (f" {code_class(code)}" if code_class(code) else "")
    accent = c.get("accent", "#D04A28")
    seed = (sum(ord(ch) for ch in c.get("slug", "")) % 97) / 97.0
    for stale in dist.glob("Учебный_план_*.xlsx"):
        stale.unlink()
    plan_name = plan_filename(c)
    write_plan_xlsx(c, dist / plan_name)
    body = f"""<main class="page">{rail(back="#year", excel=plan_name)}
<header class="hero hero-course" data-shader data-accent="{esc(accent)}" data-seed="{seed:.3f}">
<canvas class="shader-bg" width="820" height="300" aria-hidden="true" style="background:linear-gradient(135deg,#08090D,{esc(accent)} 58%,#08090D)"></canvas>
<div class="badges">{price_pill}</div><div class="meta">{esc(meta)}</div>
<h1>{esc(c['title'])}</h1><p class="dek">{esc(c.get('tagline', ''))}</p>
<div class="{glyph_class}" aria-hidden="true">{esc(code)}</div></header>
    {outcomes}{prereq}
<article class="prose"><h2 class="nonum" style="margin-top:36px">Учебный план</h2></article>
<ol class="syllabus">{''.join(items)}</ol></main>"""
    out = dist / "index.html"
    out.write_text(page(c["title"], body, accent_vars(c), "", SHADER_JS), encoding="utf-8")
    print(f"wrote {out}: {n_ch} chapters, {written} written")
    return out


def build_catalog(root: Path) -> Path:
    courses = [load_course(p) for p in sorted(root.glob("*/course.json"))]
    courses.sort(key=lambda c: (c.get("status") != "available", c.get("order", 99)))
    cards = []
    for c in courses:
        slots = lesson_slots(c.get("chapters", []))
        ch_label = f"{slots} {plural_lessons(slots)}" if slots else ""
        avail = c.get("status") == "available"
        style = (f"--cl-accent:{c['accent']};--cl-tint:{c['tint']};"
                 f"--cd-accent:{c.get('accentDark', c['accent'])};--cd-tint:{c.get('tintDark', c['tint'])}")
        code = c.get("code", "")
        glyph_class = "glyph" + (f" {code_class(code)}" if code_class(code) else "")
        cards.append(f"""<a class="course-card" data-status="{'available' if avail else 'soon'}" href="{esc(c['slug'])}/index.html" style="{style}">
<div class="art"><span class="pill{' dark' if avail else ''}">{'Доступно' if avail else 'Готовится'}</span><span class="ch">{ch_label}</span>
<div class="{glyph_class}" aria-hidden="true">{esc(code)}</div></div>
<div class="body"><h3>{esc(c['title'])}</h3><p>{esc(c.get('tagline', ''))}</p><div class="spec">{esc(spec_line(c))}</div>
<div class="foot"><span class="price">{esc(price(c))}</span><span class="btn{' primary' if avail else ''}">{'Открыть' if avail else 'Готовится'}</span></div></div></a>""")
    body = f"""<main class="catalog"><div class="catalog-head"><div class="filters" role="group" aria-label="Фильтр курсов">
<button aria-pressed="true" data-f="all">Все</button><button aria-pressed="false" data-f="available">Доступные</button><button aria-pressed="false" data-f="soon">Готовятся</button></div>
<span class="count">{len(courses)} курсов</span></div><div class="grid">{''.join(cards)}</div></main>"""
    css = """.course-card{--c-accent:var(--cl-accent);--c-tint:var(--cl-tint)}
@media (prefers-color-scheme: dark){:root:not([data-theme=light]) .course-card{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}}
:root[data-theme=dark] .course-card{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}"""
    js = """document.querySelectorAll('.filters button').forEach(function(b){b.onclick=function(){
document.querySelectorAll('.filters button').forEach(function(x){x.setAttribute('aria-pressed', x===b)});
var f=b.dataset.f, n=0; document.querySelectorAll('.course-card').forEach(function(c){var on=f==='all'||c.dataset.status===f; c.style.display=on?'':'none'; n+=on});
document.querySelector('.count').textContent=n+' курсов';}});"""
    out = root / "catalog.html"
    out.write_text(page("Courses", body, "", css, js), encoding="utf-8")
    print(f"wrote {out}: {len(courses)} courses")
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    root = Path(sys.argv[1]).resolve()
    if "--catalog" in sys.argv:
        for cj in sorted(root.glob("*/course.json")):
            build_course(cj.parent)
        build_catalog(root)
    else:
        build_course(root)


if __name__ == "__main__":
    main()
