"""Shared helpers for course-studio page builders."""
import html
import json
import sys
from pathlib import Path

try:
    import yaml  # noqa: F401
    import markdown  # noqa: F401
except ImportError:  # pragma: no cover
    sys.exit("course-studio needs: pip install markdown pyyaml pygments  (or: pip install -r requirements.txt in the skill folder)")

ASSETS = Path(__file__).resolve().parent.parent / "assets"
FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700'
    '&family=Inter+Tight:wght@700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">'
)

THEME_TOGGLE = ('<button type="button" class="theme-btn" data-theme-toggle aria-pressed="false">'
                'Тёмная тема</button>')

RAIL_BACK_SVG = ('<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" '
                 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                 '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>')
RAIL_PDF_SVG = ('<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" '
                'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>')
RAIL_EXCEL_SVG = ('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" '
                  'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                  '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/>'
                  '<path d="M3.5 9.5h17"/><path d="M9.5 9.5V20"/><path d="M15 9.5V20"/></svg>')
RAIL_WARN_SVG = ('<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" '
                 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                 '<path d="M12 5.5v9"/><path d="M12 18.5h.01"/></svg>')
RAIL_THEME_SVG = ('<span class="theme-ico" aria-hidden="true">'
                  '<svg class="ico-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" '
                  'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
                  '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
                  '<svg class="ico-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" '
                  'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
                  '<circle cx="12" cy="12" r="4.5"/>'
                  '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2'
                  'M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></span>')

THEME_BOOT = (
    '<script>(function(){try{var t=localStorage.getItem("mdk-theme");'
    'if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}})();</script>'
)

THEME_SCRIPT = r"""
(function(){
  var root = document.documentElement;
  var media = matchMedia('(prefers-color-scheme: dark)');
  function current(){
    var t = root.dataset.theme;
    if(t === 'dark' || t === 'light') return t;
    return media.matches ? 'dark' : 'light';
  }
  function label(btn){
    var t = current();
    var ico = btn.querySelector('.theme-ico');
    if(ico){
      btn.setAttribute('aria-label', t === 'dark' ? 'Светлая тема' : 'Тёмная тема');
    } else {
      btn.textContent = t === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    }
    btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
  }
  function refresh(){
    document.querySelectorAll('[data-theme-toggle]').forEach(label);
    window.dispatchEvent(new Event('themechange'));
  }
  function apply(t){
    if(t === 'dark' || t === 'light'){
      root.dataset.theme = t;
      try{ localStorage.setItem('mdk-theme', t); }catch(e){}
    } else {
      delete root.dataset.theme;
      try{ localStorage.removeItem('mdk-theme'); }catch(e){}
    }
    refresh();
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function(btn){
    label(btn);
    btn.addEventListener('click', function(){ apply(current() === 'dark' ? 'light' : 'dark'); });
  });
  media.addEventListener('change', function(){ if(!root.dataset.theme) refresh(); });
})();
"""

# Preset identities for the four built-in courses (matched by slug). course.json can override any of these.
KNOWN = {
    "dsa": {"code": "DSA", "accent": "#D04A28", "tint": "#F4E1D8", "accentDark": "#F06A45", "tintDark": "#3A2219"},
    "system-design": {"code": "SD", "accent": "#0077D6", "tint": "#D9E7EE", "accentDark": "#3B9BFF", "tintDark": "#15293A"},
    "javascript-deeply": {"code": "JS", "accent": "#9A7300", "tint": "#EDE5D2", "accentDark": "#D6A520", "tintDark": "#2E2814"},
    "low-level-design": {"code": "LLD", "accent": "#8E5BC8", "tint": "#EBE0EC", "accentDark": "#B184F0", "tintDark": "#2C2236"},
}
FALLBACK = {"accent": "#2F6F5E", "tint": "#DDEBE5", "accentDark": "#5CC4A4", "tintDark": "#18302A"}


def esc(s) -> str:
    return html.escape("" if s is None else str(s))


