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
from _pages import accent_vars, code_class, esc, is_cards, lesson_slots, load_course, page, plural_lessons, plural_sections, rail, ASSETS  # noqa: E402
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


def card_art(ch: dict) -> str:
    """A small thematic SVG illustration for a lesson card."""
    title = str(ch.get("title", "")).lower()
    text = " ".join([
        str(ch.get("title", "")),
        str(ch.get("summary", "")),
        " ".join(ch.get("topics", []) or []),
    ]).lower()

    def choose(source: str):
        def has(*words):
            return any(word in source for word in words)

        if has("база данных", "субд", "mysql", "sql", "er-", "нормализ", "таблиц", "запрос",
               "резервн", "копир", "backup"):
            return "db"
        if has("безопас", "защит", "парол", "доступ", "аудит"):
            return "shield"
        if has("сеть", "tcp", "ip", "dns", "маршрут", "коммутац", "vpn"):
            return "network"
        if has("тест", "дефект", "баг", "качеств"):
            return "test"
        if has("api", "интеграц", "postman", "обмен", "сервис"):
            return "api"
        if has("проект", "wbs", "риск", "бюджет", "agile", "scrum", "план", "внедрен",
               "обследован", "требован", "изменен"):
            return "project"
        if has("интерфейс", "дизайн", "макет", "ux", "экран"):
            return "design"
        if has("ос", "linux", "windows", "процесс", "память", "файлов", "командн"):
            return "os"
        if has("документ", "инструкц", "отчёт", "регламент", "руководств"):
            return "docs"
        if has("алгоритм", "цикл", "массив", "строк", "функц", "рекурс", "сортиров"):
            return "code"
        if has("процессор", "плата", "шина", "накопител", "чипсет", "bios", "uefi"):
            return "hardware"
        if has("матем", "модель", "график", "вероятн", "регресс", "статистик"):
            return "math"
        if has("сертификац", "стандарт"):
            return "cert"
        if has("поддержк", "сопровожд", "инцидент", "sla", "мониторинг", "диагност",
               "непрерывн", "сбой", "обращен"):
            return "support"
        if has("обучен", "занятие", "урок"):
            return "learn"
        if has("экзамен", "демо", "задание", "защита"):
            return "exam"
        return None

    motif = choose(title) or choose(text) or "default"
    inner = CARD_ART[motif].replace("var(--accent)", "var(--course-accent, var(--accent))")
    return (f'<div class="card-art" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none" '
            f'stroke="var(--course-accent, var(--accent))" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
            f'{inner}</svg></div>')


CARD_ART = {
    "db": '<ellipse cx="60" cy="34" rx="28" ry="10"/><path d="M32 34v22c0 5.5 12.5 10 28 10s28-4.5 28-10V34"/><path d="M32 56v22c0 5.5 12.5 10 28 10s28-4.5 28-10V56"/><path d="M32 45c0 5.5 12.5 10 28 10s28-4.5 28-10" opacity=".45"/>',
    "code": '<rect x="22" y="28" width="76" height="64" rx="10"/><path d="M22 44h76"/><path d="M40 64l-8 8 8 8"/><path d="M80 64l8 8-8 8"/><path d="M66 60l-12 24"/>',
    "network": '<circle cx="60" cy="30" r="10"/><circle cx="30" cy="84" r="10"/><circle cx="90" cy="84" r="10"/><path d="M60 40v14M52 52l-14 22M68 52l14 22"/><circle cx="60" cy="56" r="4" fill="var(--accent)" stroke="none"/>',
    "shield": '<path d="M60 20l30 12v22c0 20-13 34-30 42-17-8-30-22-30-42V32z"/><path d="M46 60l10 10 20-22"/>',
    "project": '<rect x="20" y="24" width="24" height="72" rx="5"/><rect x="48" y="24" width="24" height="48" rx="5"/><rect x="76" y="24" width="24" height="60" rx="5"/><path d="M28 40h8M28 52h8M56 40h8M84 40h8M84 52h8"/>',
    "test": '<circle cx="54" cy="52" r="24"/><path d="M72 70l18 18"/><path d="M44 52l7 7 13-15"/>',
    "design": '<rect x="20" y="24" width="80" height="72" rx="10"/><path d="M20 42h80"/><rect x="32" y="54" width="26" height="30" rx="4"/><path d="M68 58h20M68 68h20M68 78h14"/>',
    "api": '<circle cx="30" cy="60" r="10"/><circle cx="90" cy="60" r="10"/><path d="M40 60h14M66 60h14"/><path d="M54 48v24M66 48v24"/><path d="M54 60h12"/>',
    "os": '<rect x="18" y="26" width="84" height="68" rx="10"/><path d="M18 42h84"/><path d="M32 58l10 10-10 10M50 78h20"/><circle cx="30" cy="34" r="2" fill="var(--accent)" stroke="none"/><circle cx="38" cy="34" r="2" fill="var(--accent)" stroke="none"/>',
    "docs": '<path d="M34 20h40l16 16v64H34z"/><path d="M74 20v16h16"/><path d="M46 52h32M46 64h32M46 76h20"/>',
    "algorithm": '<rect x="20" y="22" width="36" height="24" rx="6"/><path d="M56 34h16v22H56"/><rect x="44" y="74" width="36" height="24" rx="6"/><path d="M62 56v18"/><path d="M78 34h16v40H78"/>',
    "hardware": '<rect x="30" y="30" width="60" height="60" rx="10"/><rect x="46" y="46" width="28" height="28" rx="5"/><path d="M40 18v12M60 18v12M80 18v12M40 90v12M60 90v12M80 90v12M18 40h12M18 60h12M18 80h12M90 40h12M90 60h12M90 80h12"/>',
    "math": '<path d="M24 90V30M24 90h72"/><path d="M34 78c12-4 18-28 30-28s18 16 30 8"/><path d="M34 70h8M34 50h8M34 30h8M44 82v8M64 82v8M84 82v8"/>',
    "cert": '<rect x="24" y="20" width="72" height="56" rx="8"/><path d="M40 40h40M40 52h28"/><circle cx="60" cy="76" r="12"/><path d="M54 86l-4 14 10-6 10 6-4-14"/>',
    "support": '<path d="M34 64v-8a26 26 0 0152 0v8"/><rect x="26" y="60" width="14" height="22" rx="7"/><rect x="80" y="60" width="14" height="22" rx="7"/><path d="M86 82c0 8-8 14-18 14h-8"/><circle cx="56" cy="96" r="4" fill="var(--accent)" stroke="none"/>',
    "learn": '<rect x="20" y="26" width="80" height="54" rx="8"/><path d="M32 42h36M32 54h28M32 66h20"/><circle cx="88" cy="74" r="12"/><path d="M82 74l4 4 8-9"/>',
    "exam": '<rect x="28" y="20" width="64" height="80" rx="8"/><path d="M44 42l6 6 12-12M44 64l6 6 12-12M44 86l6 6 12-12"/><path d="M70 48h10M70 70h10M70 92h10" opacity=".45"/>',
    "default": '<circle cx="42" cy="48" r="18"/><circle cx="78" cy="72" r="22" opacity=".45"/><path d="M24 96h72" opacity=".4"/>',
}


