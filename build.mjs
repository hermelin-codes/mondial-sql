// Baut die Website nach dist/ (Ausgabeordner für Cloudflare Pages).
//   node build.mjs                       → https://mondial-sql.pages.dev
//   SITE_URL=https://example.de node build.mjs
//
// Ablauf: Assets kopieren und bündeln, Aufgabenlösungen gegen die Datenbank prüfen,
// Startseite, Schema- und Aufgabenseite, 404, sitemap.xml, robots.txt und _headers schreiben.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';
import initSqlJs from 'sql.js';
import { SITE, MONDIAL, HOME, FAQ, TABLE_INFO, TABLE_GROUPS } from './web/site.mjs';
import { LEVELS } from './web/aufgaben.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const SITE_URL = (process.env.SITE_URL || SITE.url).replace(/\/+$/, '');
const TODAY = new Date().toISOString().slice(0, 10);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

// ------------------------------------------------------------------ dist vorbereiten
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'web/public'), OUT, { recursive: true });

const versions = {};
function emit(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  versions[rel] = hash(typeof content === 'string' ? Buffer.from(content) : content);
}
// Versionierte URL, damit Browser und Cloudflare Dateien lange cachen dürfen
const asset = (rel) => `/${rel}?v=${versions[rel]}`;

// ------------------------------------------------------------------ Assets
const sqlJsDir = path.dirname(require.resolve('sql.js/dist/sql-wasm.js'));
emit('vendor/sql-wasm.js', fs.readFileSync(path.join(sqlJsDir, 'sql-wasm.js')));
emit('vendor/sql-wasm.wasm', fs.readFileSync(path.join(sqlJsDir, 'sql-wasm.wasm')));
const dbBytes = fs.readFileSync(path.join(ROOT, 'data/mondial.sqlite'));
emit('data/mondial.sqlite', dbBytes);

const css = await esbuild.transform(read('web/style.css'), { loader: 'css', minify: true });
emit('assets/style.css', css.code);

const fmt = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/formatter.js')],
  bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none',
  banner: { js: '/*! sql-formatter (nur SQLite-Dialekt) | MIT License | https://github.com/sql-formatter-org/sql-formatter */' },
});
emit('assets/sql-formatter.js', fmt.outputFiles[0].contents);

const theme = await esbuild.transform(read('src/theme.js'), { minify: true });
emit('assets/theme.js', theme.code);

const schemaText = read('data/schema.sql');
const assetUrls = {
  'sql-wasm.wasm': asset('vendor/sql-wasm.wasm'),
  'mondial.sqlite': asset('data/mondial.sqlite'),
};
const appSource = [
  `const SCHEMA_TEXT = ${JSON.stringify(schemaText)};`,
  `const ASSET_URLS = ${JSON.stringify(assetUrls)};`,
  read('src/er-data.js'),
  read('src/app.js'),
].join('\n');
const app = await esbuild.transform(appSource, { minify: true });
emit('assets/app.js', app.code);

// ------------------------------------------------------------------ Datenbank: Zeilen zählen, Aufgaben prüfen
const SQL = await initSqlJs();
const db = new SQL.Database(dbBytes);
const rowCount = (t) => db.exec(`SELECT COUNT(*) FROM "${t}"`)[0].values[0][0];

