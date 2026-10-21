#!/usr/bin/env python3
"""Build a chapter (or a notes page) from Markdown into a styled HTML page that
embeds its Anatomy figures.

Usage:
    python3 build_chapter.py <chapter.md> [out.html]

Default output: <chapter dir>/../../dist/<chapter-dir-name>.html when the chapter
lives in courses/<slug>/chapters/<nn-slug>/, else next to the Markdown.

Markdown conventions (see references/writing.md §5):
  front matter   --- yaml ---  (title, dek, chapter, minutes, level, glyph, outcomes, kind)
  ## headings    numbered automatically, listed in the table of contents
  > [!INTUITION] / [!PITFALL] / [!INTERVIEW] / [!KEY] / [!TRADEOFF]   callouts
  > [!CHECK] Question text   (body = answer)   collapsible self-check
  > [!RECAP]                                   dark recap block
  ::figure <fig-id> | caption                  an Anatomy figure from figures/<fig-id>/
"""
import base64
import html
import gzip
import json
import re
import sys
from pathlib import Path

import markdown
import yaml
from pygments.formatters import HtmlFormatter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _pages import accent_vars, esc, find_course_json, load_course, page, FALLBACK, THEME_TOGGLE  # noqa: E402

CALLOUT_LABELS = {
    "INTUITION": "Главная мысль", "PITFALL": "Типичная ошибка", "INTERVIEW": "На практике",
    "KEY": "Ключевая идея", "NOTE": "Примечание", "TRADEOFF": "Компромисс", "RECAP": "Итоги",
}
MD_EXT = ["tables", "fenced_code", "codehilite", "sane_lists", "attr_list", "md_in_html", "smarty"]
MD_CFG = {"codehilite": {"guess_lang": False, "css_class": "codehilite"},
          "smarty": {"smart_dashes": False}}  # never turn -- / --- into en/em dashes


def md(text: str) -> str:
    return markdown.markdown(text, extensions=MD_EXT, extension_configs=MD_CFG)


DASHES = ("\u2014", "\u2015", "&mdash;")  # em dash, horizontal bar, entity


def dash_lines(src: str):
    """Line numbers outside code (fences and `inline`) that contain an em dash or a ' -- ' stand-in."""
    out, fence = [], False
    for n, line in enumerate(src.split("\n"), 1):
        if line.lstrip().startswith("```"):
            fence = not fence
            continue
        text = re.sub(r"`[^`]*`", "", line)
        if not fence and (any(d in text for d in DASHES) or " -- " in text):
            out.append(n)
    return out


def split_front(src: str):
    m = re.match(r"\s*---\s*\n(.*?)\n---\s*\n", src, re.S)
    if not m:
        return {}, src
    return yaml.safe_load(m.group(1)) or {}, src[m.end():]


def find_figure(fig_dir: Path):
    """Return (dark_html, light_html) paths for an Anatomy figure folder, or (None, None)."""
    if not fig_dir.is_dir():
        return None, None
    pages = sorted(p for p in fig_dir.glob("*.html") if not p.name.startswith("_"))
    light = next((p for p in pages if p.stem.endswith("-light")), None)
    dark = next((p for p in pages if not p.stem.endswith("-light")), None)
    return dark or light, light or dark


# The frame's color-scheme must match the figure's root, or Chrome paints an opaque canvas behind it.
IFRAME_FIX = ("<style>html{color-scheme:__T__!important}html,body{background:transparent!important;margin:0!important}.iso-page{margin:6px auto 4px!important}</style>"
              "<script>window.__errs=[];addEventListener('error',function(e){__errs.push(String(e.message))});</script>")


def figure_dir(fid: str, base: Path) -> Path:
    """figures/<id>/ next to the chapter, else in any other chapter of the same course (for reuse in notes)."""
    local = base / "figures" / fid
    if local.is_dir():
        return local
    for root in [base.parent, base.parent.parent]:
        for d in sorted(root.glob(f"*/figures/{fid}")) + sorted(root.glob(f"chapters/*/figures/{fid}")):
            if d.is_dir():
                return d
    return local