def build_course(root: Path) -> Path:
    c = load_course(root / "course.json")
    dist = root / "dist"
    dist.mkdir(exist_ok=True)
    availability = load_availability(root)
    cards = is_cards(c)
    items, written = [], 0
    slot = 1
    for ch in c.get("chapters", []):
        dirname = chapter_dir(ch)
        if cards:
            lesson = f'{int(ch.get("n") or len(items) + 1):02d}'
        else:
            pairs = max(1, round(int(ch.get("minutes") or 90) / 90))
            lesson = f"{slot}" if pairs == 1 else f"{slot}<br>-<br>{slot + pairs - 1}"
            slot += pairs
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
        ST = {"planned": "план", "drafted": "черновик", "figures-pending": "фигуры готовятся", "published": "готово"}
        if locked:
            status = " · закрыто"
        else:
            status = "" if link else f' · {esc(ST.get(ch.get("status", "planned"), ch.get("status", "план")))}'
        title = esc(ch["title"])
        cls = ' class="locked"' if locked else ""
        if cards:
            label = ch.get("label") or (
                "Справочник" if ch.get("role") == "info"
                else "Варианты" if ch.get("role") == "variants"
                else "Методичка")
            mins = esc(label) + status
        else:
            mins = status.strip(" · ")
        mins_html = f'<div class="mins">{mins}</div>' if mins else ""
        inner = (f'<div class="n">{lesson}</div><h3>{title}</h3>'
                 f'{mins_html}'
                 f'<p>{esc(ch.get("summary", ""))}</p>{card_art(ch)}')
        card = (f'<a class="lesson-card" href="{link}">{inner}</a>' if link
                else f'<div class="lesson-card lesson-card-static">{inner}</div>')
        items.append(f'<li{cls}>{card}</li>')

    n_ch = len(c.get("chapters", []))
    slots = lesson_slots(c.get("chapters", []))
    if cards:
        meta = " · ".join(x for x in [
            f"{n_ch} {plural_sections(n_ch)}" if n_ch else None,
            esc(c.get("assessment", "")),
            summary(c, availability),
        ] if x)
    else:
        meta = " · ".join(x for x in [
            f"{slots} {plural_lessons(slots)}" if slots else None,
            esc(c.get("assessment", "")),
            summary(c, availability),
        ] if x)
    outcomes = ""
    if c.get("outcomes"):
        outcomes_title = "Что вы освоите" if cards else "В результате обучения вы сможете"
        outcomes = f'<section class="outcomes"><b>{outcomes_title}</b><ul>' + "".join(
            f"<li>{esc(o)}</li>" for o in c["outcomes"]) + "</ul></section>"
    prereq = ""
    if c.get("prerequisites"):
        prereq_title = "Что нужно знать заранее" if cards else "Требуется предварительно"
        prereq = f'<section class="outcomes"><b>{prereq_title}</b><ul>' + "".join(
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
    if cards:
        plan_heading = "Разделы подготовки"
        plan_intro = ('<article class="prose"><p>Материалы собраны в разделы: общая информация '
                      'об экзамене, методички по шести заданиям и варианты для практики. '
                      'В каждой методичке указано, что открыть, какие файлы создать и какие '
                      'команды выполнить.</p></article>')
    else:
        plan_heading = "Учебный план"
        plan_intro = ""
    body = f"""<main class="page">{rail(back="#year", excel=plan_name)}
<header class="hero hero-course" data-shader data-accent="{esc(accent)}" data-seed="{seed:.3f}">
<canvas class="shader-bg" width="820" height="300" aria-hidden="true" style="background:linear-gradient(135deg,#08090D,{esc(accent)} 58%,#08090D)"></canvas>
<div class="badges">{price_pill}</div><div class="meta">{esc(meta)}</div>
<h1>{esc(c['title'])}</h1><p class="dek">{esc(c.get('tagline', ''))}</p>
<div class="{glyph_class}" aria-hidden="true">{esc(code)}</div></header>
    {outcomes}{prereq}
<article class="prose"><h2 class="nonum" style="margin-top:36px">{plan_heading}</h2></article>
{plan_intro}
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