const problems = [];
for (const level of LEVELS) {
  for (const t of level.tasks) {
    try {
      const res = db.exec(t.solution);
      if (!res.length || !res[res.length - 1].values.length) problems.push(`${t.id}: Lösung liefert keine Zeilen`);
    } catch (e) {
      problems.push(`${t.id}: ${e.message}`);
    }
  }
}
if (problems.length) {
  console.error('Aufgaben mit fehlerhafter Lösung:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// ------------------------------------------------------------------ Schema parsen
function splitTopLevel(body) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
const TABLES = {};
for (const m of schemaText.matchAll(/CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi)) {
  const [, name, body] = m;
  const columns = []; let pk = [];
  for (const part of splitTopLevel(body)) {
    const p = part.replace(/\s+/g, ' ');
    const tablePk = p.match(/^(?:CONSTRAINT \w+ )?PRIMARY KEY \(([^)]*)\)/i);
    if (tablePk) { pk = tablePk[1].split(',').map(s => s.trim()); continue; }
    if (/^(CONSTRAINT|UNIQUE|CHECK|FOREIGN)\b/i.test(p)) continue;
    const [col, type = ''] = p.split(' ');
    columns.push({ name: col, type: type.replace(/VARCHAR2?/i, 'TEXT').replace(/^NUMBER$/i, 'NUMBER') });
    if (/PRIMARY KEY/i.test(p)) pk.push(col);
  }
  TABLES[name] = { name, columns, pk, rows: rowCount(name) };
}
const ER = new Function(read('src/er-data.js') + '\nreturn { ER_EDGES };')();
const grouped = new Set(TABLE_GROUPS.flatMap(g => g.tables));
const missing = Object.keys(TABLES).filter(t => !grouped.has(t));
if (missing.length) { console.error('Tabellen ohne Gruppe in web/site.mjs: ' + missing.join(', ')); process.exit(1); }

// ------------------------------------------------------------------ Bausteine
const trainerLink = (sql) => '/#q=' + encodeURIComponent(sql);

function head({ title, description, path: p, jsonld }) {
  const url = `${SITE_URL}/${p}`;
  const ld = jsonld ? `\n<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:locale" content="de_DE">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="SQL-Editor mit Ergebnistabelle und ER-Diagramm der Mondial-Datenbank">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141414" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script>(function(){var t=null;try{t=localStorage.getItem('mondial-theme')}catch(e){}if(t!=='dark'&&t!=='light'){t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();</script>
<link rel="stylesheet" href="${asset('assets/style.css')}">${ld}`;
}

function topbar(current, { tables = false } = {}) {
  const link = (href, label, id) =>
    `<a class="nav-link" href="${href}"${current === id ? ' aria-current="page"' : ''}>${label}</a>`;
  return `  <nav class="topbar" aria-label="Hauptnavigation">
    <a class="brand" href="/">${esc(SITE.logo)}</a>
    <div class="topbar-right">
      ${link('/aufgaben/', 'Aufgaben', 'aufgaben')}
      ${link('/schema/', 'Schema', 'schema')}
      <button type="button" class="theme-toggle" id="theme-toggle"></button>${tables ? `
      <details class="tables-toggle">
        <summary>Tabellen</summary>
        <div id="table-list" class="table-list"></div>
      </details>` : ''}
    </div>
  </nav>`;
}

function footer({ faq = false } = {}) {
  const faqHtml = faq ? `
    <details>
      <summary>Häufige Fragen</summary>
${FAQ.map(f => `      <h3>${esc(f.q)}</h3>\n      <p>${esc(f.a)}</p>`).join('\n')}
    </details>` : '';
  return `  <footer class="site-foot">${faqHtml}
    <details>
      <summary>Über die Daten</summary>
      <p>Die Daten stammen aus der <a href="${MONDIAL.homepage}" target="_blank" rel="noopener">MONDIAL-Datenbank</a> von Wolfgang May (Institut für Informatik, Universität Göttingen) und stehen unter der Lizenz <a href="${MONDIAL.license}" target="_blank" rel="noopener">CC BY 3.0</a>. Diese Seite nutzt eine SQLite-Fassung der Daten, Grundlage ist <a href="${MONDIAL.copy}" target="_blank" rel="noopener">github.com/ullenboom/mondial-database</a>.</p>
      <p>Zitiervorschlag des Autors: Wolfgang May, <i>Information Extraction and Integration with Florid: The Mondial Case Study</i>, Technical Report 131, Universität Freiburg, 1999.</p>
      <p>Die Zahlen stammen aus verschiedenen Jahren und Quellen (unter anderem CIA World Factbook). Sie eignen sich zum Üben von SQL, nicht als aktuelle Statistik.</p>
    </details>
    <details>
      <summary>Datenschutz</summary>
      <p>Die Seite setzt keine Cookies und lädt nichts von fremden Servern. Deine Abfragen werden nur in deinem Browser ausgeführt. Der Verlauf und die Einstellung hell/dunkel liegen im lokalen Speicher deines Browsers und verlassen dein Gerät nicht.</p>
      <p>Klickst du auf „ChatGPT fragen“ oder „Claude fragen“, öffnet sich die Seite des jeweiligen Anbieters mit deiner Abfrage. Ab da gelten dessen Datenschutzbestimmungen. Die Seite selbst wird über Cloudflare Pages ausgeliefert.</p>
    </details>
    <span class="fine">Kostenlos und Open Source · <a href="${SITE.repo}" target="_blank" rel="noopener">GitHub</a> · Daten: MONDIAL von Wolfgang May, <a href="${MONDIAL.license}" target="_blank" rel="noopener">CC BY 3.0</a> · Unabhängiges Projekt, nicht verbunden mit der Universität Göttingen</span>
  </footer>`;
}

function page({ title, description, path: p, jsonld, current, body }) {
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
${head({ title, description, path: p, jsonld })}
</head>
<body>
<main class="page">
${topbar(current)}

  <article class="doc">
${body}
  </article>

${footer()}
</main>
<script src="${asset('assets/theme.js')}"></script>
</body>
</html>
`;
}

// ------------------------------------------------------------------ Startseite
const homeLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: SITE.name,
      url: `${SITE_URL}/`,
      description: HOME.description,
      inLanguage: 'de',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Browser',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      learningResourceType: 'Übungsumgebung',
      teaches: 'SQL',
      about: { '@type': 'Dataset', name: 'MONDIAL', creator: { '@type': 'Person', name: 'Wolfgang May' }, license: MONDIAL.license, url: MONDIAL.homepage },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
};
let home = read('web/index.html')
  .replace('<!--HEAD-->', head({ title: `${HOME.title} | ${SITE.name}`, description: HOME.description, path: '', jsonld: homeLd }))
  .replace('<!--TOPBAR-->', topbar('home', { tables: true }))
  .replace('{{h1}}', esc(HOME.h1))
  .replace('{{sub}}', esc(HOME.sub))
  .replace('<!--FOOT-->', footer({ faq: true }))
  .replace('<!--SCRIPTS-->', [
    `<script src="${asset('assets/theme.js')}"></script>`,
    `<script src="${asset('assets/sql-formatter.js')}"></script>`,
    `<script src="${asset('vendor/sql-wasm.js')}"></script>`,
    `<script src="${asset('assets/app.js')}"></script>`,
  ].join('\n'));
if (/\{\{|<!--[A-Z]+-->/.test(home)) throw new Error('Platzhalter in index.html nicht ersetzt');
emit('index.html', home);

// ------------------------------------------------------------------ Schema-Seite
const tableCount = Object.keys(TABLES).length;
const anchor = (t) => t.toLowerCase();
const schemaBody = [];
schemaBody.push(`    <h1>Mondial-Datenbank: Schema und Tabellen</h1>
    <p class="lead">Alle ${tableCount} Tabellen der MONDIAL-Datenbank mit Spalten, Primärschlüsseln und Verknüpfungen. Über „Im Trainer öffnen“ schaust du dir jede Tabelle direkt im SQL-Trainer an.</p>
    <nav class="toc" aria-label="Gruppen">${TABLE_GROUPS.map((g, i) => `<a href="#gruppe-${i + 1}">${esc(g.title)}</a>`).join('')}</nav>`);
TABLE_GROUPS.forEach((g, gi) => {
  schemaBody.push(`\n    <h2 id="gruppe-${gi + 1}">${esc(g.title)}</h2>`);
  for (const name of g.tables) {
    const t = TABLES[name];
    const out = ER.ER_EDGES.filter(e => e[0] === name);
    const inc = [...new Set(ER.ER_EDGES.filter(e => e[1] === name && e[0] !== name).map(e => e[0]))];
    const rel = [
      ...out.map(e => `<li>→ <a href="#${anchor(e[1])}">${esc(e[1])}</a>: ${esc(e[2])}</li>`),
      inc.length ? `<li>← wird referenziert von ${inc.map(n => `<a href="#${anchor(n)}">${esc(n)}</a>`).join(', ')}</li>` : '',
    ].filter(Boolean).join('');
    schemaBody.push(`    <section class="card" id="${anchor(name)}">
      <h3>${esc(name)}</h3>
      <p class="meta">${t.rows.toLocaleString('de-DE')} Zeilen${t.pk.length ? ` · Primärschlüssel: ${esc(t.pk.join(', '))}` : ''}</p>
      <p>${esc(TABLE_INFO[name] || '')}</p>
      <table class="cols">
        <thead><tr><th>Spalte</th><th>Typ</th></tr></thead>
        <tbody>${t.columns.map(c => `<tr><td>${esc(c.name)}${t.pk.includes(c.name) ? ' <span class="key" title="Teil des Primärschlüssels">PK</span>' : ''}</td><td class="type">${esc(c.type)}</td></tr>`).join('')}</tbody>
      </table>${rel ? `\n      <ul class="rel">${rel}</ul>` : ''}
      <div class="actions"><a href="${trainerLink(`SELECT *\nFROM ${name}\nLIMIT 20;`)}">Im Trainer öffnen →</a></div>
    </section>`);
  }
});
const schemaLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Mondial-Datenbank: Schema und Tabellen',
  inLanguage: 'de',
  url: `${SITE_URL}/schema/`,
  about: { '@type': 'Dataset', name: 'MONDIAL', creator: { '@type': 'Person', name: 'Wolfgang May' }, license: MONDIAL.license, url: MONDIAL.homepage },
};
emit('schema/index.html', page({
  title: `Mondial-Datenbank Schema: alle ${tableCount} Tabellen und Spalten | ${SITE.name}`,
  description: `Das Schema der MONDIAL-Datenbank: alle ${tableCount} Tabellen wie Country, City, Province, River und borders mit Spalten, Primärschlüsseln und Verknüpfungen.`,
  path: 'schema/', jsonld: schemaLd, current: 'schema', body: schemaBody.join('\n'),
}));

// ------------------------------------------------------------------ Aufgaben-Seite
const taskTotal = LEVELS.reduce((n, l) => n + l.tasks.length, 0);
const tasksBody = [];
tasksBody.push(`    <h1>SQL-Übungsaufgaben mit Lösungen</h1>
    <p class="lead">${taskTotal} Aufgaben zur MONDIAL-Datenbank, vom einfachen SELECT bis zur korrelierten Unterabfrage. Jede Aufgabe hat einen Hinweis und eine geprüfte Musterlösung. „Im Trainer lösen“ öffnet die Aufgabe direkt im Editor.</p>
    <nav class="toc" aria-label="Schwierigkeit">${LEVELS.map((l, i) => `<a href="#stufe-${i + 1}">${esc(l.title)}</a>`).join('')}</nav>`);
LEVELS.forEach((l, li) => {
  tasksBody.push(`\n    <h2 id="stufe-${li + 1}">${esc(l.title)}</h2>\n    <p class="sub">${esc(l.intro)}</p>`);
  for (const t of l.tasks) {
    const start = `-- Aufgabe: ${t.task}\n\n`;
    tasksBody.push(`    <section class="card" id="${t.id}">
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.task)}</p>
      <details><summary>Hinweis</summary><p class="note">${esc(t.hint)}</p></details>
      <details><summary>Lösung</summary><pre><code>${esc(t.solution)}</code></pre>${t.note ? `<p class="note">${esc(t.note)}</p>` : ''}</details>
      <div class="actions"><a href="${trainerLink(start)}">Im Trainer lösen →</a><a href="${trainerLink(t.solution)}">Lösung im Trainer öffnen</a></div>
    </section>`);
  }
});
const tasksLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'SQL-Übungsaufgaben zur Mondial-Datenbank',
  inLanguage: 'de',
  url: `${SITE_URL}/aufgaben/`,
  learningResourceType: 'Übungsaufgaben',
  teaches: 'SQL: SELECT, WHERE, JOIN, GROUP BY, HAVING, Unterabfragen',
  isAccessibleForFree: true,
  hasPart: LEVELS.flatMap(l => l.tasks.map(t => ({ '@type': 'LearningResource', name: t.title, url: `${SITE_URL}/aufgaben/#${t.id}` }))),
};
emit('aufgaben/index.html', page({
  title: `SQL-Übungsaufgaben mit Lösungen zur Mondial-Datenbank | ${SITE.name}`,
  description: `${taskTotal} SQL-Aufgaben zur MONDIAL-Datenbank mit Hinweisen und Lösungen: SELECT, JOIN, GROUP BY, HAVING und Unterabfragen. Direkt im Browser lösen.`,
  path: 'aufgaben/', jsonld: tasksLd, current: 'aufgaben', body: tasksBody.join('\n'),
}));

