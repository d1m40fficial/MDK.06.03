"""Render every project management figure in Chromium, catch JS errors and save shots.

Run from the repository root:
    python tools/check_figs.py [name-filter]
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "courses" / "3" / "project-management" / "chapters"
OUT = ROOT / "tools" / "_figshots"

FIGS = sorted(BASE.glob("*/figures/*/fig-*.html"))
FIGS = [p for p in FIGS if not p.stem.endswith("-light")]


def main():
    needle = sys.argv[1] if len(sys.argv) > 1 else ""
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 860, "height": 760}, device_scale_factor=2)
        for path in FIGS:
            if needle and needle not in str(path):
                continue
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(path.as_uri())
            page.wait_for_timeout(250)
            steps = page.evaluate("N")
            for i in range(steps):
                page.evaluate(f"show({i})")
                page.wait_for_timeout(30)
            page.evaluate("show(0)")
            page.wait_for_timeout(120)
            name = path.stem
            page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
            page.evaluate(f"show({steps - 1})")
            page.wait_for_timeout(120)
            page.screenshot(path=str(OUT / f"{name}-last.png"), full_page=True)
            state = page.evaluate(
                "() => ({w: document.querySelector('.stage').getBoundingClientRect().width, "
                "h: document.querySelector('.stage').getBoundingClientRect().height, "
                "read: document.querySelector('[data-readout]').textContent})"
            )
            print(f"{name}: steps={steps} size={state['w']:.0f}x{state['h']:.0f} "
                  f"read={state['read']!r} errors={errors[:3]}")
        browser.close()


if __name__ == "__main__":
    main()
