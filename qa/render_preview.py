from pathlib import Path
from playwright.sync_api import sync_playwright

css = Path('qa/preview/app.css').read_text()

def html_with_inline_css(name: str) -> str:
    html = Path('qa/preview', name).read_text()
    return html.replace('<link rel="stylesheet" href="app.css">', f'<style>{css}</style>')

cases = [
    ('index.html', 430, 932, 'today-430x932.png'),
    ('index.html', 375, 667, 'today-375x667.png'),
    ('index.html', 412, 915, 'today-412x915.png'),
    ('index.html', 768, 1024, 'today-768x1024.png'),
    ('index.html', 1440, 900, 'today-1440x900.png'),
    ('workout.html', 430, 932, 'workout-430x932.png'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
    for source, width, height, output in cases:
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.set_content(html_with_inline_css(source), wait_until='load')
        overflow = page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        min_touch = page.evaluate("""() => [...document.querySelectorAll('button')].every(el => { const r=el.getBoundingClientRect(); return r.width >= 44 && r.height >= 42; })""")
        page.screenshot(path=f'qa/screenshots/{output}', full_page=False)
        print(f'{output}: no_horizontal_overflow={overflow} touch_targets={min_touch}')
        page.close()
    browser.close()