def figure_html(fid: str, caption: str, n: int, base: Path, figures: list) -> str:
    fdir = figure_dir(fid, base)
    dark, light = find_figure(fdir)
    # the Anatomy card already carries "Fig n", a title and its own caption; ours is an optional lead-in
    cap = f'<figcaption>{md(caption)[3:-4]}</figcaption>' if caption else ""
    if not dark:
        brief = fdir / "brief.md"
        what = ""
        if brief.exists():
            first = [l for l in brief.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
            what = esc(first[0][:220]) if first else ""
        figures.append({"id": fid, "status": "pending"})
        return (f'<div class="figure pending" data-fig="{esc(fid)}"><span class="fig-no">Рис. {n} · готовится</span>'
                f'<p><b>{esc(fid)}</b>{": " + what if what else ""}</p>'
                f'{"<p>" + esc(caption) + "</p>" if caption else ""}</div>')
    figures.append({"id": fid, "status": "built", "dark": dark.name, "light": light.name})
    # both themes are embedded; the page script picks one and sizes the frame to its content
    # gzip+base64: small, and keeps the figure's markup and scripts away from the chapter's parser.
    # Anatomy's two theme pages usually differ only in data-theme, so one copy serves both.
    d_txt, l_txt = dark.read_text(encoding="utf-8"), light.read_text(encoding="utf-8")
    pack = lambda t: base64.b64encode(gzip.compress(t.encode(), 9, mtime=0)).decode()
    if l_txt.replace('data-theme="light"', 'data-theme="dark"') == d_txt:
        attrs = f'data-one="{pack(d_txt)}"'
    else:
        attrs = f'data-dark="{pack(d_txt)}" data-light="{pack(l_txt)}"'
    return (f'<figure class="figure" data-fig="{esc(fid)}" {attrs}>'
            f'<iframe title="Figure {n}: {esc(fid)}" scrolling="no"></iframe>'
            f"{cap}</figure>")


FIG_SCRIPT = r"""
(function(){
  var FIX = __FIX__;
  function size(f){ try{ var d=f.contentDocument; if(!d||!d.body) return;
    f.style.height = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight) + 'px'; }catch(e){} }
  function load(fig){
    var t='light'; if(fig.dataset.loaded===t) return; fig.dataset.loaded=t;
    var f=fig.querySelector('iframe'), one=fig.getAttribute('data-one');
    var b=atob(one || fig.getAttribute('data-light')), bytes=Uint8Array.from(b, function(c){return c.charCodeAt(0)});
    f.style.colorScheme = 'light';
    new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(function(html){
      if (one) html = html.split('data-theme="dark"').join('data-theme="light"');
      html = html.replace('</head>', FIX.split('__T__').join('light') + '</head>');
      f.srcdoc = html;
    });
    f.onload=function(){ size(f); setTimeout(function(){size(f)},300); setTimeout(function(){size(f)},1200);
      try{ new ResizeObserver(function(){size(f)}).observe(f.contentDocument.body); }catch(e){} };
  }
  var figs=[].slice.call(document.querySelectorAll('figure.figure'));
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ load(e.target); io.unobserve(e.target);} }); }, {rootMargin:'600px'}) : null;
  figs.forEach(function(f){ io ? io.observe(f) : load(f); });
  addEventListener('resize', function(){ figs.forEach(function(f){ var i=f.querySelector('iframe'); if(f.dataset.loaded) size(i); }); });
})();
"""


READ_PROGRESS_HTML = ('<div class="read-progress" role="progressbar" aria-label="Прогресс чтения" '
                      'aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>')
NAV_BUTTON_HTML = '<a class="nav-btn" href="index.html">К учебному плану</a>'
PDF_BUTTON_HTML = ('<button type="button" class="pdf-btn" data-pdf '
                   'title="Откроется окно печати, выберите «Сохранить как PDF»">Экспорт в PDF</button>')

READ_SCRIPT = r"""
(function(){
  var bar=document.querySelector('.read-progress'); if(!bar) return;
  var fill=bar.querySelector('span'), ticking=false;
  function update(){
    var max=document.documentElement.scrollHeight-window.innerHeight;
    var pct=max>0?Math.min(100,Math.max(0,window.scrollY/max*100)):100;
    fill.style.width=pct.toFixed(2)+'%';
    bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  }
  function onScroll(){ if(ticking) return; ticking=true;
    requestAnimationFrame(function(){update();ticking=false;}); }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll);
  update();
})();
"""

PDF_SCRIPT = r"""
(function(){
  document.querySelectorAll('[data-pdf]').forEach(function(button){
    button.addEventListener('click',function(){ window.print(); });
  });
})();
"""

WARN_BUTTON_HTML = ('<button type="button" class="warn-btn" data-warn '
                    'aria-label="Предупреждение о прогрессе"><span aria-hidden="true">!</span></button>')


def lesson_tools(warn: bool) -> str:
    warn_html = WARN_BUTTON_HTML if warn else ""
    return (f'<div class="lesson-tools">{NAV_BUTTON_HTML}'
            f'<div class="lesson-tools-right">{warn_html}{THEME_TOGGLE}{PDF_BUTTON_HTML}</div></div>')

QUIZ_MODALS_HTML = r"""
<div class="modal" data-modal="submit" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="submit-title">
    <button type="button" class="modal-close" data-modal-close aria-label="Закрыть">×</button>
    <h2 id="submit-title">Результат теста</h2>
    <label class="modal-name" data-student-label><span>ФИО студента</span>
      <input type="text" data-student-name maxlength="80" autocomplete="name" placeholder="Иванов Иван Иванович">
    </label>
    <p class="modal-student" data-student-view hidden></p>
    <p class="modal-result" data-modal-result></p>
    <dl class="modal-times">
      <div><dt>Время выполнения теста</dt><dd data-test-time>00:00</dd></div>
      <div><dt>Время просмотра лекции</dt><dd data-view-time>00:00</dd></div>
    </dl>
    <button type="button" class="modal-ok" data-modal-close>Готово</button>
  </div>
</div>
<div class="modal" data-modal="warn" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="warn-title">
    <button type="button" class="modal-close" data-modal-close aria-label="Закрыть">×</button>
    <h2 id="warn-title">Внимание</h2>
    <p>Если обновить страницу, прогресс прохождения обнулится: отвеченные вопросы сбросятся, таймеры начнутся заново.</p>
    <button type="button" class="modal-ok" data-modal-close>Понятно</button>
  </div>
</div>
"""

QUIZ_SCRIPT = r"""
(function(){
  var activeMs = 0, lastTick = performance.now(), visible = !document.hidden;
  function tick(){ var now = performance.now(); if(visible) activeMs += now - lastTick; lastTick = now; }
  document.addEventListener('visibilitychange', function(){ tick(); visible = !document.hidden; lastTick = performance.now(); });
  function viewingMs(){ tick(); return activeMs; }
  function fmt(ms){ var s = Math.max(0, Math.round(ms/1000)); var h = Math.floor(s/3600), m = Math.floor(s%3600/60), r = s%60;
    return (h ? h + ':' : '') + String(m).padStart(2,'0') + ':' + String(r).padStart(2,'0'); }
  function norm(s){ return String(s||'').trim().toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' '); }
  var studentName = '';
  var submitModal = document.querySelector('[data-modal="submit"]');
  var warnModal = document.querySelector('[data-modal="warn"]');

  function openModal(modal){ if(!modal) return; modal.hidden = false; document.documentElement.classList.add('modal-open');
    var field = modal.querySelector('input'); if(field) setTimeout(function(){ field.focus(); }, 30); }
  function closeModal(modal){ if(!modal) return; modal.hidden = true;
    if(!document.querySelector('.modal:not([hidden])')) document.documentElement.classList.remove('modal-open'); }
  document.querySelectorAll('[data-modal-close]').forEach(function(b){ b.addEventListener('click', function(){ closeModal(b.closest('.modal')); }); });
  document.querySelectorAll('.modal').forEach(function(m){ m.addEventListener('mousedown', function(e){ if(e.target === m) closeModal(m); }); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ document.querySelectorAll('.modal:not([hidden])').forEach(closeModal); } });
  document.querySelectorAll('[data-warn]').forEach(function(b){ b.addEventListener('click', function(){ openModal(warnModal); }); });

  function questionCorrect(q){
    if(q.dataset.type === 'short'){
      var input = q.querySelector('.short-answer'); if(!input) return false;
      var answers = []; try { answers = JSON.parse(input.getAttribute('data-answers') || '[]'); } catch(e) {}
      var value = norm(input.value); if(!value) return false;
      return answers.some(function(a){ return norm(a) === value; });
    }
    if(q.dataset.type === 'multi'){
      var chosen = q.querySelectorAll('input[type=checkbox]:checked');
      var need = Number(q.dataset.correct || 0);
      if(!need || chosen.length !== need) return false;
      return Array.prototype.every.call(chosen, function(i){ return i.hasAttribute('data-ok'); });
    }
    var chosen = q.querySelector('input[type=radio]:checked');
    return !!(chosen && chosen.hasAttribute('data-ok'));
  }

  function evaluate(quiz){
    var qs = [].slice.call(quiz.querySelectorAll('.quiz-q')), right = 0;
    qs.forEach(function(q){
      var ok = questionCorrect(q); q.classList.remove('ok','bad'); q.classList.add(ok ? 'ok' : 'bad');
      if(ok) right++;
      q.querySelectorAll('.opt').forEach(function(o){ var i = o.querySelector('input'); o.classList.toggle('correct', !!(i && i.hasAttribute('data-ok'))); });
      var why = q.querySelector('.quiz-why'); if(why) why.hidden = ok;
    });
    return {right: right, total: qs.length};
  }

  document.querySelectorAll('[data-quiz]').forEach(function(quiz){
    quiz._firstAt = null; quiz._lastAt = null;
    function mark(){ var now = performance.now(); if(quiz._firstAt === null) quiz._firstAt = now; quiz._lastAt = now; }
    quiz.addEventListener('input', function(e){ if(e.target.matches('input')) mark(); });
    quiz.addEventListener('change', function(e){ if(e.target.matches('input')) mark(); });
    quiz.querySelector('[data-check]').addEventListener('click', function(){
      var r = evaluate(quiz); var s = quiz.querySelector('[data-score]'); if(s) s.textContent = 'Верно ' + r.right + ' из ' + r.total;
    });
    quiz.querySelector('[data-reset]').addEventListener('click', function(){
      quiz.querySelectorAll('.quiz-q').forEach(function(q){ q.classList.remove('ok','bad');
        q.querySelectorAll('input').forEach(function(i){ if(i.type === 'radio' || i.type === 'checkbox') i.checked = false; else i.value = ''; });
        q.querySelectorAll('.opt').forEach(function(o){ o.classList.remove('correct'); });
        var w = q.querySelector('.quiz-why'); if(w) w.hidden = true; });
      var s = quiz.querySelector('[data-score]'); if(s) s.textContent = '';
      quiz._firstAt = null; quiz._lastAt = null;
    });
    quiz.querySelector('[data-submit]').addEventListener('click', function(){
      var r = evaluate(quiz);
      var testMs = (quiz._firstAt !== null && quiz._lastAt !== null) ? Math.max(0, quiz._lastAt - quiz._firstAt) : 0;
      var pct = r.total ? Math.round(r.right / r.total * 100) : 0;
      submitModal.querySelector('[data-modal-result]').textContent = 'Правильных ответов: ' + r.right + ' из ' + r.total + ' (' + pct + '%)';
      submitModal.querySelector('[data-test-time]').textContent = fmt(testMs);
      submitModal.querySelector('[data-view-time]').textContent = fmt(viewingMs());
      var nameInput = submitModal.querySelector('[data-student-name]');
      var nameLabel = submitModal.querySelector('[data-student-label]');
      var nameView = submitModal.querySelector('[data-student-view]');
      if(studentName){ nameLabel.hidden = true; nameView.hidden = false; nameView.textContent = 'Студент: ' + studentName; }
      else { nameLabel.hidden = false; nameView.hidden = true; nameInput.value = ''; }
      openModal(submitModal);
    });
  });

  var nameInput = submitModal ? submitModal.querySelector('[data-student-name]') : null;
  if(nameInput){ nameInput.addEventListener('input', function(){ studentName = nameInput.value.trim(); }); }
})();
"""


def render_quiz(block: list, n: int, kind: str = "chapter") -> tuple:
    """Parse Q: / + / - / = lines into an interactive, self-scoring test.

    A question with one `+` is single-choice, several `+` lines make it
    multiple-choice, and `=` lines make a short answer. Every lecture should
    have 15 questions covering all three types.
    """
    questions, cur = [], None
    for raw in block:
        t = raw.strip()
        if not t:
            continue
        if t.startswith("Q:"):
            cur = {"q": t[2:].strip(), "opts": [], "correct": [], "why": "", "short": []}
            questions.append(cur)
        elif t.startswith("!") and cur is not None:
            cur["why"] = t[1:].strip()
        elif t.startswith("=") and cur is not None:
            cur["short"].append(t[1:].strip())
        elif t.startswith("+") and cur is not None:
            cur["correct"].append(len(cur["opts"]))
            cur["opts"].append(t[1:].strip())
        elif t.startswith("-") and cur is not None:
            cur["opts"].append(t[1:].strip())
    if not questions:
        return "", False
    items = []
    for qi, q in enumerate(questions):
        is_short = bool(q["short"])
        is_multi = not is_short and len(q["correct"]) > 1
        if is_short and q["opts"]:
            print(f"WARNING: quiz question {qi + 1} mixes options and short answers; using short answer")
        if not is_short and not q["correct"]:
            print(f"WARNING: quiz question {qi + 1} has no correct option")
        why = (f'<p class="quiz-why" hidden>{md(q["why"])[3:-4]}</p>' if q.get("why") else "")
        if is_short:
            answers = esc(json.dumps(q["short"], ensure_ascii=False))
            body = (f'<input type="text" class="short-answer" data-answers="{answers}" '
                    f'placeholder="Введите ответ" autocomplete="off" spellcheck="false" '
                    f'aria-label="{esc(q["q"])}">')
            items.append(f'<div class="quiz-q" data-type="short"><p class="quiz-p">{md(q["q"])[3:-4]}</p>'
                         f'{body}{why}</div>')
        else:
            input_type = "checkbox" if is_multi else "radio"
            opts = "".join(
                f'<label class="opt"><input type="{input_type}" name="q{n}_{qi}" value="{oi}"'
                f'{" data-ok" if oi in q["correct"] else ""}><span>{md(opt)[3:-4]}</span></label>'
                for oi, opt in enumerate(q["opts"]))
            qtype = "multi" if is_multi else "single"
            items.append(f'<div class="quiz-q" data-type="{qtype}" data-correct="{len(q["correct"])}">'
                         f'<p class="quiz-p">{md(q["q"])[3:-4]}</p><div class="opts">{opts}</div>{why}</div>')
    if kind == "chapter":
        counts = {"single": 0, "multi": 0, "short": 0}
        for q in questions:
            if q["short"]:
                counts["short"] += 1
            elif len(q["correct"]) > 1:
                counts["multi"] += 1
            else:
                counts["single"] += 1
        if len(questions) != 15:
            print(f"WARNING: lecture quiz has {len(questions)} questions, expected 15")
        if not all(counts.values()):
            print("WARNING: lecture quiz must contain single-choice, multiple-choice and short-answer questions")
    html_block = (f'\n<div class="quiz" data-quiz><span class="label">Тест по лекции</span>'
                  f'{"".join(items)}<div class="quiz-foot"><button type="button" data-check>Проверить ответы</button>'
                  f'<button type="button" data-reset>Сбросить</button>'
                  f'<span class="quiz-score" data-score></span>'
                  f'<button type="button" class="submit" data-submit>Сдать работу</button></div></div>\n')
    return html_block, True


def preprocess(body: str, base: Path, figures: list, page_kind: str = "chapter"):
    """Turn callouts and ::figure lines into HTML blocks before Markdown runs."""
    out, lines, i, n_fig = [], body.split("\n"), 0, 0
    has_quiz = False
    in_fence = False
    while i < len(lines):
        line = lines[i]
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        if in_fence:
            out.append(line); i += 1; continue
        if line.strip() == "::quiz":
            block = []
            i += 1
            while i < len(lines):
                t = lines[i].strip()
                if t.startswith("::"):
                    break
                if not t:
                    # a blank line belongs to the block only if a quiz line follows it
                    j = i + 1
                    while j < len(lines) and not lines[j].strip():
                        j += 1
                    nxt = lines[j].strip() if j < len(lines) else ""
                    if nxt.startswith(("Q:", "+", "-", "!", "=")):
                        block.append(""); i += 1; continue
                    break
                block.append(lines[i]); i += 1
            qhtml, found = render_quiz(block, i, page_kind)
            has_quiz = has_quiz or found
            out.append("")
            out.append(qhtml)
            out.append("")
            continue
        fm = re.match(r"^::figure\s+([\w\-]+)\s*(?:\|\s*(.*))?$", line.strip())
        if fm:
            n_fig += 1
            out.append("")
            out.append(figure_html(fm.group(1), (fm.group(2) or "").strip(), n_fig, base, figures))
            out.append("")
            i += 1
            continue
        cm = re.match(r"^>\s*\[!(\w+)\]\s*(.*)$", line)
        if cm:
            callout_kind, title = cm.group(1).upper(), cm.group(2).strip()
            block = []
            i += 1
            while i < len(lines) and lines[i].startswith(">"):
                block.append(re.sub(r"^>\s?", "", lines[i]))
                i += 1
            inner = md("\n".join(block))
            if callout_kind == "CHECK":
                q = md(title)[3:-4] if title else "Проверьте себя"
                out.append(f'\n<details class="check"><summary><span>{q}</span></summary><div>{inner}</div></details>\n')
            elif callout_kind == "RECAP":
                out.append(f'\n<div class="recap"><span class="label">{esc(title or "Итоги занятия")}</span>{inner}</div>\n')
            else:
                label = title or CALLOUT_LABELS.get(callout_kind, callout_kind.title())
                out.append(f'\n<div class="callout {callout_kind.lower()}"><span class="label">{esc(label)}</span>{inner}</div>\n')
            continue
        out.append(line)
        i += 1
    return "\n".join(out), has_quiz


def number_headings(html_body: str):
    toc, n = [], 0
    seen = set()

    def rep(m):
        nonlocal n
        attrs, text = m.group(1) or "", m.group(2)
        if 'class="nonum"' in attrs:
            return m.group(0)
        n += 1
        without_num = re.sub(r'<span class="num">.*?</span>', "", text)
        plain = html.unescape(re.sub(r"<[^>]+>", "", without_num))
        idm = re.search(r'id="([^"]+)"', attrs)
        if idm:
            hid = idm.group(1)
        else:
            hid = re.sub(r"[^\w]+", "-", plain.lower(), flags=re.UNICODE).strip("-") or "section"
            base, k = hid, 2
            while hid in seen:
                hid, k = f"{base}-{k}", k + 1
        seen.add(hid)
        toc.append((hid, plain))
        return f'<h2 id="{hid}"><span class="num">{n:02d}</span>{text}</h2>'

    return re.sub(r"<h2([^>]*)>(.*?)</h2>", rep, html_body), toc


def lesson_label(cj, dirname: str):
    """Number(s) of the занятие this chapter occupies, e.g. "1" or "11-12".

    A lesson of 180 minutes takes two pair-slots, so it spans two consecutive numbers.
    """
    if not cj:
        return None
    try:
        chapters = json.loads(cj.read_text(encoding="utf-8")).get("chapters", [])
    except Exception:
        return None
    start = 1
    for ch in chapters:
        d = ch.get("dir") or f'{int(ch["n"]):02d}-{ch.get("slug", "")}'
        pairs = max(1, round(int(ch.get("minutes") or 90) / 90))
        lo, hi = start, start + pairs - 1
        if d == dirname:
            return f"{lo}" if lo == hi else f"{lo}-{hi}"
        start += pairs
    return None


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src_path = Path(sys.argv[1]).resolve()
    base = src_path.parent
    src = src_path.read_text(encoding="utf-8")
    fm, body = split_front(src)
    bad = dash_lines(src)
    for fdir in sorted((base / "figures").glob("*/")):
        b = fdir / "brief.md"
        if b.exists() and dash_lines(b.read_text(encoding="utf-8")):
            print(f"WARNING: em dash in {b.relative_to(base)} (card text must not have any)")

    cj = find_course_json(base)
    course = load_course(cj) if cj else dict(FALLBACK, title=fm.get("course", ""), code=fm.get("glyph", ""))
    if cj and len(sys.argv) < 3:
        out = cj.parent / "dist" / f"{base.name}.html"
    else:
        out = Path(sys.argv[2]) if len(sys.argv) > 2 else base / f"{src_path.stem}.html"
    out.parent.mkdir(parents=True, exist_ok=True)

    figures = []
    kind = fm.get("kind", "chapter")  # chapter | notes | cheatsheet
    pre, has_quiz = preprocess(body, base, figures, kind)
    html_body, toc = number_headings(md(pre))

    ch = fm.get("chapter")
    label = lesson_label(cj, base.name)
    pills = []
    if label:
        word = "Занятие" if "-" not in label else "Занятия"
        pills.append(f'<span class="pill dark">{word} {label}</span>')
    elif ch is not None:
        pills.append(f'<span class="pill dark">{esc(ch)}</span>')
    elif kind != "chapter":
        pills.append(f'<span class="pill dark">{esc(kind)}</span>')
    if course.get("title"):
        pills.append(f'<span class="pill">{esc(course["title"])}</span>')
    meta = fm.get("level") or course.get("level") or ""
    glyph = fm.get("glyph") or course.get("code", "")
    hero = f"""<header class="hero"><div class="badges">{''.join(pills)}</div><div class="meta">{esc(meta)}</div>
<h1>{esc(fm.get('title', src_path.stem))}</h1><p class="dek">{esc(fm.get('dek', ''))}</p>
<div class="glyph" aria-hidden="true">{esc(glyph)}</div></header>"""

    crumbs = ""
    if cj:
        crumbs = (f'<nav class="crumbs"><a href="index.html">{esc(course.get("title", "Course"))}</a>'
                  f'<span>/</span><span>{esc(fm.get("title", ""))}</span></nav>')

    outcomes = ""
    if fm.get("outcomes"):
        outcomes = '<section class="outcomes"><b>После этого занятия вы сможете</b><ul>' + "".join(
            f"<li>{md(str(o))[3:-4]}</li>" for o in fm["outcomes"]) + "</ul></section>"
    toc_html = ""
    if len(toc) >= 4:
        toc_html = '<nav class="toc"><b>Содержание занятия</b><ol>' + "".join(
            f'<li><a href="#{h}">{esc(t)}</a></li>' for h, t in toc) + "</ol></nav>"

    pager = ""
    if cj:
        chapters = json.loads(cj.read_text(encoding="utf-8")).get("chapters", [])
        # only chapters that exist on disk get links, so planned chapters never produce dead links
        chapters = [c for c in chapters if (cj.parent / "chapters" / (c.get("dir") or f'{int(c["n"]):02d}-{c["slug"]}')).joinpath("chapter.md").exists()]
        slugs = [c.get("dir") or f'{int(c["n"]):02d}-{c["slug"]}' for c in chapters]
        if base.name in slugs:
            k = slugs.index(base.name)
            prev_ = chapters[k - 1] if k > 0 else None
            next_ = chapters[k + 1] if k + 1 < len(chapters) else None
            a = lambda c, s, lab, cls="": (f'<a class="{cls}" href="{s}.html"><span>{lab}</span>{esc(c["title"])}</a>' if c else "<span></span>")
            pager = f'<nav class="pager">{a(prev_, slugs[k-1] if prev_ else "", "← Предыдущее занятие")}{a(next_, slugs[k+1] if next_ else "", "Следующее занятие →", "next")}</nav>'
            pager = pager.replace('class="next"', 'class="next" style="text-align:right;margin-left:auto"')

    dark_fmt = HtmlFormatter(style="github-dark")
    code_css = (HtmlFormatter(style="default").get_style_defs(".codehilite")
                + "\n" + dark_fmt.get_style_defs(":root[data-theme=dark] .codehilite")
                + "\n@media (prefers-color-scheme: dark){\n"
                + dark_fmt.get_style_defs(":root:not([data-theme=light]) .codehilite") + "\n}"
                + "\n.codehilite,.codehilite pre{background:var(--code-bg)!important}")

    fig_script = FIG_SCRIPT.replace("__FIX__", json.dumps(IFRAME_FIX).replace("</", "<\\/"))
    script = (READ_SCRIPT + PDF_SCRIPT
              + (fig_script if any(f["status"] == "built" for f in figures) else "")
              + (QUIZ_SCRIPT if has_quiz else ""))
    modals = QUIZ_MODALS_HTML if has_quiz else ""
    body_html = (f'{READ_PROGRESS_HTML}<main class="page">{crumbs}{lesson_tools(has_quiz)}{hero}{outcomes}{toc_html}'
                 f'<article class="prose">{html_body}</article>{pager}</main>{modals}')
    out.write_text(page(fm.get("title", "Занятие"), body_html, accent_vars(course), code_css,
                        script), encoding="utf-8")
    if bad:
        print(f"WARNING: em dash in {src_path.name} on line(s) {', '.join(map(str, bad))}: rewrite with a comma, colon, parentheses or a new sentence")
    built = sum(f["status"] == "built" for f in figures)
    pending = [f["id"] for f in figures if f["status"] == "pending"]
    print(f"wrote {out}: {len(toc)} sections, {built} figures embedded"
          + (f", pending: {', '.join(pending)}" if pending else ""))


if __name__ == "__main__":
    main()
