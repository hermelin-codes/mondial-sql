# Erzeugt og.png, favicon-96.png und apple-touch-icon.png in web/public/.
# Voraussetzung: npm run build, dann: python3 scripts/make_images.py  (braucht playwright für Python)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
public = root / 'web' / 'public'
server = subprocess.Popen(['node', str(root / 'scripts' / 'serve.mjs'), '8091'])
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(**({'executable_path': sys.argv[1], 'args': ['--no-sandbox']} if len(sys.argv) > 1 else {}))
        # Vorschaubild: echte Seite mit Beispielabfrage
        # breiter aufnehmen, damit das ER-Diagramm neben dem Editor steht, dann auf 1200x630 verkleinern
        pg = b.new_page(viewport={'width': 1600, 'height': 840}, device_scale_factor=1)
        q = ("SELECT c.Name, COUNT(*) AS Nachbarn\nFROM borders b\nJOIN Country c\n  ON c.Code IN (b.Country1, b.Country2)\n"
             "GROUP BY c.Name\nORDER BY Nachbarn DESC\nLIMIT 5;")
        import urllib.parse
        pg.goto('http://localhost:8091/#q=' + urllib.parse.quote(q))
        pg.wait_for_function("!document.getElementById('run-btn').disabled", timeout=30000)
        pg.click('#run-btn')
        pg.add_style_tag(content='.page{padding-top:24px} .intro{margin-bottom:16px}')
        pg.wait_for_timeout(300)
        shot = public / 'og-full.png'
        pg.screenshot(path=str(shot))
        from PIL import Image
        Image.open(shot).resize((1200, 630), Image.LANCZOS).save(public / 'og.png', optimize=True)
        shot.unlink()
        # Icons aus dem SVG
        svg = (public / 'favicon.svg').read_text()
        for name, size in (('favicon-96.png', 96), ('apple-touch-icon.png', 180)):
            ip = b.new_page(viewport={'width': size, 'height': size})
            ip.set_content(f'<style>html,body{{margin:0;background:transparent}}svg{{width:{size}px;height:{size}px;display:block}}</style>{svg}')
            ip.screenshot(path=str(public / name), omit_background=True)
        b.close()
finally:
    server.terminate()
print('ok')
