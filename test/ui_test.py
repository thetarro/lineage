# Browser tests: play the real game in headless Chromium.
#
#   npm run test:ui
#
# Needs Python Playwright:  pip install playwright && playwright install chromium
# Three.js loads from a CDN, so an internet connection is required.

import json
import re
import socket
import subprocess
import sys
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit('Python Playwright is missing: pip install playwright && playwright install chromium')

ROOT = Path(__file__).resolve().parent.parent
# Software WebGL, so the tests also run on machines without a GPU.
CHROMIUM_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
failures = []
failed_requests = []
page_errors = []


def check(ok, message):
    print(f"  {'✓' if ok else '✗'} {message}")
    if not ok:
        failures.append(message)


def free_port():
    with socket.socket() as s:
        s.bind(('', 0))
        return s.getsockname()[1]


def visible(page, selector):
    el = page.query_selector(selector)
    return el is not None and el.is_visible()


def load(page, url, selector='#start'):
    """Open the game and wait for the title screen; explain what went wrong if it never shows."""
    failed_requests.clear()
    page.goto(url)
    try:
        page.wait_for_selector(selector, timeout=20000)
    except Exception:
        raise RuntimeError(f'the title screen did not load. Failed requests: {failed_requests or "none"}. Page errors: {page_errors or "none"}')


def play(page, url, want=(), stop_at=None):
    """Play one game, preferring the choices in `want`. Returns the eras seen and the outcome."""
    load(page, url)
    page.click('#start')
    eras = []
    for _ in range(600):
        page.wait_for_timeout(100)
        if visible(page, '#modal .ending'):
            return eras, 'won' if 'won' in page.get_attribute('#modal .ending', 'class') else 'extinct'
        if visible(page, '#modal .era-intro'):
            name = page.inner_text('#modal .era-intro h1')
            if name == stop_at:
                return eras, 'stopped'
            ids = [c.get_attribute('data-id') for c in page.query_selector_all('#modal .card')]
            eras.append((name, ids))
            page.click(f'#modal .card[data-id="{next((w for w in want if w in ids), ids[0])}"]')
        elif visible(page, '#continue'):
            page.click('#continue')
        elif visible(page, '#face'):
            page.click('#face')
            page.wait_for_selector('#continue', state='visible', timeout=45000)  # slow on busy machines with software rendering
        elif visible(page, '#live'):
            page.click('#live')
        elif visible(page, '#actions .card'):
            ids = [c.get_attribute('data-id') for c in page.query_selector_all('#actions .card')]
            page.click(f'#actions .card[data-id="{next((w for w in want if w in ids), ids[0])}"]')
    raise RuntimeError('the game stopped responding')