def rail(back: str = "", pdf: bool = False, excel: str = "", warn: bool = False) -> str:
    """Fixed left-edge control rail shared by plans, year pages and lessons.

    The back arrow is present on every page except the landing, its label is
    «Вернуться обратно». PDF export is a lesson control, Excel export belongs to
    the discipline plan, and the progress warning appears on lectures only.
    """
    top = ""
    if back:
        top = (f'<a class="rail-btn" href="{esc(back)}" data-tip="Вернуться обратно" '
               f'aria-label="Вернуться обратно">{RAIL_BACK_SVG}</a>')
    bottom = ""
    if pdf:
        bottom += ('<button type="button" class="rail-btn" data-pdf data-tip="Экспорт в PDF" '
                   'aria-label="Экспорт в PDF, откроется окно печати">' + RAIL_PDF_SVG + '</button>')
    if excel:
        bottom += (f'<a class="rail-btn" href="{esc(excel)}" download data-tip="Скачать план в Excel" '
                   f'aria-label="Скачать учебный план в Excel">{RAIL_EXCEL_SVG}</a>')
    if warn:
        bottom += ('<button type="button" class="rail-btn rail-warn" data-warn '
                   'data-tip="Предупреждение о прогрессе" aria-label="Предупреждение о прогрессе">'
                   + RAIL_WARN_SVG + '</button>')
    bottom += ('<button type="button" class="rail-btn" data-theme-toggle aria-pressed="false" '
               'data-tip="Смена темы" aria-label="Смена темы">' + RAIL_THEME_SVG + '</button>')
    return (f'<nav class="edge-rail" aria-label="Навигация по странице">{top}'
            f'<span class="rail-grow" aria-hidden="true"></span>{bottom}</nav>')


def code_class(code) -> str:
    n = len(str(code or ""))
    if n <= 2:
        return ""
    if n <= 4:
        return "code-md"
    if n <= 7:
        return "code-lg"
    return "code-xl"


def is_cards(course: dict) -> bool:
    """A course without lectures and practicals: the plan is a set of sections."""
    return str(course.get("format", "")).lower() == "cards"


def lesson_slots(chapters) -> int:
    """Total lesson slots: a 180-minute chapter counts as two slots of 90 minutes each."""
    total = 0
    for ch in chapters or []:
        total += max(1, round(int(ch.get("minutes") or 90) / 90))
    return total


def plural_sections(n: int) -> str:
    """Correct Russian plural form of «раздел» for a count."""
    n = abs(int(n)) % 100
    if 11 <= n <= 14:
        return "разделов"
    n %= 10
    if n == 1:
        return "раздел"
    if n in (2, 3, 4):
        return "раздела"
    return "разделов"


def plural_lessons(n: int) -> str:
    """Correct Russian plural form of «занятие» for a count."""
    n = abs(int(n)) % 100
    if 11 <= n <= 14:
        return "занятий"
    n %= 10
    if n == 1:
        return "занятие"
    if n in (2, 3, 4):
        return "занятия"
    return "занятий"


def load_course(path: Path) -> dict:
    c = json.loads(path.read_text(encoding="utf-8"))
    base = dict(FALLBACK)
    base.update(KNOWN.get(c.get("slug", ""), {}))
    base.update({k: v for k, v in c.items() if v is not None})
    base.setdefault("code", c.get("slug", "")[:3].upper())
    return base


def find_course_json(start: Path):
    for p in [start, *start.parents][:5]:
        f = p / "course.json"
        if f.exists():
            return f
    return None


def accent_vars(c: dict) -> str:
    return (f"--course-accent:{c['accent']};--course-tint:{c['tint']};"
            f"--course-accent-dark:{c.get('accentDark', c['accent'])};--course-tint-dark:{c.get('tintDark', c['tint'])};")


def page(title: str, body: str, style_vars: str = "", extra_css: str = "", script: str = "") -> str:
    css = (ASSETS / "notes.css").read_text(encoding="utf-8")
    return f"""<!doctype html>
<html lang="ru" style="{style_vars}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
{THEME_BOOT}
{FONTS}
<style>
{css}
{extra_css}
</style>
</head>
<body>
{body}
<script>{THEME_SCRIPT}{script}</script>
</body>
</html>
"""
