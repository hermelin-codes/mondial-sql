# Erzeugt og.png (deutsch), og-en.png (englisch), favicon-96.png und apple-touch-icon.png in web/public/.
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
        # Vorschaubild je Sprache: echte Seite mit Beispielabfrage, daneben Überschrift
        import base64, urllib.parse
        cards = {
            'og.png': dict(path='/', alias='Nachbarn', h1='SQL üben mit<br>der Mondial&#8209;<br>Datenbank',
                           sub='Direkt im Browser, ohne Installation. Mit ER&#8209;Diagramm und Aufgaben.', locale='de-DE'),
            'og-en.png': dict(path='/en/', alias='Neighbors', h1='Practice SQL<br>with the Mondial<br>Database',
                              sub='Right in your browser, no installation. With ER diagram and exercises.', locale='en-US'),
        }
        for out, c in cards.items():
            # breiter aufnehmen, damit das ER-Diagramm neben dem Editor steht
            ctx = b.new_context(viewport={'width': 1600, 'height': 840}, device_scale_factor=1, locale=c['locale'])
            pg = ctx.new_page()
            q = (f"SELECT c.Name, COUNT(*) AS {c['alias']}\nFROM borders b\nJOIN Country c\n  ON c.Code IN (b.Country1, b.Country2)\n"
                 f"GROUP BY c.Name\nORDER BY {c['alias']} DESC\nLIMIT 5;")
            pg.goto('http://localhost:8091' + c['path'] + '#q=' + urllib.parse.quote(q))
            pg.wait_for_function("!document.getElementById('run-btn').disabled", timeout=30000)
            pg.click('#run-btn')
            pg.add_style_tag(content='.page{padding-top:24px} .intro{margin-bottom:16px}')
            pg.wait_for_timeout(300)
            shot = public / 'og-full.png'
            pg.screenshot(path=str(shot))
            ctx.close()
            b64 = base64.b64encode(shot.read_bytes()).decode()
            card = b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
            card.set_content(f'''<style>
              *{{box-sizing:border-box;margin:0}}
              body{{width:1200px;height:630px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Helvetica,Arial,sans-serif;color:#141414;position:relative;overflow:hidden}}
              .logo{{position:absolute;left:72px;top:64px;font:500 26px ui-monospace,Menlo,Consolas,monospace;color:#777}}
              h1{{position:absolute;left:72px;top:150px;width:540px;font-size:56px;line-height:1.1;font-weight:700;letter-spacing:-1.2px}}
              p{{position:absolute;left:72px;top:356px;width:440px;font-size:26px;line-height:1.4;color:#666}}
              .url{{position:absolute;left:72px;bottom:56px;font:500 24px ui-monospace,Menlo,Consolas,monospace;color:#141414}}
              .shot{{position:absolute;left:640px;top:96px;width:760px;border-radius:16px;border:1px solid #d8d8d4;box-shadow:0 24px 60px rgba(0,0,0,.16)}}
            </style>
            <div class="logo">mondial · sql</div>
            <h1>{c['h1']}</h1>
            <p>{c['sub']}</p>
            <div class="url">mondial-sql.pages.dev</div>
            <img class="shot" src="data:image/png;base64,{b64}">''')
            card.wait_for_timeout(300)
            card.screenshot(path=str(public / out))
            card.close()
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