def main():
    port = free_port()
    url = f'http://localhost:{port}/'
    server = subprocess.Popen([sys.executable, str(ROOT / 'serve.py'), str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    match = re.search(r"VERSION = '([^']+)'", (ROOT / 'src/version.js').read_text())
    if not match:
        sys.exit('Could not read the version from src/version.js')
    version = match.group(1)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=CHROMIUM_ARGS)
            page = browser.new_context(viewport={'width': 1100, 'height': 800}).new_page()
            errors = page_errors
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('requestfailed', lambda r: failed_requests.append(f'{r.url} ({r.failure})'))

            print('Title screen')
            load(page, url)
            check(page.inner_text('.version') == f'v{version}', f'shows v{version}')
            check('0/' in page.inner_text('#codex'), 'encyclopedia starts with nothing discovered')

            print('Encyclopedia, before discovering anything')
            page.fill('#species-name', 'Testus "quoted" maximus')
            page.click('#codex')
            page.wait_for_selector('.codex')
            check(page.locator('.codex-tile[data-id]').count() == 0, 'no species can be opened')
            check(page.locator('.codex-tile.locked').count() > 0, 'species show as locked')
            hints = page.locator('.codex-tile.locked .codex-where').all_inner_texts()
            check(len(hints) == page.locator('.codex-tile.locked').count() and all(('sea' in h.lower()) or ('land' in h.lower()) for h in hints), 'locked species hint where to find them')
            page.locator('.codex-tile.locked').first.click(force=True)
            check(page.locator('.codex-entry').count() == 0, 'clicking a locked species does nothing')
            page.click('#codex-close')
            check(page.input_value('#species-name') == 'Testus "quoted" maximus', 'the typed name survives returning to the title')

            print('Discovering species by playing')
            page.click('#start')
            page.wait_for_selector('#modal .card')
            page.click('#modal .card >> nth=0')
            for key in ['KeyW', 'KeyD', 'KeyS', 'KeyA', 'KeyW']:
                page.keyboard.down(key)
                page.wait_for_timeout(2500)
                page.keyboard.up(key)
            found = page.evaluate("JSON.parse(localStorage.getItem('lineage.discovered') || '[]')")
            check(len(found) > 0, f'swimming around discovers species ({", ".join(found) or "none"})')

            print('Encyclopedia, after a reload')
            load(page, url, '#codex')
            page.click('#codex')
            page.wait_for_selector('.codex')
            check(page.locator('.codex-tile[data-id]').count() == len(found), 'discoveries are remembered')
            if found:
                page.locator('.codex-tile[data-id]').first.click()
                page.wait_for_selector('.codex-entry')
                text = page.inner_text('.codex-entry')
                check(all(s in text for s in ('Lived', 'Size', 'Diet', 'Facts')), 'an entry shows when it lived, size, diet and facts')
                page.wait_for_function("document.querySelector('.codex-hero').src.startsWith('data:image/png')", timeout=15000)
                check(True, 'the entry renders a thumbnail of the model')

            print('Arthropod branch in a real game')
            radiation, attempt = None, 0
            for attempt in range(1, 11):
                eras, outcome = play(page, url, want=['exoskeleton', 'goLand'], stop_at='Dominion')
                radiation = dict(eras).get('Radiation')
                if radiation:
                    break
            check(radiation == ['insectWings', 'arachnid'], f'exoskeleton on land offers Wings or Eight Legs (try {attempt})')

            check(dict(eras).get('Body Plans') == ['exoskeleton', 'spine', 'tentacles'], 'Body Plans offers tentacles as a third body plan')

            print('A full game')
            saved = lambda: page.evaluate("JSON.parse(localStorage.getItem('lineage.runs') || '[]').length")
            runs_before = saved()
            eras, outcome = play(page, url)
            check(outcome in ('won', 'extinct'), f'reaches the ending screen ({outcome} after {len(eras)} eras)')
            group = page.inner_text('#modal .epilogue b') if visible(page, '#modal .epilogue') else ''
            check(bool(group), f'the ending names the living group the lineage resembles ({group or "missing"})')

            print('Past lineages')
            load(page, url, '#gallery')
            check(saved() == runs_before + 1 and page.inner_text('#gallery').strip().endswith(str(runs_before + 1)), 'the finished game is saved and counted on the title screen')
            page.click('#gallery')
            page.wait_for_selector('.gallery')
            check(page.locator('.run').count() == runs_before + 1, 'the gallery lists every finished game')
            page.click('.run')
            page.wait_for_selector('.gallery .tl')
            check(page.locator('.gallery .tl-col').count() >= 2, "a past lineage's timeline can be opened")
            page.click('#gallery-list')
            page.click('#gallery-close')
            page.wait_for_selector('#start')

            print('Phone layout')
            page.set_viewport_size({'width': 390, 'height': 844})
            load(page, url, '#codex')
            overflow = "document.documentElement.scrollWidth > innerWidth || document.querySelector('#modal-content').scrollWidth > document.querySelector('#modal-content').clientWidth"
            check(not page.evaluate(overflow), 'title screen fits without sideways scrolling')
            page.click('#codex')
            page.wait_for_selector('.codex')
            check(not page.evaluate(overflow), 'encyclopedia fits without sideways scrolling')
            page.click('#codex-close')
            page.click('#gallery')
            page.wait_for_selector('.gallery')
            check(not page.evaluate(overflow), 'past lineages fit without sideways scrolling')

            check(not errors, f'no JavaScript errors{": " + json.dumps(errors) if errors else ""}')
            browser.close()
    finally:
        server.terminate()

    print(f'\n{"All browser tests passed." if not failures else f"{len(failures)} failed:"}')
    for f in failures:
        print(f'  ✗ {f}')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
