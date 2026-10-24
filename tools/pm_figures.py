"""Generate the ten standalone figures for the project management lectures.

Run from the repository root:
    python tools/pm_figures.py

Each figure is a light plate with an interactive SVG scene, a readout, a hint
and a legend. Both <id>.html and <id>-light.html are written with light
content, because the repository keeps figures light in either page theme.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "courses" / "3" / "project-management" / "chapters"

CSS = """
:root{--paper:#f7f3e8;--ink:#24303a;--muted:#65717c;--line:#c3bca9;--accent:#9a7300;--card:#fffdf7;--red:#b23a2f;--green:#2f7d54;--blue:#2f5d8a}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.5 "Segoe UI",system-ui,sans-serif}
.wrap{max-width:780px;margin:0 auto;padding:16px}
.plate{position:relative;border:1px solid var(--line);background:linear-gradient(150deg,#fffdf7,#f0ead9);border-radius:10px;padding:30px 14px 54px}
.head{display:flex;justify-content:space-between;gap:12px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.stage{display:block;width:100%;height:auto;touch-action:pan-y;outline:none}
.stage:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
.node{fill:#fffdf7;stroke:#b7ae99;stroke-width:1.3;transition:stroke .2s,fill .2s}
.node.on{stroke:#9a7300;stroke-width:2.4;fill:#fff8e6}
.box{fill:#fffdf7;stroke:#b7ae99;stroke-width:1.3}
.lbl{font-size:12px;fill:#24303a}
svg text{stroke:none;stroke-width:0;paint-order:fill}
.small{font-size:10px;fill:#65717c}
.tiny{font-size:9px;fill:#8a8272}
.mid{font-size:11px;font-weight:600;fill:#24303a}
.big{font-size:13px;font-weight:700;fill:#24303a}
.axis{stroke:#b9c1c6;stroke-width:1}
.grid{stroke:#e3dccb;stroke-width:.8}
.dim{opacity:.22}
.readout{position:absolute;right:14px;bottom:28px;font-size:11px;letter-spacing:.03em;background:var(--paper);border:1px solid #ddd4c2;border-radius:4px;padding:2px 6px;max-width:78%}
.hint{position:absolute;left:14px;bottom:8px;right:150px;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.cap{margin:8px 0 0;font-size:12px;color:var(--muted)}
.keys{display:flex;flex-wrap:wrap;gap:4px 14px;list-style:none;margin:6px 0;padding:0;font-size:12px;color:var(--muted)}
.keys li::before{content:"◇";color:#a8823d;margin-right:5px}
@media (max-width:560px){.wrap{padding:8px}.plate{padding:26px 4px 58px}.readout{right:6px;font-size:10px}.hint{left:6px;right:6px;bottom:8px;font-size:9px}}
@media (prefers-reduced-motion:reduce){.node{transition:none}}
"""

SHARED = """
const STEPS=__STEPS__;
const N=STEPS.length;
let step=0,timer=0;
const stage=document.querySelector('.stage');
const readout=document.querySelector('[data-readout]');
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(n){step=((n%N)+N)%N;readout.textContent=STEPS[step];stage.setAttribute('aria-valuenow',String(step));stage.setAttribute('aria-valuetext',STEPS[step]);apply(step);}
function start(){if(!timer&&!reduce)timer=setInterval(()=>show(step+1),3800);}
function stop(){clearInterval(timer);timer=0;}
stage.addEventListener('keydown',e=>{let n=null;if(e.key==='ArrowRight'||e.key==='ArrowUp')n=step+1;if(e.key==='ArrowLeft'||e.key==='ArrowDown')n=step-1;if(e.key==='Home')n=0;if(e.key==='End')n=N-1;if(n!==null){e.preventDefault();stop();show(n);}});
stage.addEventListener('pointermove',e=>{const b=stage.getBoundingClientRect();const share=Math.max(0,Math.min(1,(e.clientX-b.left)/b.width));stop();show(Math.min(N-1,Math.floor(share*N)));});
stage.addEventListener('pointerleave',start);
stage.addEventListener('focus',stop);
function fitLabels(){
  document.querySelectorAll('svg text').forEach(t=>{
    t.removeAttribute('textLength');
    const g=t.closest('g'); if(!g) return;
    const shape=g.querySelector('rect,circle,ellipse,path,polygon'); if(!shape) return;
    const tag=shape.tagName.toLowerCase();
    const sb=shape.getBBox(), tb=t.getBBox();
    if(!sb.width||!tb.width) return;
    const avail = tag==='circle'? shape.r.baseVal.value*1.4 : (tag==='ellipse'? shape.rx.baseVal.value*1.4 : sb.width-10);
    if(tb.width>avail && avail>14){t.setAttribute('textLength',avail.toFixed(1));t.setAttribute('lengthAdjust','spacingAndGlyphs');}
  });
}
window.addEventListener('resize',fitLabels);
fitLabels();
if(!reduce)start();
show(0);
"""

W, H = 760, 420


def page(fid, title, hint, svg, steps, keys, caption, apply_js):
    keys_html = "".join(f"<li>{k}</li>" for k in keys)
    script = SHARED.replace("__STEPS__", json.dumps(steps, ensure_ascii=False)) + "\n" + apply_js
    num = fid.replace("fig-", "Fig ").split("-")[0]
    return f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>{CSS}</style></head>
<body><div class="wrap"><figure class="fig"><div class="plate">
<div class="head"><span>{num}</span><span>{title}</span></div>
<svg class="stage" viewBox="0 0 {W} {H}" role="slider" tabindex="0" aria-label="{title}" aria-valuemin="0" aria-valuemax="{len(steps)-1}" aria-valuenow="0">
<rect x="6" y="6" width="{W-12}" height="{H-12}" rx="10" fill="#f8f3e6" stroke="#d8cfba"/>
{svg}
</svg>
<div class="readout" data-readout>{steps[0]}</div>
<div class="hint">{hint}</div>
</div><figcaption class="cap"><ul class="keys">{keys_html}</ul>{caption}</figcaption></figure></div>
<script>{script}</script></body></html>
"""


def rect(x, y, w, h, id_=None, rx=8, cls="box"):
    id_attr = f' id="{id_}"' if id_ else ""
    return f'<rect{id_attr} class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>'


def text(x, y, s, cls="small", anchor="middle", id_=None, extra=""):
    id_attr = f' id="{id_}"' if id_ else ""
    return f'<text{id_attr} class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}"{extra}>{s}</text>'


# ---------------------------------------------------------------- fig 1
def fig_triangle():
    steps = [
        "операция или проект",
        "цель: заявки к сентябрю",
        "содержание: 12 функций",
        "срок: 6 месяцев",
        "бюджет: 1,2 млн рублей",
        "качество: 95 процентов",
        "компромисс: +2 функции = +6 недель",
        "успех: результат, срок, бюджет, выгода",
    ]
    vals = [(50, 50, 50), (55, 60, 56), (85, 58, 54), (55, 90, 60),
            (55, 58, 92), (58, 62, 64), (86, 94, 70), (70, 72, 70)]
    svg = "\n".join([
        text(380, 38, "ТРИ ОГРАНИЧЕНИЯ ОДНОГО ПРОЕКТА", "small"),
        '<polygon id="tri" points="380,105 130,325 630,325" fill="#fbf6ea" stroke="#b7ae99" stroke-width="2"/>',
        '<circle id="q" cx="380" cy="243" r="48" fill="#fffdf7" stroke="#9a7300" stroke-width="2"/>',
        text(380, 236, "качество", "mid", id_="qt"),
        text(380, 258, "95%", "big", id_="qv"),
        '<circle id="v0" cx="380" cy="105" r="15" fill="#fff8e6" stroke="#9a7300" stroke-width="2"/>',
        text(380, 83, "содержание", "lbl", id_="l0"),
        '<circle id="v1" cx="130" cy="325" r="15" fill="#fff8e6" stroke="#9a7300" stroke-width="2"/>',
        text(130, 357, "срок", "lbl", id_="l1"),
        '<circle id="v2" cx="630" cy="325" r="15" fill="#fff8e6" stroke="#9a7300" stroke-width="2"/>',
        text(630, 357, "стоимость", "lbl", id_="l2"),
        text(228, 300, "12 функций", "small"),
        text(380, 300, "6 месяцев", "small"),
        text(540, 300, "1,2 млн рублей", "small"),
        '<g id="badge" class="dim"><rect x="248" y="158" width="264" height="34" rx="8" fill="#fff4dc" stroke="#9a7300"/>'
        + text(380, 180, "+2 функции → +6 недель", "mid") + "</g>",
    ])
    apply = """
function apply(n){
  const vals=__VALS__; const v=vals[n];
  const ax=380, ay=105-(v[0]-50)*0.6;
  const lx=130-(v[1]-50)*1.5, ly=325-(v[1]-50)*0.35;
  const rx=630+(v[2]-50)*1.5, ry=325-(v[2]-50)*0.35;
  document.getElementById('tri').setAttribute('points', `${ax},${ay} ${lx},${ly} ${rx},${ry}`);
  [['v0','l0',ax,ay,-22,0],['v1','l1',lx,ly,32,0],['v2','l2',rx,ry,32,0]].forEach(([id,lid,x,y,dy])=>{
    const c=document.getElementById(id); c.setAttribute('cx',x); c.setAttribute('cy',y);
    const l=document.getElementById(lid); l.setAttribute('x',x); l.setAttribute('y',y+dy);
  });
  const cx=(ax+lx+rx)/3, cy=(ay+ly+ry)/3-6;
  document.getElementById('q').setAttribute('cx',cx); document.getElementById('q').setAttribute('cy',cy);
  document.getElementById('qt').setAttribute('x',cx); document.getElementById('qt').setAttribute('y',cy-7);
  document.getElementById('qv').setAttribute('x',cx); document.getElementById('qv').setAttribute('y',cy+15);
  document.getElementById('qv').textContent = n===6?'88%':'95%';
  document.getElementById('q').setAttribute('stroke', n===6?'#b23a2f':'#9a7300');
  document.getElementById('badge').classList.toggle('dim', n!==6);
}
""".replace("__VALS__", json.dumps(vals))
    return dict(
        fid="fig-01-triangle", title="Треугольник ограничений",
        hint="Проведите по треугольнику: каждая вершина тянет две другие.",
        svg=svg, steps=steps, apply=apply,
        keys=["содержание", "срок", "стоимость", "качество в центре"],
        caption="Проект держит четыре величины одновременно. Усиление одной вершины отзывается в двух других, а качество стоит в центре: его снижают последним.",
    )


# ---------------------------------------------------------------- fig 2
def fig_lifecycle():
    steps = [
        "инициация: устав",
        "ворота 1: устав подписан",
        "планирование: WBS и бюджет",
        "ворота 2: базовый план",
        "исполнение: продукт",
        "контроль: отклонение",
        "возврат: перепланирование",
        "закрытие: приёмка и уроки",
    ]
    xs = [100, 170, 240, 450, 520, 520, 240, 680]
    stations = [(50, "инициация", "устав"), (190, "планирование", "WBS, бюджет"),
                (330, "исполнение", "продукт"), (470, "контроль", "отклонение"),
                (610, "закрытие", "приёмка")]
    parts = [text(380, 56, "ПЯТЬ ФАЗ, ЧЕТВЕРО ВОРОТ, ОДНА ВОЗВРАТНАЯ ПЕТЛЯ", "small"),
             '<line x1="60" y1="294" x2="700" y2="294" stroke="#cabfa5" stroke-width="10" stroke-linecap="round"/>',
             '<path id="loop" d="M520 215 C520 140 240 140 240 215" fill="none" stroke="#2f5d8a" stroke-width="4" stroke-dasharray="9 8" class="dim"/>',
             text(380, 132, "возврат на перепланирование", "small")]
    for i, (x, name, res) in enumerate(stations):
        parts.append(f'<g id="st{i}" class="node">{rect(x, 215, 100, 68, rx=9, cls="")}{text(x + 50, 243, name, "mid")}{text(x + 50, 263, res, "small")}</g>')
    for i, gx in enumerate([170, 310, 450, 590]):
        parts.append(f'<g id="g{i}"><polygon points="{gx},294 {gx + 11},282 {gx + 22},294 {gx + 11},306" fill="#fffdf7" stroke="#9a7300" stroke-width="2"/></g>')
        parts.append(text(gx + 11, 324, f"в.{i + 1}", "small"))
    parts.append('<g id="cart" transform="translate(100 186)"><rect x="-20" y="-30" width="40" height="28" rx="5" fill="#9a7300"/>'
                 '<circle cx="-11" cy="2" r="6" fill="#24303a"/><circle cx="11" cy="2" r="6" fill="#24303a"/>'
                 + text(0, -11, "ИС", "small", extra=' fill="#fff8e6"') + "</g>")
    parts.append(text(100, 392, "6 месяцев", "small", anchor="start"))
    parts.append(text(430, 392, "3 итерации", "small", anchor="start"))
    svg = "\n".join(parts)
    apply = """
function apply(n){
  const xs=__XS__;
  document.getElementById('cart').setAttribute('transform', `translate(${xs[n]} 186)`);
  const map=[0,0,1,1,2,3,4,4];
  for(let i=0;i<5;i++)document.getElementById('st'+i).classList.toggle('on', map[n]===i);
  for(let i=0;i<4;i++)document.getElementById('g'+i).classList.toggle('dim', n!==(i*2+1));
  document.getElementById('loop').classList.toggle('dim', n!==6);
}
""".replace("__XS__", json.dumps(xs))
    return dict(
        fid="fig-02-lifecycle", title="Конвейер жизненного цикла",
        hint="Проведите тележку по фазам: каждая пара ворот спрашивает результат.",
        svg=svg, steps=steps, apply=apply,
        keys=["пять фаз", "четверо ворот", "возвратная петля"],
        caption="Тележка идёт по фазам слева направо и останавливается у ворот. На контроле она может вернуться на перепланирование, но не назад в инициацию.",
    )


# ---------------------------------------------------------------- fig 3
def fig_charter():
    steps = [
        "вход: бизнес-обоснование",
        "цель и выгода",
        "границы проекта",
        "результаты и вехи",
        "бюджет и ресурсы",
        "роли и полномочия",
        "риски и допущения",
        "подпись спонсора",
    ]
    inputs = [(80, "бизнес-обоснование", "зачем и какая выгода"),
              (140, "содержание", "12 функций проекта"),
              (200, "ограничения", "срок, бюджет, люди"),
              (260, "допущения", "что считаем верным")]
    sections = ["1. цель и выгода", "2. границы", "3. результаты и вехи",
                "4. бюджет и ресурсы", "5. роли и полномочия",
                "6. риски и допущения", "7. подпись спонсора"]
    parts = [text(380, 56, "ЧЕТЫРЕ ВХОДА СОБИРАЮТСЯ В СЕМЬ РАЗДЕЛОВ", "small")]
    for i, (y, name, sub) in enumerate(inputs):
        parts.append(f'<g id="in{i}" class="node">{rect(24, y, 168, 46, rx=7, cls="")}'
                     + text(108, y + 20, name, "mid") + text(108, y + 36, sub, "small") + "</g>")
        parts.append(f'<line x1="194" y1="{y + 23}" x2="250" y2="{y + 23}" stroke="#b7ae99" stroke-width="1.2"/>')
    parts.append(rect(252, 68, 280, 282, rx=10, cls="node"))
    parts.append('<rect x="252" y="68" width="280" height="282" rx="10" fill="none" stroke="#9a7300" stroke-width="2"/>')
    parts.append(text(392, 98, "УСТАВ ПРОЕКТА", "big"))
    for i, name in enumerate(sections):
        y = 116 + i * 32
        parts.append(f'<g id="s{i}"><rect x="268" y="{y}" width="248" height="26" rx="4" fill="#f1e8d2"/>'
                     + text(278, y + 17, name, "small", anchor="start") + "</g>")
    parts.append('<line x1="532" y1="210" x2="566" y2="210" stroke="#b7ae99" stroke-width="1.2"/>')
    parts.append('<g id="stamp" class="dim"><circle cx="640" cy="210" r="52" fill="none" stroke="#b23a2f" stroke-width="3"/>'
                 + text(640, 204, "СПОНСОР", "mid") + text(640, 222, "подписано", "small") + "</g>")
    svg = "\n".join(parts)
    apply = """
function apply(n){
  for(let i=0;i<4;i++)document.getElementById('in'+i).classList.toggle('on', n<=3 && i===n);
  for(let i=0;i<7;i++){
    const el=document.getElementById('s'+i);
    const done = n>i;
    el.querySelector('rect').setAttribute('fill', done?'#f3e3b8':'#f1e8d2');
    el.classList.toggle('dim', !done && n<=i);
  }
  document.getElementById('stamp').classList.toggle('dim', n<7);
}
"""
    return dict(
        fid="fig-03-charter", title="Сборочный стол устава",
        hint="Заполняйте разделы по одному: устав закрывается подписью.",
        svg=svg, steps=steps, apply=apply,
        keys=["четыре входа", "семь разделов", "подпись спонсора"],
        caption="Бизнес-обоснование, содержание, ограничения и допущения проходят в документ. Пока не заполнен последний раздел и нет подписи, проект не получает права работать.",
    )


# ---------------------------------------------------------------- fig 4
def fig_stakeholders():
    steps = [
        "список сторон: девять человек и групп",
        "власть: от 1 до 5",
        "интерес: от 1 до 5",
        "ключевые: спонсор и заказчик",
        "влиятельные: преподаватели",
        "наблюдающие: студенты",
        "план вовлечения для каждого",
        "проверка карты через месяц",
    ]
    chips = [("S1", "спонсор", 555, 135), ("S2", "заказчик", 640, 95),
             ("S3", "директор", 315, 95), ("S4", "преподаватели", 610, 200),
             ("S5", "студенты", 330, 300), ("S6", "администратор", 525, 235),
             ("S7", "разработчик", 625, 265), ("S8", "поддержка", 470, 300),
             ("S9", "бухгалтерия", 300, 160)]
    parts = [text(400, 40, "ВЛАСТЬ ПО ВЕРТИКАЛИ, ИНТЕРЕС ПО ГОРИЗОНТАЛИ", "small"),
             '<rect x="110" y="58" width="580" height="300" rx="8" fill="#fbf6ea" stroke="#b7ae99"/>',
             '<line x1="400" y1="58" x2="400" y2="358" class="grid"/>',
             '<line x1="110" y1="208" x2="690" y2="208" class="grid"/>',
             text(255, 78, "информировать", "small"), text(545, 78, "управлять", "small"),
             text(255, 350, "наблюдать", "small"), text(545, 350, "вовлекать", "small"),
             text(400, 380, "интерес →", "small"),
             '<text class="small" x="92" y="208" text-anchor="middle" transform="rotate(-90 92 208)">власть →</text>']
    for i, (sid, name, x, y) in enumerate(chips):
        parts.append(f'<g id="c{i}" class="node">{rect(x - 44, y - 13, 88, 26, rx=13, cls="")}'
                     + text(x, y + 4, name, "small") + "</g>")
    svg = "\n".join(parts)
    apply = """
function apply(n){
  const ids=['c0','c1','c2','c3','c4','c5','c6','c7','c8'];
  let on=ids;
  if(n===1) on=['c0','c2','c1'];
  else if(n===2) on=['c0','c1','c3','c4'];
  else if(n===3) on=['c0','c1'];
  else if(n===4) on=['c3','c5'];
  else if(n===5) on=['c4','c7'];
  ids.forEach(id=>document.getElementById(id).classList.toggle('on', on.includes(id)));
}
"""
    return dict(
        fid="fig-04-stakeholders", title="Карта власти и интереса",
        hint="Выберите сторону: квадрант задаёт стратегию работы.",
        svg=svg, steps=steps, apply=apply,
        keys=["девять сторон", "оси власти и интереса", "четыре стратегии"],
        caption="Спонсор и заказчик стоят в правом верхнем квадранте: их вовлекают в решения. Студентов держат в наблюдающих, преподавателей вовлекают, бухгалтерию информируют.",
    )


# ---------------------------------------------------------------- fig 5
def fig_wbs():
    steps = [
        "результат проекта",
        "уровень 1: четыре ветви",
        "уровень 2: четырнадцать пакетов",
        "правило 100 процентов",
        "зависимости FS",
        "сеть из шести работ",
        "критический путь 34 дня",
        "резерв 5 дней",
    ]
    groups = [(70, "требования", 3), (160, "проектирование", 3),
              (250, "разработка", 4), (340, "внедрение", 4)]
    nodes = [(430, 140), (510, 95), (510, 215), (590, 140), (590, 265), (670, 190)]
    edges = [(0, 1), (0, 2), (1, 3), (2, 3), (2, 4), (3, 5), (4, 5)]
    critical = [(0, 1), (1, 3), (3, 5)]
    parts = [text(230, 44, "ДЕРЕВО РАБОТ", "small"), text(550, 44, "СЕТЬ РАБОТ", "small"),
             '<g id="root" class="node">' + rect(140, 58, 120, 32, rx=6, cls="") + text(200, 79, "ИС Заявки", "mid") + "</g>"]
    for i, (x, name, count) in enumerate(groups):
        parts.append(f'<line x1="200" y1="90" x2="{x}" y2="118" stroke="#b7ae99"/>')
        parts.append(f'<g id="br{i}" class="node">{rect(x - 40, 118, 80, 30, rx=6, cls="")}{text(x, 138, name, "small")}</g>')
    lf = 0
    for gi, (x, name, count) in enumerate(groups):
        for j in range(count):
            y = 175 + j * 34
            parts.append(f'<line x1="{x}" y1="148" x2="{x}" y2="{y}" stroke="#ded4bd"/>')
            parts.append(f'<rect id="lf{lf}" x="{x - 32}" y="{y}" width="64" height="22" rx="4" fill="#fffdf7" stroke="#c9bfa8"/>')
            parts.append(f'<text id="lc{lf}" class="tiny" x="{x}" y="{y + 15}" text-anchor="middle">{gi + 1}.{j + 1}</text>')
            lf += 1
    parts.append('<g id="rule" class="dim">' + text(230, 342, "сумма пакетов = 100% результата", "small") + "</g>")
    for a, b in edges:
        x1, y1 = nodes[a]
        x2, y2 = nodes[b]
        cid = f' id="e{a}-{b}"' if (a, b) in critical else ""
        parts.append(f'<line{cid} x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#b7ae99" stroke-width="1.6"/>')
    for i, (x, y) in enumerate(nodes):
        parts.append(f'<g id="n{i}" class="node"><circle cx="{x}" cy="{y}" r="20"/>{text(x, y + 4, f"T{i + 1}", "small")}</g>')
    parts.append(text(550, 330, "цепочка без резерва задаёт срок", "small", id_="res"))
    parts.append(text(550, 352, "критический путь: T1 → T2 → T4 → T6 = 34 дня", "small", id_="cp"))
    svg = "\n".join(parts)
    apply = """
function apply(n){
  for(let i=0;i<4;i++)document.getElementById('br'+i).classList.toggle('on', n===1||n>=2);
  document.getElementById('root').classList.toggle('on', n<2||n===0);
  for(let i=0;i<14;i++){const el=document.getElementById('lf'+i); if(el)el.setAttribute('fill', n>=2?'#f3e3b8':'#fffdf7');}
  document.getElementById('rule').classList.toggle('dim', n!==3);
  for(let i=0;i<6;i++)document.getElementById('n'+i).classList.toggle('on', n>=4);
  const crit = n>=6;
  [['0-1',0],['1-3',0],['3-5',0]].forEach(([id])=>{
    const el=document.getElementById('e'+id);
    if(el){el.setAttribute('stroke', crit?'#b23a2f':'#b7ae99'); el.setAttribute('stroke-width', crit?'3.4':'1.6');}
  });
  document.getElementById('cp').classList.toggle('dim', n<6);
  document.getElementById('res').classList.toggle('dim', n<7);
}
"""
    return dict(
        fid="fig-05-wbs", title="Дерево работ и сеть",
        hint="Разверните ветви, затем перейдите к зависимостям и резерву.",
        svg=svg, steps=steps, apply=apply,
        keys=["корень результата", "14 пакетов", "сеть работ", "критический путь"],
        caption="Дерево заканчивается пакетами с измеримым результатом. Из пакетов и зависимостей собирается сеть, а самая длинная цепочка задаёт срок и не имеет резерва.",
    )


# ---------------------------------------------------------------- fig 6
def fig_evm():
    steps = [
        "план: PV на шесть месяцев",
        "факт: AC больше плана",
        "освоенный объём EV",
        "плановый объём PV",
        "фактические затраты AC",
        "CPI = 0,89",
        "SPI = 0,80",
        "прогноз EAC = 1,35 млн",
    ]
    months = [0, 1, 2, 3, 4, 5, 6]
    pv = [0, 100, 200, 300, 400, 500, 600]
    ev = [0, 90, 180, 260, 340, 420, 480]
    ac = [0, 110, 210, 330, 430, 520, 540]

    def pts(vals):
        return " ".join(f"{100 + m * 68},{320 - v * 0.4}" for m, v in zip(months, vals))

    parts = [text(320, 48, "ОСВОЕННЫЙ ОБЪЁМ, ТЫСЯЧИ РУБЛЕЙ", "small"),
             '<line x1="100" y1="320" x2="540" y2="320" class="axis"/>',
             '<line x1="100" y1="70" x2="100" y2="320" class="axis"/>']
    for val in (100, 200, 300, 400, 500):
        y = 320 - val * 0.4
        parts.append(f'<line x1="100" y1="{y}" x2="540" y2="{y}" class="grid"/>')
        parts.append(text(92, y + 4, str(val), "small", anchor="end"))
    for m in months:
        parts.append(f'<line x1="{100 + m * 68}" y1="320" x2="{100 + m * 68}" y2="325" class="axis"/>')
        parts.append(text(100 + m * 68, 340, str(m), "small"))
    parts.append(text(540, 360, "месяцы", "small", anchor="end"))
    parts += [f'<polyline points="{pts(pv)}" fill="none" stroke="#2f5d8a" stroke-width="2.6"/>',              f'<polyline points="{pts(ev)}" fill="none" stroke="#2f7d54" stroke-width="2.6"/>',
              f'<polyline points="{pts(ac)}" fill="none" stroke="#b23a2f" stroke-width="2.6"/>',
              '<g id="cur"><line x1="100" y1="70" x2="100" y2="320" stroke="#9a7300" stroke-width="2" stroke-dasharray="4 4"/>'
              '<circle cx="100" cy="320" r="6" fill="#9a7300"/></g>',
              text(112, 64, "PV", "small", anchor="start", extra=' fill="#2f5d8a"'),
              text(146, 64, "EV", "small", anchor="start", extra=' fill="#2f7d54"'),
              text(180, 64, "AC", "small", anchor="start", extra=' fill="#b23a2f"'),
              rect(570, 70, 160, 230, rx=8)]
    parts += [text(650, 96, "ПОКАЗАТЕЛИ", "mid"),
              text(584, 128, "CPI", "small", anchor="start"), text(716, 128, "1,00", "big", anchor="end", id_="cpi"),
              text(584, 158, "SPI", "small", anchor="start"), text(716, 158, "1,00", "big", anchor="end", id_="spi"),
              text(584, 194, "BAC", "small", anchor="start"), text(716, 194, "1,20", "big", anchor="end"),
              text(584, 224, "EAC", "small", anchor="start"), text(716, 224, "1,20", "big", anchor="end", id_="eac"),
              text(650, 262, "план совпадает", "small", id_="verdict"),
              text(650, 284, "млн рублей", "small")]
    svg = "\n".join(parts)
    apply = """
function apply(n){
  const pv=[0,100,200,300,400,500,600], ev=[0,90,180,260,340,420,480], ac=[0,110,210,330,430,520,540];
  const m=Math.min(n,6), x=100+m*68;
  const cur=document.getElementById('cur');
  cur.querySelector('line').setAttribute('x1',String(x));
  cur.querySelector('line').setAttribute('x2',String(x));
  cur.querySelector('circle').setAttribute('cx',String(x));
  cur.querySelector('circle').setAttribute('cy',String(320-pv[m]*0.4));
  const cpi=ev[m]/(ac[m]||1), spi=ev[m]/(pv[m]||1);
  const fmt=v=>v.toFixed(2).replace('.',',');
  document.getElementById('cpi').textContent = m?fmt(cpi):'1,00';
  document.getElementById('spi').textContent = m?fmt(spi):'1,00';
  document.getElementById('eac').textContent = m?fmt(1200/cpi/1000):'1,20';
  const v=document.getElementById('verdict');
  if(!m)v.textContent='план совпадает';
  else if(cpi<1&&spi<1)v.textContent='дороже и позже плана';
  else if(cpi<1)v.textContent='дороже плана';
  else v.textContent='в норме';
}
"""
    return dict(
        fid="fig-06-evm", title="Пульт освоенного объёма",
        hint="Проведите по месяцам: три кривые расходятся, индексы объясняют почему.",
        svg=svg, steps=steps, apply=apply,
        keys=["PV план", "EV освоено", "AC потрачено", "CPI и SPI"],
        caption="К шестому месяцу план 600 тысяч, освоено 480, потрачено 540. CPI 0,89 говорит о перерасходе, SPI 0,80 об отставании, прогноз стоимости вырастает до 1,35 млн.",
    )


# ---------------------------------------------------------------- fig 7
def fig_risk():
    steps = [
        "идентификация: шесть рисков",
        "вероятность от 1 до 5",
        "влияние в рублях",
        "матрица: зелёная, жёлтая, красная",
        "EMV риска R3 = 72 тысячи",
        "стратегия: снизить",
        "владелец и триггер",
        "остаточный риск и резерв",
    ]
    risks = [("R1", 2, 2, 60, 0.3, "принять"),
             ("R2", 3, 4, 60, 0.4, "снизить"),
             ("R3", 4, 4, 120, 0.6, "снизить"),
             ("R4", 2, 5, 90, 0.2, "страховать"),
             ("R5", 4, 2, 30, 0.5, "снизить"),
             ("R6", 1, 5, 300, 0.05, "принять")]

    def colour(p, i):
        s = p * i
        if s >= 15:
            return "#e7b3ab"
        if s >= 10:
            return "#f0d0a8"
        if s >= 5:
            return "#f4e7ae"
        return "#cfe3c8"

    parts = [text(330, 48, "ВЕРОЯТНОСТЬ ПО ВЕРТИКАЛИ, ВЛИЯНИЕ ПО ГОРИЗОНТАЛИ", "small")]
    for p in range(1, 6):
        for i in range(1, 6):
            x = 130 + (i - 1) * 70
            y = 310 - (p - 1) * 50
            parts.append(f'<rect x="{x}" y="{y}" width="68" height="48" fill="{colour(p, i)}" stroke="#fffdf7"/>')
            parts.append(text(x + 34, y + 29, str(p * i), "small", extra=' fill="#6c6555"'))
    for p, y in ((1, 338), (3, 238), (5, 138)):
        parts.append(text(122, y, str(p), "small", anchor="end"))
    for i, x in ((1, 164), (3, 304), (5, 444)):
        parts.append(text(x, 382, str(i), "small"))
    parts.append(text(330, 404, "влияние →", "small"))
    parts.append('<text class="small" x="88" y="240" text-anchor="middle" transform="rotate(-90 88 240)">вероятность →</text>')
    for rid, p, i, cost, prob, strat in risks:
        x = 130 + (i - 1) * 70 + 8
        y = 310 - (p - 1) * 50 + 8
        parts.append(f'<g id="{rid}" class="node">{rect(x, y, 52, 32, rx=5, cls="")}{text(x + 26, y + 21, rid, "small")}</g>')
    parts.append('<g id="panel" class="dim">' + rect(520, 80, 200, 130, rx=8)
                 + text(620, 106, "R3", "mid", id_="pt")
                 + text(620, 128, "P 0,6 · 120 тыс.", "small", id_="pd")
                 + text(620, 154, "EMV 72 тыс.", "big", id_="pe")
                 + text(620, 176, "стратегия: снизить", "small", id_="ps")
                 + text(620, 196, "владелец: РП", "small", id_="po") + "</g>")
    svg = "\n".join(parts)
    apply = """
function apply(n){
  const risks=__RISKS__;
  risks.forEach(r=>document.getElementById(r[0]).classList.remove('on'));
  if(n===0)risks.forEach(r=>document.getElementById(r[0]).classList.add('on'));
  else if(n===1)risks.forEach(r=>{if(r[1]>=4)document.getElementById(r[0]).classList.add('on');});
  else if(n===2)risks.forEach(r=>{if(r[2]>=4)document.getElementById(r[0]).classList.add('on');});
  else if(n===3)risks.forEach(r=>{if(r[1]*r[2]>=12)document.getElementById(r[0]).classList.add('on');});
  else document.getElementById('R3').classList.add('on');
  document.getElementById('panel').classList.toggle('dim', n<4);
}
""".replace("__RISKS__", json.dumps([[r[0], r[1], r[2]] for r in risks]))
    return dict(
        fid="fig-07-risk", title="Матрица рисков",
        hint="Проведите по шагам: от списка до триггера и остаточного риска.",
        svg=svg, steps=steps, apply=apply,
        keys=["шесть рисков", "вероятность и влияние", "EMV", "владелец и триггер"],
        caption="Риск R3 с вероятностью 0,6 и последствием 120 тысяч даёт EMV 72 тысячи. Сумма EMV по шести рискам около 78 тысяч, поэтому резерв на риски не меньше этой суммы.",
    )


# ---------------------------------------------------------------- fig 8
def fig_quality():
    steps = [
        "качество и сорт: это разные вещи",
        "план качества и критерии",
        "проверка требований: поймано 2 дефекта",
        "проверка проекта: поймано 3 дефекта",
        "проверка кода: поймано 4 дефекта",
        "тестирование: поймано 3 дефекта",
        "приёмка: 0 дефектов, 95 процентов проверок",
        "стоимость дефекта растёт в 100 раз",
    ]
    stages = [("требования", 2, "1x"), ("проект", 3, "3x"), ("код", 4, "10x"),
              ("тесты", 3, "30x"), ("приёмка", 0, "100x")]
    widths = [300, 246, 192, 138, 90]
    parts = [text(230, 48, "ВОРОНКА ПРОВЕРОК", "small"),
             text(440, 48, "ЦЕНА ДЕФЕКТА", "small", anchor="start")]
    for i, ((name, caught, cost), w) in enumerate(zip(stages, widths)):
        y = 72 + i * 62
        parts.append(f'<g id="f{i}" class="node"><path d="M{230 - w / 2} {y} L{230 + w / 2} {y} L{230 + w / 2 - 20} {y + 50} L{230 - w / 2 + 20} {y + 50} Z"/>'
                     + text(230, y + 22, name, "small") + text(230, y + 40, f"-{caught}" if caught else "0", "mid") + "</g>")
        parts.append(text(440, y + 30, cost, "small", anchor="start"))
    parts.append(text(230, 388, "12 дефектов поймано до приёмки", "small"))
    parts.append('<g id="banner" class="dim">' + rect(520, 80, 200, 150, rx=8)
                 + text(620, 106, "ИТОГ", "mid")
                 + text(620, 140, "12 / 12", "big", id_="b1")
                 + text(620, 163, "дефектов поймано", "small")
                 + text(620, 196, "95%", "big", id_="b3")
                 + text(620, 218, "проверок пройдено", "small") + "</g>")
    svg = "\n".join(parts)
    apply = """
function apply(n){
  const map=[-1,-1,0,1,2,3,4];
  for(let i=0;i<5;i++)document.getElementById('f'+i).classList.toggle('on', map[n]===i);
  document.getElementById('banner').classList.toggle('dim', n<6);
  document.getElementById('b3').textContent = n>=6 ? '95%' : '?';
  document.getElementById('b1').textContent = n>=6 ? '12 / 12' : '?';
}
"""
    return dict(
        fid="fig-08-quality", title="Воронка качества",
        hint="Проведите по уровням: чем позже найден дефект, тем дороже он стоит.",
        svg=svg, steps=steps, apply=apply,
        keys=["пять уровней проверки", "12 дефектов", "рост цены дефекта"],
        caption="Требования, проект, код и тесты ловят дефекты до приёмки. Дефект, найденный на приёмке, стоит примерно в сто раз дороже того же дефекта в требованиях.",
    )


# ---------------------------------------------------------------- fig 9
def fig_comms():
    steps = [
        "отправитель: руководитель проекта",
        "канал: встреча или письмо",
        "шум: термины и спешка",
        "получатель: преподаватель",
        "обратная связь: понял или нет",
        "сеть: семь человек дают 21 канал",
        "RACI: у работы один A",
        "встреча: повестка, решение, протокол",
    ]
    names = ["РП", "заказчик", "препод.", "студент", "админ", "разраб.", "поддержка"]
    nodes = []
    for i in range(7):
        a = -math.pi / 2 + 2 * math.pi * i / 7
        nodes.append((280 + 120 * math.cos(a), 215 + 110 * math.sin(a)))
    parts = [text(280, 48, "СЕМЬ УЧАСТНИКОВ, 21 КАНАЛ", "small")]
    for i in range(7):
        for j in range(i + 1, 7):
            (x1, y1), (x2, y2) = nodes[i], nodes[j]
            parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#ddd3bd" stroke-width="1.2"/>')
    for i, ((x, y), name) in enumerate(zip(nodes, names)):
        xs, ys = f"{x:.1f}", f"{y:.1f}"
        parts.append(f'<g id="p{i}" class="node"><circle cx="{xs}" cy="{ys}" r="26"/>{text(xs, y + 4, name, "small")}</g>')
    parts.append(f'<circle id="msg" cx="{nodes[0][0]:.1f}" cy="{nodes[0][1]:.1f}" r="31" fill="none" stroke="#9a7300" stroke-width="3"/>')
    parts.append(rect(470, 80, 260, 240, rx=8))
    parts.append(text(600, 106, "КОММУНИКАЦИЯ", "mid"))
    for i, label in enumerate(["отправитель: РП", "канал: встреча", "шум: термины и спешка",
                               "получатель: преподаватель", "обратная связь: вопрос"]):
        parts.append(text(486, 138 + i * 24, label, "small", anchor="start", id_=f"t{i + 1}"))
    parts.append(text(600, 262, "21", "big", id_="t6"))
    parts.append(text(600, 284, "канал при семи людях", "small", id_="t7"))
    svg = "\n".join(parts)
    apply = """
function apply(n){
  const nodes=__NODES__;
  const on={0:[0],1:[0,3],2:[0,3],3:[3],4:[0,3],5:[0,1,2,3,4,5,6],6:[0],7:[0,1,2,3,4,5,6]}[n];
  for(let i=0;i<7;i++)document.getElementById('p'+i).classList.toggle('on', on.includes(i));
  const msg=document.getElementById('msg');
  const target = n===4||n>=6 ? nodes[0] : nodes[3];
  msg.setAttribute('cx',String(target[0])); msg.setAttribute('cy',String(target[1]));
  msg.style.opacity = n===2? '.35' : '1';
  for(let i=1;i<=5;i++){const el=document.getElementById('t'+i); if(el)el.style.fontWeight = n===(i-1)?'700':'400';}
  document.getElementById('t6').textContent = n===5?'21':(n>=6?'36':'21');
  document.getElementById('t7').textContent = n>=6?'канал при девяти людях':'канал при семи людях';
}
""".replace("__NODES__", json.dumps([[round(x, 1), round(y, 1)] for x, y in nodes]))
    return dict(
        fid="fig-09-comms", title="Сеть коммуникаций",
        hint="Проведите по шагам: сообщение идёт от отправителя к получателю и обратно.",
        svg=svg, steps=steps, apply=apply,
        keys=["отправитель и получатель", "канал и шум", "21 канал на семерых", "RACI"],
        caption="Семь человек дают 21 двусторонний канал, девять уже 36. Чем больше команда, тем дороже каждый новый участник и тем важнее повестка и протокол.",
    )


# ---------------------------------------------------------------- fig 10
def fig_agile():
    steps = [
        "продуктовый бэклог: 40 story points",
        "планирование спринта: 10 дней",
        "спринт: команда берёт 32 пункта",
        "ежедневная встреча: 15 минут",
        "обзор: что готово",
        "ретроспектива: что изменим",
        "сгорание: факт выше идеальной линии",
        "закрытие: приёмка и уроки",
    ]
    cyc = []
    for i in range(6):
        a = -math.pi / 2 + 2 * math.pi * i / 6
        cyc.append((210 + 105 * math.cos(a), 215 + 95 * math.sin(a)))
    names = ["бэклог", "план", "спринт", "ежедневка", "обзор", "ретро"]
    days = list(range(11))
    ideal = [40 - 4 * d for d in days]
    actual = [40, 38, 34, 32, 29, 32, 26, 20, 13, 5, 0]

    def pts(vals):
        return " ".join(f"{400 + d * 29},{320 - v * 5.2}" for d, v in zip(days, vals))

    parts = [text(210, 48, "ЦИКЛ СПРИНТА", "small"), text(560, 48, "СГОРАНИЕ, STORY POINTS", "small")]
    for i in range(6):
        (x1, y1), (x2, y2) = cyc[i], cyc[(i + 1) % 6]
        parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#ddd3bd" stroke-width="2"/>')
    for i, ((x, y), name) in enumerate(zip(cyc, names)):
        xs, ys = f"{x:.1f}", f"{y:.1f}"
        parts.append(f'<g id="s{i}" class="node"><circle cx="{xs}" cy="{ys}" r="40"/>{text(xs, y + 4, name, "small")}</g>')
    parts += ['<line x1="400" y1="320" x2="710" y2="320" class="axis"/>',
              '<line x1="400" y1="70" x2="400" y2="320" class="axis"/>',
              '<line x1="400" y1="112" x2="710" y2="112" class="grid"/>',
              text(392, 116, "40", "small", anchor="end"),
              '<line x1="400" y1="216" x2="710" y2="216" class="grid"/>',
              text(392, 220, "20", "small", anchor="end"),
              f'<polyline points="{pts(ideal)}" fill="none" stroke="#2f5d8a" stroke-width="2" stroke-dasharray="6 4"/>',
              f'<polyline points="{pts(actual)}" fill="none" stroke="#b23a2f" stroke-width="2.8"/>',
              '<circle id="dot" cx="400" cy="320" r="7" fill="#9a7300"/>',
              '<g id="scope" class="dim">' + rect(560, 240, 130, 46, rx=6)
              + text(625, 259, "+6 пунктов", "small") + text(625, 275, "новая история", "small") + "</g>",
              text(400, 344, "0", "small"), text(706, 344, "10 дней", "small", anchor="end")]    svg = "\n".join(parts)
    apply = """
function apply(n){
  const cyc={0:[0],1:[1],2:[2],3:[3],4:[4],5:[5],6:[2],7:[0,5]}[n]||[];
  for(let i=0;i<6;i++)document.getElementById('s'+i).classList.toggle('on', cyc.includes(i));
  const actual=[40,38,34,32,29,32,26,20,13,5,0];
  const day = n>=6? 5 : Math.min(n, 5);
  const dot=document.getElementById('dot');
  dot.setAttribute('cx',String(400+day*29));
  dot.setAttribute('cy',String(320-actual[day]*5.2));
  document.getElementById('scope').classList.toggle('dim', n!==6);
}
"""
    return dict(
        fid="fig-10-agile", title="Спринт-карусель и сгорание",
        hint="Проведите по циклу: факт сгорания отвечает, успела ли команда.",
        svg=svg, steps=steps, apply=apply,
        keys=["шесть событий цикла", "40 story points", "факт против идеала"],
        caption="Команда взяла 32 пункта на десять дней. На пятый день добавилась история на 6 пунктов, красная линия пошла выше идеальной, но к закрытию остаток всё равно нулевой.",
    )


FIGURES = [
    fig_triangle, fig_lifecycle, fig_charter, fig_stakeholders, fig_wbs,
    fig_evm, fig_risk, fig_quality, fig_comms, fig_agile,
]

DIRS = {
    "fig-01-triangle": "01-lek-01",
    "fig-02-lifecycle": "03-lek-02",
    "fig-03-charter": "05-lek-03",
    "fig-04-stakeholders": "06-lek-04",
    "fig-05-wbs": "08-lek-05",
    "fig-06-evm": "09-lek-06",
    "fig-07-risk": "11-lek-07",
    "fig-08-quality": "12-lek-08",
    "fig-09-comms": "14-lek-09",
    "fig-10-agile": "16-lek-10",
}


def main():
    for build in FIGURES:
        fig = build()
        folder = BASE / DIRS[fig["fid"]] / "figures" / fig["fid"]
        folder.mkdir(parents=True, exist_ok=True)
        html = page(fig["fid"], fig["title"], fig["hint"], fig["svg"],
                    fig["steps"], fig["keys"], fig["caption"], fig["apply"])
        for name in (f"{fig['fid']}.html", f"{fig['fid']}-light.html"):
            (folder / name).write_text(html, encoding="utf-8")
        print("wrote", folder / f"{fig['fid']}.html")


if __name__ == "__main__":
    main()
