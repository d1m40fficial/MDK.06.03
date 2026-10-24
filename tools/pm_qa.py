"""Interaction QA for the project management pages.

Run from the repository root after build_site.py:
    python tools/pm_qa.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "courses" / "3" / "project-management" / "dist"
SHOTS = ROOT / "tools" / "_figshots"


def main():
    SHOTS.mkdir(exist_ok=True)
    pages = sorted(DIST.glob("[0-9][0-9]-*.html"))
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for path in pages:
            errors = []
            page = b.new_page(viewport={"width": 1280, "height": 900})
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(path.as_uri())
            page.wait_for_timeout(200)
            gate_total = page.eval_on_selector_all(".gate-step", "els => els.length")
            gate_open = page.eval_on_selector_all(
                ".gate-step:not([hidden])", "els => els.length")
            quiz = page.eval_on_selector_all(".quiz-q", "els => els.length")
            figs = page.eval_on_selector_all("iframe.fig-frame, .figure iframe", "els => els.length")
            # open the first closed gate
            if gate_total and gate_open < gate_total:
                btn = page.query_selector(".gate-btn")
                if btn:
                    btn.click()
                    page.wait_for_timeout(150)
            open_after = page.eval_on_selector_all(
                ".gate-step:not([hidden])", "els => els.length")
            # mobile overflow
            page.set_viewport_size({"width": 390, "height": 844})
            page.wait_for_timeout(120)
            overflow = page.evaluate(
                "() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
            # dark theme
            page.click("text=Тёмная тема") if page.query_selector("text=Тёмная тема") else None
            page.wait_for_timeout(150)
            dark_overflow = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
            print(f"{path.stem}: gates={gate_total} open={gate_open}->{open_after} "
                  f"quiz={quiz} figs={figs} mobile_overflow={overflow}/{dark_overflow} err={errors[:2]}")
            if path.stem.startswith("01-"):
                page.set_viewport_size({"width": 390, "height": 844})
                page.screenshot(path=str(SHOTS / "page-mobile-dark.png"), full_page=False)
            page.close()
        b.close()


if __name__ == "__main__":
    main()