// ------------------------------------------------------------------ 404
const notFound = page({
  title: `Seite nicht gefunden | ${SITE.name}`,
  description: 'Diese Seite gibt es nicht.',
  path: '404', current: '',
  body: `    <h1>Seite nicht gefunden</h1>
    <p class="lead">Diese Adresse gibt es nicht (mehr).</p>
    <p><a href="/">Zum SQL-Trainer</a> · <a href="/aufgaben/">Aufgaben</a> · <a href="/schema/">Schema</a></p>`,
}).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">');
emit('404.html', notFound);

// ------------------------------------------------------------------ sitemap, robots, headers
const urls = ['', 'aufgaben/', 'schema/'];
emit('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`);
emit('robots.txt', `# Alle Crawler sind willkommen, auch Suchmaschinen und KI-Assistenten.
User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);
emit('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/vendor/*
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=31536000, immutable
`);

const size = (rel) => (fs.statSync(path.join(OUT, rel)).size / 1024).toFixed(0) + ' KB';
console.log(`dist/ gebaut für ${SITE_URL}`);
console.log(`  index.html ${size('index.html')}, app.js ${size('assets/app.js')}, Datenbank ${size('data/mondial.sqlite')}`);
console.log(`  ${tableCount} Tabellen, ${taskTotal} Aufgaben geprüft`);
