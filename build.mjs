// Baut die Website nach dist/ (Ausgabeordner für Cloudflare Pages).
//   node build.mjs                       → https://mondial-sql.pages.dev
//   SITE_URL=https://example.de node build.mjs
//
// Ablauf: Assets kopieren und bündeln, Aufgabenlösungen gegen die Datenbank prüfen,
// Startseite, Schema- und Aufgabenseite und 404 je Sprache (Deutsch unter /, Englisch unter /en/),
// dazu sitemap.xml, robots.txt und _headers schreiben.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';
import initSqlJs from 'sql.js';
import { SITE, MONDIAL, LICENSE_URL, HOME, FAQ, TABLE_INFO, TABLE_GROUPS } from './web/site.mjs';
import { LANGS, PATHS, UI } from './web/ui.mjs';
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
  read('src/i18n.js'),
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
const checkSolution = (id, sql) => {
  try {
    const res = db.exec(sql);
    if (!res.length || !res[res.length - 1].values.length) problems.push(`${id}: Lösung liefert keine Zeilen`);
  } catch (e) {
    problems.push(`${id}: ${e.message}`);
  }
};
for (const level of LEVELS) {
  if (!level.en) problems.push(`Stufe ${level.title}: englische Fassung fehlt`);
  for (const t of level.tasks) {
    checkSolution(t.id, t.solution);
    if (!t.en || !t.en.id) problems.push(`${t.id}: englische Fassung fehlt`);
    else if (t.en.solution) checkSolution(`${t.id} (en)`, t.en.solution);
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
const ER = new Function(read('src/er-data.js') + '\nreturn { ER_EDGES, edgeVia };')();
const grouped = new Set(TABLE_GROUPS.flatMap(g => g.tables));
const missing = Object.keys(TABLES).filter(t => !grouped.has(t));
if (missing.length) { console.error('Tabellen ohne Gruppe in web/site.mjs: ' + missing.join(', ')); process.exit(1); }
for (const L of LANGS) {
  const noInfo = Object.keys(TABLES).filter(t => !TABLE_INFO[L][t]);
  if (noInfo.length) { console.error(`Tabellen ohne Beschreibung (${L}) in web/site.mjs: ` + noInfo.join(', ')); process.exit(1); }
}

// ------------------------------------------------------------------ Bausteine
const other = (L) => (L === 'de' ? 'en' : 'de');
const pageUrl = (p) => `${SITE_URL}/${p}`;
const trainerLink = (L, sql) => '/' + PATHS.home[L] + '#q=' + encodeURIComponent(sql);
const pick = (L, obj) => ({ ...obj, ...(L === 'en' ? obj.en : {}) });   // Aufgabe/Stufe in Sprache L

// Automatische Sprachwahl, läuft vor allem anderen im <head>:
// Deutsch ist Standard. Auf deutschen Seiten geht es nach Englisch, wenn der Browser kein Deutsch
// bevorzugt (oder Englisch gewählt wurde). Auf englischen Seiten nur zurück, wenn jemand Deutsch gewählt hat.
// Crawler werden nie umgeleitet, damit beide Sprachfassungen indexiert werden.
function langRedirect(L, target, keepHash) {
  const cond = L === 'de'
    ? "var w=s;if(w!=='de'&&w!=='en'){var l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];w='en';for(var i=0;i<l.length;i++){var c=String(l[i]).slice(0,2).toLowerCase();if(c==='de'){w='de';break}if(c==='en')break}}if(w!=='en')return;"
    : "if(s!=='de')return;";
  return `<script>(function(){var s=null;try{s=localStorage.getItem('mondial-lang')}catch(e){}if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent||''))return;${cond}location.replace('/${target}'+location.search${keepHash ? '+location.hash' : ''})})();</script>`;
}

// alt: Seitenschlüssel aus PATHS (home, tasks, schema) für hreflang und Umschalter, oder null (404)
function head(L, { title, description, alt, path: p, jsonld, keepHash = false }) {
  const url = pageUrl(p);
  const ui = UI[L];
  const ld = jsonld ? `\n<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : '';
  const ogImage = `${SITE_URL}/${L === 'de' ? 'og.png' : 'og-en.png'}`;
  const alternates = alt ? `
<link rel="alternate" hreflang="de" href="${pageUrl(PATHS[alt].de)}">
<link rel="alternate" hreflang="en" href="${pageUrl(PATHS[alt].en)}">
<link rel="alternate" hreflang="x-default" href="${pageUrl(PATHS[alt].de)}">` : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">${alt ? '\n' + langRedirect(L, PATHS[alt][other(L)], keepHash) : ''}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="google-site-verification" content="r7uLQ8P6uCxjhFmRTjHVPOYxPbBk2Y86NVCqoM9Z-tU">
<link rel="canonical" href="${url}">${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:locale" content="${ui.locale}">
<meta property="og:locale:alternate" content="${UI[other(L)].locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ui.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141414" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script>(function(){var t=null;try{t=localStorage.getItem('mondial-theme')}catch(e){}if(t!=='dark'&&t!=='light'){t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();</script>
<link rel="stylesheet" href="${asset('assets/style.css')}">${ld}`;
}

function topbar(L, current, { tables = false, alt = null } = {}) {
  const ui = UI[L];
  const link = (key, label) =>
    `<a class="nav-link" href="/${PATHS[key][L]}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const o = other(L);
  const langHref = '/' + PATHS[alt || 'home'][o];
  return `  <nav class="topbar" aria-label="${ui.navAria}">
    <a class="brand" href="/${PATHS.home[L]}">${esc(SITE.logo)}</a>
    <div class="topbar-right">
      ${link('tasks', ui.navTasks)}
      ${link('schema', ui.navSchema)}
      <a class="nav-link" href="${langHref}" hreflang="${o}" lang="${o}" data-lang="${o}" title="${ui.langTitle}">${ui.langLink}</a>
      <button type="button" class="theme-toggle" id="theme-toggle"></button>${tables ? `
      <details class="tables-toggle">
        <summary>${ui.navTables}</summary>
        <div id="table-list" class="table-list"></div>
      </details>` : ''}
    </div>
  </nav>`;
}

function footer(L, { faq = false } = {}) {
  const f = UI[L].foot;
  const faqHtml = faq ? `
    <details>
      <summary>${f.faq}</summary>
${FAQ[L].map(x => `      <h3>${esc(x.q)}</h3>\n      <p>${esc(x.a)}</p>`).join('\n')}
    </details>` : '';
  return `  <footer class="site-foot">${faqHtml}
    <details>
      <summary>${f.about}</summary>
      ${f.aboutHtml(MONDIAL, LICENSE_URL[L])}
    </details>
    <details>
      <summary>${f.privacy}</summary>
      ${f.privacyHtml}
    </details>
    <span class="fine">${f.fineHtml(SITE, LICENSE_URL[L])}</span>
  </footer>`;
}

function page(L, { title, description, path: p, alt, jsonld, current, body, keepHash }) {
  return `<!DOCTYPE html>
<html lang="${L}">
<head>
${head(L, { title, description, alt, path: p, jsonld, keepHash })}
</head>
<body>
<main class="page">
${topbar(L, current, { alt })}

  <article class="doc">
${body}
  </article>

${footer(L)}
</main>
<script src="${asset('assets/theme.js')}"></script>
</body>
</html>
`;
}

const datasetLd = { '@type': 'Dataset', name: 'MONDIAL', creator: { '@type': 'Person', name: 'Wolfgang May' }, license: MONDIAL.license, url: MONDIAL.homepage };
const tableCount = Object.keys(TABLES).length;
const taskTotal = LEVELS.reduce((n, l) => n + l.tasks.length, 0);
const template = read('web/index.html');

for (const L of LANGS) {
  const ui = UI[L];

  // ---------------------------------------------------------------- Startseite
  const homeLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: SITE.name,
        url: pageUrl(PATHS.home[L]),
        description: HOME[L].description,
        inLanguage: L,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Browser',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        learningResourceType: ui.learningType,
        teaches: 'SQL',
        about: datasetLd,
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ[L].map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
  const vars = { lang: L, h1: HOME[L].h1, sub: HOME[L].sub, ...ui.app };
  const home = template
    .replace('<!--HEAD-->', head(L, { title: `${HOME[L].title} | ${SITE.name}`, description: HOME[L].description, alt: 'home', path: PATHS.home[L], jsonld: homeLd, keepHash: true }))
    .replace('<!--TOPBAR-->', topbar(L, 'home', { tables: true, alt: 'home' }))
    .replace('<!--FOOT-->', footer(L, { faq: true }))
    .replace('<!--SCRIPTS-->', [
      `<script src="${asset('assets/theme.js')}"></script>`,
      `<script src="${asset('assets/sql-formatter.js')}"></script>`,
      `<script src="${asset('vendor/sql-wasm.js')}"></script>`,
      `<script src="${asset('assets/app.js')}"></script>`,
    ].join('\n'))
    .replace(/\{\{(\w+)\}\}/g, (m, k) => {
      if (!(k in vars)) throw new Error(`Platzhalter {{${k}}} ohne Text (${L})`);
      return esc(vars[k]);
    });
  if (/<!--[A-Z]+-->/.test(home)) throw new Error('Platzhalter in index.html nicht ersetzt');
  emit(PATHS.home[L] + 'index.html', home);

  // ---------------------------------------------------------------- Schema-Seite
  const sx = ui.schema;
  const anchor = (t) => t.toLowerCase();
  const schemaBody = [];
  schemaBody.push(`    <h1>${esc(sx.h1)}</h1>
    <p class="lead">${sx.leadHtml(tableCount)}</p>
    <nav class="toc" aria-label="${sx.tocAria}">${TABLE_GROUPS.map((g, i) => `<a href="#${sx.groupAnchor}-${i + 1}">${esc(g.title[L])}</a>`).join('')}</nav>`);
  TABLE_GROUPS.forEach((g, gi) => {
    schemaBody.push(`\n    <h2 id="${sx.groupAnchor}-${gi + 1}">${esc(g.title[L])}</h2>`);
    for (const name of g.tables) {
      const t = TABLES[name];
      const out = ER.ER_EDGES.filter(e => e[0] === name);
      const inc = [...new Set(ER.ER_EDGES.filter(e => e[1] === name && e[0] !== name).map(e => e[0]))];
      const rel = [
        ...out.map(e => `<li>→ <a href="#${anchor(e[1])}">${esc(e[1])}</a>: ${esc(ER.edgeVia(e[2], L))}</li>`),
        inc.length ? `<li>← ${sx.referencedBy} ${inc.map(n => `<a href="#${anchor(n)}">${esc(n)}</a>`).join(', ')}</li>` : '',
      ].filter(Boolean).join('');
      schemaBody.push(`    <section class="card" id="${anchor(name)}">
      <h3>${esc(name)}</h3>
      <p class="meta">${t.rows.toLocaleString(ui.numberLocale)} ${sx.rows}${t.pk.length ? ` · ${sx.pk}: ${esc(t.pk.join(', '))}` : ''}</p>
      <p>${esc(TABLE_INFO[L][name])}</p>
      <table class="cols">
        <thead><tr><th>${sx.column}</th><th>${sx.type}</th></tr></thead>
        <tbody>${t.columns.map(c => `<tr><td>${esc(c.name)}${t.pk.includes(c.name) ? ` <span class="key" title="${sx.pkTitle}">PK</span>` : ''}</td><td class="type">${esc(c.type)}</td></tr>`).join('')}</tbody>
      </table>${rel ? `\n      <ul class="rel">${rel}</ul>` : ''}
      <div class="actions"><a href="${trainerLink(L, `SELECT *\nFROM ${name}\nLIMIT 20;`)}">${sx.open}</a></div>
    </section>`);
    }
  });
  emit(PATHS.schema[L] + 'index.html', page(L, {
    title: `${sx.title(tableCount)} | ${SITE.name}`,
    description: sx.description(tableCount),
    path: PATHS.schema[L], alt: 'schema', current: 'schema', keepHash: true, body: schemaBody.join('\n'),
    jsonld: {
      '@context': 'https://schema.org', '@type': 'TechArticle',
      headline: sx.h1, inLanguage: L, url: pageUrl(PATHS.schema[L]), about: datasetLd,
    },
  }));

  // ---------------------------------------------------------------- Aufgaben-Seite
  const tx = ui.tasks;
  const levels = LEVELS.map(l => ({ ...pick(L, l), tasks: l.tasks.map(t => pick(L, t)) }));
  const tasksBody = [];
  tasksBody.push(`    <h1>${esc(tx.h1)}</h1>
    <p class="lead">${tx.leadHtml(taskTotal)}</p>
    <nav class="toc" aria-label="${tx.tocAria}">${levels.map((l, i) => `<a href="#${tx.levelAnchor}-${i + 1}">${esc(l.title)}</a>`).join('')}</nav>`);
  levels.forEach((l, li) => {
    tasksBody.push(`\n    <h2 id="${tx.levelAnchor}-${li + 1}">${esc(l.title)}</h2>\n    <p class="sub">${esc(l.intro)}</p>`);
    for (const t of l.tasks) {
      const start = `-- ${tx.comment}: ${t.task}\n\n`;
      tasksBody.push(`    <section class="card" id="${t.id}">
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.task)}</p>
      <details><summary>${tx.hint}</summary><p class="note">${esc(t.hint)}</p></details>
      <details><summary>${tx.solution}</summary><pre><code>${esc(t.solution)}</code></pre>${t.note ? `<p class="note">${esc(t.note)}</p>` : ''}</details>
      <div class="actions"><a href="${trainerLink(L, start)}">${tx.solve}</a><a href="${trainerLink(L, t.solution)}">${tx.openSolution}</a></div>
    </section>`);
    }
  });
  emit(PATHS.tasks[L] + 'index.html', page(L, {
    title: `${tx.title} | ${SITE.name}`,
    description: tx.description(taskTotal),
    path: PATHS.tasks[L], alt: 'tasks', current: 'tasks', body: tasksBody.join('\n'),
    jsonld: {
      '@context': 'https://schema.org', '@type': 'LearningResource',
      name: tx.ldName, inLanguage: L, url: pageUrl(PATHS.tasks[L]),
      learningResourceType: tx.ldType, teaches: tx.ldTeaches, isAccessibleForFree: true,
      hasPart: levels.flatMap(l => l.tasks.map(t => ({ '@type': 'LearningResource', name: t.title, url: `${pageUrl(PATHS.tasks[L])}#${t.id}` }))),
    },
  }));

  // ---------------------------------------------------------------- 404 (Cloudflare nimmt die nächstgelegene 404.html)
  const nf = ui.notFound;
  emit(PATHS.home[L] + '404.html', page(L, {
    title: `${nf.title} | ${SITE.name}`, description: nf.description, path: PATHS.home[L] + '404', alt: null, current: '',
    body: `    <h1>${esc(nf.title)}</h1>
    <p class="lead">${esc(nf.lead)}</p>
    <p><a href="/${PATHS.home[L]}">${esc(nf.back)}</a> · <a href="/${PATHS.tasks[L]}">${esc(ui.navTasks)}</a> · <a href="/${PATHS.schema[L]}">${esc(ui.navSchema)}</a></p>`,
  }).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">'));
}

// ------------------------------------------------------------------ sitemap, robots, headers
const sitemapEntries = Object.values(PATHS).flatMap(p => LANGS.map(L => `  <url>
    <loc>${pageUrl(p[L])}</loc>
    <lastmod>${TODAY}</lastmod>
${LANGS.map(x => `    <xhtml:link rel="alternate" hreflang="${x}" href="${pageUrl(p[x])}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(p.de)}"/>
  </url>`));
emit('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapEntries.join('\n')}
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
console.log(`  ${tableCount} Tabellen, ${taskTotal} Aufgaben geprüft, Sprachen: ${LANGS.join(', ')}`);
