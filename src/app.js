let db = null;
let ALL_TABLE_NAMES = [];
let TABLE_COLUMNS = {};
let expandedTables = new Set();
let erZoom = 1, erPanX = 0, erPanY = 0;

function parseSchema(schemaText) {
  const tables = [];
  const tableRegex = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = tableRegex.exec(schemaText)) !== null) {
    const name = match[1];
    const body = match[2];
    const cols = [];
    let depth = 0, cur = '';
    for (const ch of body) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) cols.push(cur);
    const colNames = [];
    for (const c of cols) {
      const t = c.trim();
      if (/^PRIMARY KEY/i.test(t) || /^UNIQUE/i.test(t) || /^CONSTRAINT/i.test(t)) continue;
      const m2 = t.match(/^(\w+)\s+([\w()]+)/);
      if (m2) colNames.push(m2[1] + ' ' + m2[2]);
    }
    tables.push({ name, columns: colNames });
  }
  return tables;
}

function renderTableList(tables) {
  const container = document.getElementById('table-list');
  tables.sort((a, b) => a.name.localeCompare(b.name));
  for (const t of tables) {
    const details = document.createElement('details');
    details.className = 'table-entry';
    const summary = document.createElement('summary');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = t.name;
    nameSpan.className = 'tname';
    summary.appendChild(nameSpan);
    const insertBtn = document.createElement('button');
    insertBtn.className = 'insert-btn';
    insertBtn.textContent = 'SELECT';
    insertBtn.title = 'SELECT * FROM ' + t.name + ' einfügen';
    insertBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('sql-input').value = 'SELECT * FROM ' + t.name + ' LIMIT 20;';
      syncEditor();
      document.querySelector('.tables-toggle').removeAttribute('open');
    };
    summary.appendChild(insertBtn);
    details.appendChild(summary);
    const colsDiv = document.createElement('div');
    colsDiv.className = 'cols';
    colsDiv.textContent = t.columns.join(', ');
    details.appendChild(colsDiv);
    container.appendChild(details);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderResults(results) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  if (!results || results.length === 0) {
    const p = document.createElement('div');
    p.className = 'status-line';
    p.style.display = 'block';
    p.textContent = 'Abfrage erfolgreich ausgeführt, keine Ergebniszeilen.';
    container.appendChild(p);
    return;
  }
  results.forEach((res, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'result-set';
    const h3 = document.createElement('h3');
    const maxRows = 500;
    const shown = Math.min(res.values.length, maxRows);
    h3.textContent = results.length > 1
      ? 'Ergebnis ' + (idx + 1) + ', ' + res.values.length + ' Zeile(n)'
      : res.values.length + ' Zeile(n)';
    wrap.appendChild(h3);
    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'table-scroll';
    const table = document.createElement('table');
    table.className = 'result-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    res.columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (let i = 0; i < shown; i++) {
      const tr = document.createElement('tr');
      res.values[i].forEach(val => {
        const td = document.createElement('td');
        td.textContent = val === null ? 'NULL' : String(val);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    scrollDiv.appendChild(table);
    wrap.appendChild(scrollDiv);
    if (res.values.length > maxRows) {
      const note = document.createElement('div');
      note.className = 'truncate-note';
      note.textContent = (res.values.length - maxRows) + ' weitere Zeile(n) ausgeblendet.';
      wrap.appendChild(note);
    }
    container.appendChild(wrap);
  });
}

function showError(query, message) {
  const errorArea = document.getElementById('error-area');
  errorArea.innerHTML = '';
  const msg = document.createElement('div');
  msg.className = 'error-msg';
  msg.textContent = message;
  errorArea.appendChild(msg);
  const hint = buildSuggestion(query, message);
  if (hint) errorArea.appendChild(hint);
}

// ---------- "Meintest du …?" nach einem Fehler (nur beim Ausführen, nie beim Tippen) ----------
const SQLITE_FUNCS = ['abs', 'avg', 'cast', 'char', 'coalesce', 'count', 'date', 'datetime', 'group_concat',
  'hex', 'ifnull', 'iif', 'instr', 'julianday', 'length', 'like', 'lower', 'ltrim', 'max', 'min', 'nullif',
  'printf', 'random', 'replace', 'round', 'rtrim', 'sign', 'strftime', 'substr', 'substring', 'sum', 'time',
  'total', 'trim', 'typeof', 'upper', 'row_number', 'rank', 'dense_rank', 'lag', 'lead'];
// Funktionen aus anderen Dialekten (v. a. Oracle) und ihre SQLite-Entsprechung
const FUNC_EQUIVALENTS = { nvl: 'IFNULL', len: 'LENGTH' };
const SQL_SUGGEST_KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT', 'DISTINCT',
  'JOIN', 'INNER', 'LEFT', 'OUTER', 'CROSS', 'NATURAL', 'ON', 'USING', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
  'BETWEEN', 'LIKE', 'IS', 'NULL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'UNION', 'INTERSECT',
  'EXCEPT', 'WITH', 'ALL', 'OFFSET'];

function editDistance(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // vertauschte Nachbarbuchstaben zaehlen nur als ein Fehler
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Kandidaten nach Aehnlichkeit; bevorzugte Kandidaten gewinnen bei Gleichstand
function closestNames(word, candidates, preferred) {
  const limit = Math.max(1, Math.floor(word.length / 3));
  const seen = new Set();
  const scored = [];
  for (const c of candidates) {
    const key = c.toLowerCase();
    if (seen.has(key) || key === word.toLowerCase()) continue;
    seen.add(key);
    const dist = editDistance(word, c);
    if (dist <= limit) scored.push({ c, dist, pref: preferred && preferred.has(key) ? 0 : 1 });
  }
  scored.sort((x, y) => x.dist - y.dist || x.pref - y.pref || x.c.localeCompare(y.c));
  return scored.slice(0, 3).map(s => s.c);
}

function columnName(def) {
  const i = def.indexOf(' ');
  return i === -1 ? def : def.slice(0, i);
}

function buildSuggestion(query, message) {
  let m, wrong, options = [], kind = '';

  if ((m = message.match(/no such column: (.+)$/i))) {
    wrong = m[1].trim();
    const dot = wrong.lastIndexOf('.');
    const col = dot === -1 ? wrong : wrong.slice(dot + 1);
    const prefix = dot === -1 ? '' : wrong.slice(0, dot + 1);
    const usedTables = tablesInQuery(query);
    const preferred = new Set();
    usedTables.forEach(t => (TABLE_COLUMNS[t] || []).forEach(c => preferred.add(columnName(c).toLowerCase())));
    const all = [];
    Object.values(TABLE_COLUMNS).forEach(cols => cols.forEach(c => all.push(columnName(c))));
    options = closestNames(col, all, preferred).map(c => prefix + c);
    kind = 'Spalte';
    if (!options.length && usedTables.length) {
      const inTables = usedTables.map(t => t + ': ' + (TABLE_COLUMNS[t] || []).map(columnName).join(', '));
      return makeHint(null, null, 'Spalten der benutzten Tabellen, ' + inTables.join(' · '));
    }
  } else if ((m = message.match(/no such table: (.+)$/i))) {
    wrong = m[1].trim().replace(/^main\./i, '');
    options = closestNames(wrong, ALL_TABLE_NAMES);
    kind = 'Tabelle';
  } else if ((m = message.match(/no such function: (.+)$/i))) {
    wrong = m[1].trim();
    const known = FUNC_EQUIVALENTS[wrong.toLowerCase()];
    options = known ? [known] : closestNames(wrong, SQLITE_FUNCS).map(f => f.toUpperCase());
    kind = 'Funktion';
  } else if (/syntax error/i.test(message)) {
    // SQLite meldet oft das Wort NACH dem Tippfehler ("SELECT Name FORM Country" -> near "Country"),
    // weil es "FORM" fuer einen Alias haelt. Daher alle Woerter der Abfrage gegen Schluesselwoerter pruefen.
    const known = new Set(ALL_TABLE_NAMES.map(t => t.toLowerCase()));
    Object.values(TABLE_COLUMNS).forEach(cols => cols.forEach(c => known.add(columnName(c).toLowerCase())));
    SQLITE_FUNCS.forEach(f => known.add(f));
    const words = query.replace(/'(?:[^']|'')*'?|"(?:[^"]|"")*"?|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g, ' ')
                       .match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    for (const w of words) {
      if (w.length < 4 || known.has(w.toLowerCase()) || SQL_SUGGEST_KEYWORDS.includes(w.toUpperCase())) continue;
      const hit = closestNames(w, SQL_SUGGEST_KEYWORDS);
      if (hit.length && editDistance(w, hit[0]) <= (w.length >= 6 ? 2 : 1)) {
        wrong = w; options = [hit[0]]; kind = 'Schlüsselwort';
        break;
      }
    }
  }
  if (!options.length) return null;
  return makeHint(wrong, options, null, kind);
}

function makeHint(wrong, options, plainText, kind) {
  const div = document.createElement('div');
  div.className = 'suggest';
  if (plainText) {
    div.innerHTML = '<span class="muted">' + escapeHtml(plainText) + '</span>';
    return div;
  }
  div.appendChild(document.createTextNode('Meintest du '));
  options.forEach((opt, i) => {
    if (i > 0) div.appendChild(document.createTextNode(i === options.length - 1 ? ' oder ' : ', '));
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = opt;
    b.title = '„' + wrong + '“ durch „' + opt + '“ ersetzen';
    b.onclick = () => replaceInEditor(wrong, opt);
    div.appendChild(b);
  });
  div.appendChild(document.createTextNode('?'));
  const note = document.createElement('span');
  note.className = 'muted';
  note.textContent = '  (' + kind + ' antippen zum Ersetzen)';
  div.appendChild(note);
  return div;
}

function replaceInEditor(wrong, right) {
  const ta = document.getElementById('sql-input');
  const esc = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(^|[^A-Za-z0-9_])' + esc + '(?![A-Za-z0-9_])', 'gi');
  ta.value = ta.value.replace(re, (all, pre) => pre + right);
  syncEditor();
  updateViz(ta.value);
  ta.focus();
}

// ---------- Visualisierung: Tabellenbeziehungen & Abfrage-Ablauf ----------

// Spalten-Layout nach dem Mondial-III Referential-Dependencies-Diagramm.
// Reihenfolge = von oben nach unten wie im PDF.
function edgeKey(a, b) { return a + '||' + b; }

// Geometrie-Konstanten
const ER_BOX_W = 132;
const ER_COL_X = [4, 170, 336, 502];   // linke Kante je Spalte
const ER_TOP = 8;
const ER_HEAD_H = 22;
const ER_ROW_H = 12.5;
const ER_GAP = 8;
const ER_VIEWBOX = { w: 640, h: 380 };

// Positionen dynamisch berechnen (abhängig davon, welche Tabellen ausgeklappt sind).
function computeLayout(expandedSet) {
  const pos = {};
  let maxBottom = 0;
  ER_COLUMNS.forEach((col, ci) => {
    let y = ER_TOP;
    const x = ER_COL_X[ci];
    for (const name of col) {
      const cols = TABLE_COLUMNS[name] || [];
      const isOpen = expandedSet.has(name);
      const h = isOpen ? ER_HEAD_H + cols.length * ER_ROW_H + 6 : ER_HEAD_H;
      pos[name] = { x, y, w: ER_BOX_W, h, col: ci, open: isOpen };
      y += h + ER_GAP;
    }
    maxBottom = Math.max(maxBottom, y);
  });
  return { pos, maxBottom };
}

function erTransform() {
  const cx = ER_VIEWBOX.w / 2, cy = ER_VIEWBOX.h / 2;
  return `translate(${cx + erPanX},${cy + erPanY}) scale(${erZoom}) translate(${-cx},${-cy})`;
}

function applyErTransform() {
  const g = document.getElementById('er-viewport');
  if (g) g.setAttribute('transform', erTransform());
}

function extractUsedTablesHeuristic(sql, allNames) {
  // Fallback (z. B. während des Tippens, solange die Query noch nicht lauffähig ist):
  // Nur Tabellen aus der FROM-/JOIN-Klausel gelten als benutzt.
  // Spalten wie c.population oder p.country dürfen NICHT als Tabelle zählen,
  // auch wenn sie zufällig wie ein Tabellenname heißen.
  const text = sql || '';
  const lowerToName = {};
  allNames.forEach(n => { lowerToName[n.toLowerCase()] = n; });

  // Erste FROM-Klausel bis zum nächsten Top-Level-Schlüsselwort isolieren.
  const fromMatch = text.match(/\bFROM\b([\s\S]*?)(?:\bWHERE\b|\bGROUP\s+BY\b|\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|\bUNION\b|\bEXCEPT\b|\bINTERSECT\b|;|$)/i);
  if (!fromMatch) return [];
  const fromClause = fromMatch[1];

  const result = [];
  const addName = (raw) => {
    const nm = lowerToName[(raw || '').toLowerCase()];
    if (nm && !result.includes(nm)) result.push(nm);
  };

  // An JOIN-Schlüsselwörtern trennen; ON-/USING-Bedingungen enthalten nur Spalten.
  const segments = fromClause.split(/\b(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+|CROSS\s+|OUTER\s+|NATURAL\s+)*JOIN\b/i);
  for (let seg of segments) {
    seg = seg.replace(/\bON\b[\s\S]*$/i, ' ').replace(/\bUSING\b\s*\([^)]*\)/gi, ' ');
    // Komma-getrennte Tabellenreferenzen: "province p, city c"
    for (const ref of seg.split(',')) {
      const t = ref.trim();
      if (!t || t.startsWith('(')) continue; // Subqueries überspringen
      const m = t.match(/^["'`]?([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) addName(m[1]);
    }
  }
  return result;
}

function buildAliasMap(sql, allNames) {
  // SQLite gibt im Query-Plan bei Aliasen nur den Alias aus (z.B. "SCAN p" statt "SCAN Province").
  // Diese Map löst Alias -> echter Tabellenname auf, damit der Plan trotzdem richtig gelesen wird.
  const KEYWORDS = new Set([
    'where', 'group', 'by', 'order', 'having', 'join', 'inner', 'left', 'right', 'full',
    'outer', 'cross', 'natural', 'on', 'using', 'as', 'select', 'from', 'union', 'except',
    'intersect', 'limit', 'set', 'values', 'and', 'or', 'not', 'desc', 'asc',
  ]);
  const map = {};
  allNames.forEach(n => { map[n.toLowerCase()] = n; });
  for (const name of allNames) {
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b(?:\\s+AS)?\\s+([A-Za-z_][A-Za-z0-9_]*)', 'gi');
    let m;
    while ((m = re.exec(sql)) !== null) {
      const alias = m[1];
      if (KEYWORDS.has(alias.toLowerCase())) continue;
      map[alias.toLowerCase()] = name;
    }
  }
  return map;
}

function tablesFromQueryPlan(sql) {
  // Fragt SQLite selbst, welche Tabellen die Query anfasst (EXPLAIN QUERY PLAN).
  // Gibt null zurück, wenn die Query (noch) nicht gültig/lauffähig ist -> Aufrufer nutzt Fallback.
  if (!db || !sql || !sql.trim()) return null;
  let res;
  try {
    res = db.exec('EXPLAIN QUERY PLAN ' + sql);
  } catch (e) {
    return null; // Query unvollständig oder ungültig -> Fallback verwenden
  }
  if (!res || !res.length || !res[0].values) return [];
  const nameByLower = buildAliasMap(sql, ALL_TABLE_NAMES);
  const cols = res[0].columns || [];
  let detailIdx = cols.indexOf('detail');
  const found = [];
  for (const row of res[0].values) {
    const detail = String((detailIdx >= 0 ? row[detailIdx] : row[row.length - 1]) || '');
    // Zeilen wie "SCAN City", "SCAN TABLE City AS c", "SEARCH Country USING INDEX ..."
    const re = /\b(?:SCAN|SEARCH)\s+(?:TABLE\s+)?[`"]?([A-Za-z_][A-Za-z0-9_]*)[`"]?/gi;
    let m;
    while ((m = re.exec(detail)) !== null) {
      const nm = nameByLower[m[1].toLowerCase()];
      if (nm && !found.includes(nm)) found.push(nm);
    }
  }
  return found;
}

let lastDetectionSource = 'regex'; // 'sql' oder 'regex' – zeigt an, wie usedTables zuletzt ermittelt wurden

function extractUsedTables(sql, allNames) {
  // Primär: echten Query-Plan von SQLite nutzen (exakt, deckt auch Subqueries/CTEs ab).
  const planned = tablesFromQueryPlan(sql);
  if (planned !== null) {
    lastDetectionSource = 'sql';
    return planned;
  }
  // Fallback: Regex-Heuristik, solange die Query noch nicht lauffähig ist.
  lastDetectionSource = 'regex';
  return extractUsedTablesHeuristic(sql, allNames);
}

function getSelectedColumnsInfo(sql, tableColumns) {
  // null = alle Spalten gelten als enthalten (z. B. SELECT * oder keine eindeutige Liste erkannt)
  const text = sql || '';
  const m = text.match(/\bSELECT\b([\s\S]*?)\bFROM\b/i);
  if (!m) return null;
  const selectText = m[1];
  const items = [];
  let depth = 0, cur = '';
  for (const ch of selectText) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { items.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) items.push(cur);
  const trimmed = items.map(s => s.trim()).filter(Boolean);
  if (trimmed.length === 0) return null;
  if (trimmed.some(it => it === '*' || /\.\s*\*$/.test(it))) return null;
  const included = new Set();
  for (const colDef of tableColumns) {
    const colName = colDef.split(' ')[0];
    const re = new RegExp('(^|[^A-Za-z0-9_])' + colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z0-9_]|$)', 'i');
    if (trimmed.some(it => re.test(it))) included.add(colName.toLowerCase());
  }
  return included;
}

function renderERDiagram(sql) {
  const ER_COL = erColors();
  const el = document.getElementById('viz-er');
  const usedList = extractUsedTables(sql || '', ALL_TABLE_NAMES);
  const usedSet = new Set(usedList);
  const usedInDiagram = new Set(usedList.filter(n => ER_NODE_NAMES.has(n)));
  const extra = usedList.filter(n => !ER_NODE_NAMES.has(n));

  // Bereinige manuell ausgeklappte Tabellen, die es nicht (mehr) gibt.
  for (const n of Array.from(expandedTables)) if (!ER_NODE_NAMES.has(n)) expandedTables.delete(n);

  // Sichtbare Spalten = manuell ausgeklappt ODER in der Query verwendet.
  const openSet = new Set([...expandedTables, ...usedInDiagram]);
  const hasQuery = !!(sql && sql.trim());

  const { pos, maxBottom } = computeLayout(openSet);
  const viewH = Math.max(ER_VIEWBOX.h, maxBottom + 6);

  // Aktive Kanten: beide Endpunkte in der Query verwendet.
  const activePath = [];
  for (const [a, b, via] of ER_EDGES) {
    if (usedSet.has(a) && usedSet.has(b)) activePath.push([a, b, via]);
  }

  // Ankerpunkt einer Box zu einer Zielspalte hin.
  function anchor(p, towardCol) {
    const midY = p.y + (p.open ? ER_HEAD_H / 2 : p.h / 2);
    if (towardCol > p.col) return { x: p.x + p.w, y: midY, side: 'r' };
    if (towardCol < p.col) return { x: p.x, y: midY, side: 'l' };
    return { x: p.x + p.w, y: midY, side: 'r' }; // gleiche Spalte -> rechts ausbauchen
  }

  let edgesSvg = '';
  for (const [a, b, via] of ER_EDGES) {
    const pa = pos[a], pb = pos[b];
    if (!pa || !pb) continue;
    const active = usedSet.has(a) && usedSet.has(b);
    const dim = hasQuery && !active;
    const stroke = active ? ER_COL.edgeActive : (dim ? ER_COL.edgeDim : ER_COL.edge);
    const sw = active ? 1.8 : 0.8;

    if (a === b) { // Selbstbezug (River.River)
      const x = pa.x + pa.w, y = pa.y + (pa.open ? ER_HEAD_H / 2 : pa.h / 2);
      edgesSvg += `<path d="M ${x} ${y - 5} C ${x + 26} ${y - 12}, ${x + 26} ${y + 12}, ${x} ${y + 5}" fill="none" stroke="${stroke}" stroke-width="${sw}"><title>${escapeHtml(via)}</title></path>`;
      continue;
    }
    const A = anchor(pa, pb.col), B = anchor(pb, pa.col);
    let d;
    if (pa.col === pb.col) {
      const bow = 20 + Math.abs(A.y - B.y) * 0.12;
      d = `M ${A.x} ${A.y} C ${A.x + bow} ${A.y}, ${B.x + bow} ${B.y}, ${B.x} ${B.y}`;
    } else {
      const mx = (A.x + B.x) / 2;
      d = `M ${A.x} ${A.y} C ${mx} ${A.y}, ${mx} ${B.y}, ${B.x} ${B.y}`;
    }
    edgesSvg += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}"><title>${escapeHtml(a)} → ${escapeHtml(b)}: ${escapeHtml(via)}</title></path>`;
  }

  // Knoten
  let nodesSvg = '';
  for (const name of ER_NODE_NAMES) {
    const p = pos[name];
    const active = usedInDiagram.has(name);
    const cols = TABLE_COLUMNS[name] || [];
    const includedSet = active ? getSelectedColumnsInfo(sql, cols) : null;

    const headFill = active ? ER_COL.text : ER_COL.box;
    const headText = active ? ER_COL.box : ER_COL.text;
    const borderCol = active ? ER_COL.text : ER_COL.border;

    let box = `<g data-table="${escapeHtml(name)}" style="cursor:pointer;">`;
    box += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="${ER_COL.box}" stroke="${borderCol}" stroke-width="${active ? 1.4 : 1}" />`;
    box += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${ER_HEAD_H}" rx="4" fill="${headFill}" stroke="${borderCol}" stroke-width="${active ? 1.4 : 1}" />`;
    if (p.open) box += `<line x1="${p.x}" y1="${p.y + ER_HEAD_H}" x2="${p.x + p.w}" y2="${p.y + ER_HEAD_H}" stroke="${borderCol}" stroke-width="0.8" />`;
    box += `<text x="${p.x + 8}" y="${p.y + 15}" font-size="10" font-weight="600" font-family="ui-monospace, monospace" fill="${headText}">${escapeHtml(name)}</text>`;
    if (!p.open) box += `<text x="${p.x + p.w - 8}" y="${p.y + 15}" text-anchor="end" font-size="9" font-family="ui-monospace, monospace" fill="${active ? ER_COL.box : ER_COL.count}">${cols.length}</text>`;

    if (p.open) {
      cols.forEach((colDef, i) => {
        const spaceIdx = colDef.indexOf(' ');
        const colName = spaceIdx === -1 ? colDef : colDef.slice(0, spaceIdx);
        const ty = p.y + ER_HEAD_H + 10 + i * ER_ROW_H;
        const excluded = includedSet && !includedSet.has(colName.toLowerCase());
        const fill = excluded ? ER_COL.colOff : ER_COL.col;
        const deco = excluded ? ' text-decoration="line-through"' : '';
        box += `<text x="${p.x + 8}" y="${ty}" font-size="9" font-family="ui-monospace, monospace" fill="${fill}"${deco}>${escapeHtml(colName)}</text>`;
      });
    }
    box += `</g>`;
    nodesSvg += box;
  }

  const svg = `<svg id="er-svg" viewBox="0 0 ${ER_VIEWBOX.w} ${viewH}" width="100%" height="440" preserveAspectRatio="xMidYMin meet">
    <g id="er-viewport" transform="${erTransform()}">${edgesSvg}${nodesSvg}</g>
  </svg>`;

  const statusLabel = lastDetectionSource === 'sql' ? 'SQL-Plan' : 'Regex-Fallback';
  const statusHtml = hasQuery
    ? `<span class="detect-status" title="Erkennung der benutzten Tabellen läuft aktuell über: ${statusLabel}"><span class="detect-dot ${lastDetectionSource}"></span>${statusLabel}</span>`
    : '';

  let html = `<div class="viz-heading"><span>Tabellen &amp; Beziehungen</span>${statusHtml}</div>
    <div class="er-canvas" id="er-canvas-wrap">${svg}</div>
    <div class="er-controls">
      <button type="button" class="er-zoom-btn" id="er-zoom-out" title="Verkleinern">&minus;</button>
      <button type="button" class="er-zoom-btn" id="er-zoom-in" title="Vergrößern">+</button>
      <button type="button" class="er-zoom-btn" id="er-zoom-reset" title="Zurücksetzen">Reset</button>
      <span class="er-hint-text">ziehen &middot; scrollen zum Zoomen &middot; Tabelle antippen zeigt Spalten</span>
    </div>`;

  if (activePath.length) {
    html += `<div class="path-block"><div class="path-title">Verknüpfungspfad der Abfrage</div>`;
    for (const [a, b, via] of activePath) {
      html += `<div class="path-row"><span class="path-pair">${escapeHtml(a)} ↔ ${escapeHtml(b)}</span><span class="path-via">${escapeHtml(via)}</span></div>`;
    }
    html += `</div>`;
  } else if (hasQuery && usedInDiagram.size > 1) {
    html += `<div class="viz-extra">Keine direkte Verknüpfung zwischen den benutzten Tabellen hinterlegt. Evtl. über eine Zwischentabelle joinen.</div>`;
  }

  if (extra.length) {
    const tags = extra.map(n => escapeHtml(n)).join(', ');
    html += `<div class="viz-extra">Nicht im Diagramm (dennoch nutzbar): ${tags}</div>`;
  }
  if (!hasQuery) {
    html += `<div class="viz-hint">Standard: nur Titel &amp; Verbindungslinien. Tippe eine Tabelle an oder nutze sie in der Query, um ihre Spalten und den Join-Pfad zu sehen.</div>`;
  }

  el.innerHTML = html;
}

const PIPELINE_STEPS = [
  { label: 'FROM / JOIN', test: /\bFROM\b/i, desc: 'Ausgangstabelle(n) festlegen und verknüpfen' },
  { label: 'WHERE', test: /\bWHERE\b/i, desc: 'Zeilen vor der Gruppierung filtern' },
  { label: 'GROUP BY', test: /\bGROUP\s+BY\b/i, desc: 'Zeilen zu Gruppen zusammenfassen' },
  { label: 'HAVING', test: /\bHAVING\b/i, desc: 'Gruppen nach Aggregation filtern' },
  { label: 'SELECT', test: /\bSELECT\b/i, desc: 'Spalten fürs Ergebnis auswählen/berechnen' },
  { label: 'DISTINCT', test: /\bDISTINCT\b/i, desc: 'Doppelte Zeilen entfernen' },
  { label: 'ORDER BY', test: /\bORDER\s+BY\b/i, desc: 'Ergebnis sortieren' },
  { label: 'LIMIT', test: /\bLIMIT\b/i, desc: 'Anzahl der Zeilen begrenzen' },
];

function renderPipeline(sql) {
  const el = document.getElementById('viz-pipeline');
  const text = sql || '';
  let html = `<div class="viz-heading">Logische Abarbeitungsreihenfolge</div><div class="pipeline">`;
  PIPELINE_STEPS.forEach((step, i) => {
    const active = step.test.test(text);
    html += `<div class="pipe-step ${active ? 'active' : ''}">
      <div class="pipe-num">${i + 1}</div>
      <div class="pipe-body">
        <div class="pipe-label">${step.label}</div>
        <div class="pipe-desc">${step.desc}</div>
      </div>
    </div>`;
    if (i < PIPELINE_STEPS.length - 1) {
      html += `<div class="pipe-arrow ${active ? 'active' : ''}">↓</div>`;
    }
  });
  html += `</div>`;
  if (!text.trim()) {
    html += `<div class="viz-hint">Schreib eine Abfrage, die genutzten Schritte werden hier hervorgehoben.</div>`;
  }
  el.innerHTML = html;
}

function updateViz(sql) {
  renderERDiagram(sql);
  renderPipeline(sql);
}

document.querySelectorAll('.viz-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.viz-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.viz;
    document.getElementById('viz-er').style.display = target === 'er' ? 'block' : 'none';
    document.getElementById('viz-pipeline').style.display = target === 'pipeline' ? 'block' : 'none';
  });
});

(function setupErInteractions() {
  const container = document.getElementById('viz-er');
  let dragging = false, dragMoved = false, dragStart = { x: 0, y: 0 }, startPan = { x: 0, y: 0 };

  container.addEventListener('mousedown', (e) => {
    if (!e.target.closest('svg')) return;
    dragging = true;
    dragMoved = false;
    dragStart = { x: e.clientX, y: e.clientY };
    startPan = { x: erPanX, y: erPanY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
    const svgEl = document.getElementById('er-svg');
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    erPanX = startPan.x + dx * (ER_VIEWBOX.w / rect.width);
    erPanY = startPan.y + dy * (ER_VIEWBOX.h / rect.height);
    applyErTransform();
  });

  window.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    if (!dragMoved) {
      const target = e.target.closest('[data-table]');
      if (target) {
        const name = target.getAttribute('data-table');
        if (expandedTables.has(name)) expandedTables.delete(name);
        else expandedTables.add(name);
        renderERDiagram(document.getElementById('sql-input').value);
      }
    }
  });

  container.addEventListener('wheel', (e) => {
    const svgEl = e.target.closest('svg');
    if (!svgEl) return;
    e.preventDefault();
    // Zoomstaerke haengt von der Scrollmenge ab statt fest 15 % pro Event.
    // Touchpads feuern viele kleine Events, Mausraeder wenige grosse.
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;        // Zeilen -> Pixel
    else if (e.deltaMode === 2) dy *= 400;  // Seiten -> Pixel
    dy = Math.max(-100, Math.min(100, dy));
    // Pinch auf dem Touchpad kommt als Wheel mit ctrlKey und kleinen Werten
    const speed = e.ctrlKey ? 0.008 : 0.0015;
    const newZoom = Math.min(3, Math.max(0.4, erZoom * Math.exp(-dy * speed)));
    if (newZoom === erZoom) return;
    // Punkt unter dem Mauszeiger bleibt stehen
    const ctm = svgEl.getScreenCTM();
    if (ctm) {
      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const m = pt.matrixTransform(ctm.inverse());
      const cx = ER_VIEWBOX.w / 2, cy = ER_VIEWBOX.h / 2;
      const px = (m.x - cx - erPanX) / erZoom + cx;
      const py = (m.y - cy - erPanY) / erZoom + cy;
      erPanX = m.x - cx - (px - cx) * newZoom;
      erPanY = m.y - cy - (py - cy) * newZoom;
    }
    erZoom = newZoom;
    applyErTransform();
  }, { passive: false });

  container.addEventListener('click', (e) => {
    if (e.target.closest('#er-zoom-in')) { erZoom = Math.min(3, erZoom * 1.25); applyErTransform(); return; }
    if (e.target.closest('#er-zoom-out')) { erZoom = Math.max(0.4, erZoom / 1.25); applyErTransform(); return; }
    if (e.target.closest('#er-zoom-reset')) { erZoom = 1; erPanX = 0; erPanY = 0; applyErTransform(); return; }
    // Klicks auf Tabellen-Knoten im SVG werden oben per mouseup behandelt.
  });
})();

function runQuery() {
  const sql = document.getElementById('sql-input').value.trim();
  const errorArea = document.getElementById('error-area');
  const statusLine = document.getElementById('status-line');
  const resultsDiv = document.getElementById('results');
  errorArea.innerHTML = '';
  resultsDiv.innerHTML = '';
  statusLine.style.display = 'none';
  lastRun = null;
  if (!sql || !db) return;
  const start = performance.now();
  try {
    const results = db.exec(sql);
    lastRun = { sql, error: null, results };
    addToHistory(sql, true);
    const elapsed = (performance.now() - start).toFixed(1);
    statusLine.style.display = 'block';
    statusLine.textContent = 'Ausgeführt in ' + elapsed + ' ms.';
    renderResults(results);
  } catch (err) {
    lastRun = { sql, error: err.message || String(err), results: null };
    addToHistory(sql, false);
    showError(sql, err.message || String(err));
  }
}

// ---------- Syntax-Highlighting ----------
const SQL_HL_KEYWORDS = new Set((
  'select from where group by order having limit offset distinct all as on using ' +
  'join inner left right full outer cross natural union intersect except ' +
  'and or not in exists between like glob is null isnull notnull escape ' +
  'case when then else end asc desc with recursive over partition ' +
  'insert into values update set delete create drop alter table view index ' +
  'primary key default collate cast true false nulls first last ' +
  'begin commit rollback pragma explain'
).split(' '));

const SQL_HL_RE = /(\/\*[\s\S]*?(?:\*\/|$))|(--[^\n]*)|('(?:[^']|'')*(?:'|$))|("(?:[^"]|"")*(?:"|$))|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\.\d+\b)|([A-Za-z_][A-Za-z0-9_]*)/g;

function sqlEsc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightSql(text) {
  const re = new RegExp(SQL_HL_RE.source, 'g');
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[0] === '') { re.lastIndex++; continue; }
    out += sqlEsc(text.slice(last, m.index));
    const tok = sqlEsc(m[0]);
    if (m[1] || m[2]) out += '<span class="sql-com">' + tok + '</span>';
    else if (m[3]) out += '<span class="sql-str">' + tok + '</span>';
    else if (m[4]) out += tok; // "Bezeichner in Anfuehrungszeichen" bleibt normal
    else if (m[5]) out += '<span class="sql-num">' + tok + '</span>';
    else if (m[6]) {
      if (SQL_HL_KEYWORDS.has(m[6].toLowerCase())) {
        out += '<span class="sql-kw">' + tok + '</span>';
      } else if (/^\s*\(/.test(text.slice(re.lastIndex, re.lastIndex + 40))) {
        out += '<span class="sql-fn">' + tok + '</span>';
      } else {
        out += tok;
      }
    }
    last = re.lastIndex;
  }
  out += sqlEsc(text.slice(last));
  return out;
}

// ---------- Darkmode (Umschalter in theme.js) ----------
function erColors() {
  return currentTheme() === 'dark'
    ? { text: '#e8e8e8', box: '#1f1f1f', border: '#4a4a4a', count: '#6a6a6a',
        col: '#d0d0d0', colOff: '#555555', edge: '#4a4a4a', edgeDim: '#2a2a2a', edgeActive: '#ff7b72' }
    : { text: '#161616', box: '#ffffff', border: '#c9c9c9', count: '#bcbcbc',
        col: '#2a2a2a', colOff: '#c0c0c0', edge: '#d8d8d8', edgeDim: '#efefef', edgeActive: '#b3261e' };
}

document.addEventListener('themechange', () => {
  renderERDiagram(document.getElementById('sql-input').value);
});

// ---------- ChatGPT / Claude fragen ----------
let lastRun = null;

function tablesInQuery(sql) {
  const found = [];
  for (const name of ALL_TABLE_NAMES) {
    const re = new RegExp('(^|[^A-Za-z0-9_])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z0-9_])', 'i');
    if (re.test(sql)) found.push(name);
  }
  return found;
}

function previewRows(res, n) {
  const lines = [res.columns.join(' | ')];
  res.values.slice(0, n).forEach(r => {
    lines.push(r.map(v => v === null ? 'NULL' : String(v).slice(0, 40)).join(' | '));
  });
  return lines.join('\n');
}

function buildAskPrompt() {
  const MAX_SQL = 2500;
  let sql = document.getElementById('sql-input').value.trim();
  const run = lastRun && lastRun.sql === sql ? lastRun : null;
  if (sql.length > MAX_SQL) sql = sql.slice(0, MAX_SQL) + '\n… (gekürzt)';

  const used = tablesInQuery(sql);
  const schema = used.map(t =>
    t + '(' + (TABLE_COLUMNS[t] || []).map(c => c.split(' ')[0]).join(', ') + ')'
  ).join('\n');

  let p = 'Ich lerne SQL und übe mit der MONDIAL-Geodatenbank (Länder, Städte, Flüsse, Berge, Organisationen usw.). '
        + 'Die Abfragen laufen in SQLite (sql.js im Browser), also gilt der SQLite-Dialekt.\n\n';

  if (!sql) {
    p += 'Ich habe noch keine Abfrage geschrieben. Gib mir bitte eine kleine Übungsaufgabe mit der MONDIAL-Datenbank '
       + 'und erkläre kurz, welche Tabellen ich dafür brauche, aber verrate die Lösung noch nicht.\n\n'
       + 'Verfügbare Tabellen: ' + ALL_TABLE_NAMES.join(', ');
    return p;
  }

  p += 'Meine Abfrage:\n' + sql + '\n\n';

  if (run && run.error) {
    p += 'Fehlermeldung der Datenbank:\n' + run.error + '\n\n';
  } else if (run && run.results) {
    if (run.results.length === 0) {
      p += 'Die Abfrage lief ohne Fehler, hat aber keine Zeilen zurückgegeben.\n\n';
    } else {
      const r = run.results[run.results.length - 1];
      p += 'Die Abfrage lief ohne Fehler und lieferte ' + r.values.length + ' Zeile(n). Die ersten Zeilen:\n'
         + previewRows(r, 5) + '\n\n';
    }
  } else {
    p += '(Ich habe die Abfrage noch nicht ausgeführt.)\n\n';
  }

  if (schema) p += 'Relevante Tabellen mit Spalten:\n' + schema + '\n\n';
  else p += 'Verfügbare Tabellen: ' + ALL_TABLE_NAMES.join(', ') + '\n\n';

  if (run && run.error) {
    p += 'Erkläre mir bitte auf Deutsch, locker und direkt, WARUM die Abfrage nicht funktioniert. '
       + 'Erkläre das SQL-Konzept, das hier schiefläuft, statt nur die fertige Lösung hinzuschreiben. '
       + 'Gib mir dann einen Hinweis, wie ich es selbst beheben kann. Die korrigierte Abfrage zeigst du erst am Ende.';
  } else if (run && run.results && run.results.length === 0) {
    p += 'Erkläre mir bitte auf Deutsch, warum hier vermutlich nichts zurückkommt '
       + '(z. B. falsche Bedingung, Groß-/Kleinschreibung, falsche Spalte im JOIN) und wie ich das prüfen kann.';
  } else {
    p += 'Erkläre mir bitte auf Deutsch Schritt für Schritt, was diese Abfrage macht, '
       + 'ob sie logisch das tut, was man vermutlich will, und was man besser oder einfacher schreiben könnte.';
  }
  return p;
}

function setAskLinks() {
  const q = encodeURIComponent(buildAskPrompt());
  document.getElementById('ask-gpt').href = 'https://chatgpt.com/?q=' + q;
  document.getElementById('ask-claude').href = 'https://claude.ai/new?q=' + q;
}
['ask-gpt', 'ask-claude'].forEach(id => {
  const a = document.getElementById(id);
  // href kurz vor dem Oeffnen aktualisieren (auch fuer Mittelklick / Rechtsklick)
  ['mousedown', 'focus', 'touchstart'].forEach(ev => a.addEventListener(ev, setAskLinks));
  a.addEventListener('click', setAskLinks);
});

// ---------- Verlauf ----------
const HISTORY_KEY = 'mondial-history';
const HISTORY_MAX = 50;
let historyIndex = -1;    // -1 = aktueller Entwurf, 0 = neuester Eintrag
let historyDraft = '';

function loadHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(h) ? h.filter(x => x && typeof x.sql === 'string') : [];
  } catch (e) { return []; }
}

function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) {}
}

function addToHistory(sql, ok) {
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const h = loadHistory().filter(x => norm(x.sql) !== norm(sql));
  h.unshift({ sql, ok, t: Date.now() });
  saveHistory(h.slice(0, HISTORY_MAX));
  historyIndex = -1;
}

function setEditorText(text) {
  const ta = document.getElementById('sql-input');
  ta.value = text;
  syncEditor();
  updateViz(text);
  ta.focus();
  ta.setSelectionRange(text.length, text.length);
}

// dir = 1: aelter, dir = -1: neuer. Gibt false zurueck, wenn es nicht weitergeht.
function stepHistory(dir) {
  const h = loadHistory();
  if (!h.length) return false;
  const next = historyIndex + dir;
  if (next < -1 || next >= h.length) return true; // am Ende: Taste trotzdem schlucken
  if (historyIndex === -1) historyDraft = document.getElementById('sql-input').value;
  historyIndex = next;
  setEditorText(historyIndex === -1 ? historyDraft : h[historyIndex].sql);
  return true;
}

function timeAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'gerade';
  if (s < 3600) return Math.floor(s / 60) + ' min';
  if (s < 86400) return Math.floor(s / 3600) + ' h';
  return Math.floor(s / 86400) + ' d';
}

function renderHistoryPanel() {
  const panel = document.getElementById('history-panel');
  const h = loadHistory();
  panel.innerHTML = '';
  if (!h.length) {
    panel.innerHTML = '<div class="history-empty">Noch nichts ausgeführt.</div>';
    return;
  }
  h.forEach((item, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'history-item';
    b.title = item.sql;
    b.innerHTML = '<span class="h-dot ' + (item.ok ? 'ok' : 'err') + '"></span>'
      + '<span class="h-sql">' + escapeHtml(item.sql.replace(/\s+/g, ' ').trim()) + '</span>'
      + '<span class="h-time">' + timeAgo(item.t) + '</span>';
    b.onclick = () => {
      historyIndex = -1;
      setEditorText(item.sql);
      panel.style.display = 'none';
    };
    panel.appendChild(b);
  });
  const foot = document.createElement('div');
  foot.className = 'history-foot';
  foot.innerHTML = '<span>' + h.length + ' von max. ' + HISTORY_MAX + ' · ⌘/Strg + ↑ / ↓</span>';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.textContent = 'Verlauf löschen';
  clear.onclick = (e) => {
    e.stopPropagation();
    saveHistory([]);
    historyIndex = -1;
    renderHistoryPanel();
  };
  foot.appendChild(clear);
  panel.appendChild(foot);
}

document.getElementById('history-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('history-panel');
  const open = panel.style.display !== 'none';
  if (!open) renderHistoryPanel();
  panel.style.display = open ? 'none' : 'block';
});
document.getElementById('history-panel').addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', () => {
  document.getElementById('history-panel').style.display = 'none';
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('history-panel').style.display = 'none';
});

// ---------- Formatieren ----------
// sql-formatter laesst Operatoren wie LIKE/BETWEEN/IN klein; die ziehen wir hier nach.
function uppercaseKeywords(text) {
  const re = new RegExp(SQL_HL_RE.source, 'g');
  return text.replace(re, (tok, com1, com2, str, qid, num, word) =>
    word && SQL_HL_KEYWORDS.has(word.toLowerCase()) ? word.toUpperCase() : tok);
}

function formatEditor() {
  const ta = document.getElementById('sql-input');
  const msg = document.getElementById('tool-msg');
  msg.textContent = '';
  const sql = ta.value;
  if (!sql.trim()) return;
  let out;
  try {
    out = uppercaseKeywords(window.formatSqlite(sql)).replace(/\s+$/, '');
  } catch (err) {
    msg.textContent = 'Formatieren klappt erst, wenn die Abfrage vollständig ist.';
    setTimeout(() => { msg.textContent = ''; }, 4000);
    return;
  }
  if (out === sql) return;
  ta.focus();
  ta.select();
  // insertText behaelt die Undo-Historie, Strg+Z macht das Formatieren rueckgaengig
  const ok = document.execCommand && document.execCommand('insertText', false, out);
  if (!ok || ta.value !== out) { ta.value = out; ta.dispatchEvent(new Event('input')); }
  ta.setSelectionRange(0, 0);
  ta.scrollIntoView({ block: 'nearest' });
}
document.getElementById('format-btn').addEventListener('click', formatEditor);

function syncEditor() {
  const ta = document.getElementById('sql-input');
  const hl = document.getElementById('sql-highlight');
  // Hoehe waechst mit dem Inhalt, damit nie ein eigener Scrollbalken entsteht
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
  // abschliessender Zeilenumbruch bleibt sonst unsichtbar
  hl.innerHTML = highlightSql(ta.value) + '\n';
}
window.addEventListener('resize', syncEditor);

document.getElementById('run-btn').addEventListener('click', runQuery);
document.getElementById('sql-input').addEventListener('input', () => { syncEditor(); historyIndex = -1; });
document.getElementById('sql-input').addEventListener('input', (e) => {
  updateViz(e.target.value);
});
document.getElementById('sql-input').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runQuery();
  } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    if (stepHistory(e.key === 'ArrowUp' ? 1 : -1)) e.preventDefault();
  }
});

document.addEventListener('click', (e) => {
  const toggle = document.querySelector('.tables-toggle');
  if (toggle && toggle.open && !toggle.contains(e.target)) {
    toggle.removeAttribute('open');
  }
});

// ---------- Start ----------
// Schema, Tabellenliste und Diagramm stehen sofort bereit, die Datenbank (ca. 3 MB) kommt hinterher.
(function init() {
  const tables = parseSchema(SCHEMA_TEXT);
  renderTableList(tables);
  ALL_TABLE_NAMES = tables.map(t => t.name);
  TABLE_COLUMNS = {};
  tables.forEach(t => { TABLE_COLUMNS[t.name] = t.columns; });

  // Abfrage aus dem Link übernehmen: /#q=SELECT…
  const m = location.hash.match(/^#q=(.*)$/s);
  if (m) {
    try { document.getElementById('sql-input').value = decodeURIComponent(m[1]); } catch (e) {}
  }
  syncEditor();
  updateViz(document.getElementById('sql-input').value);

  const runBtn = document.getElementById('run-btn');
  const statusLine = document.getElementById('status-line');
  runBtn.disabled = true;
  statusLine.style.display = 'block';
  statusLine.textContent = 'Datenbank wird geladen…';

  Promise.all([
    initSqlJs({ locateFile: file => ASSET_URLS[file] }),
    fetch(ASSET_URLS['mondial.sqlite']).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }),
  ]).then(([SQL, buf]) => {
    db = new SQL.Database(new Uint8Array(buf));
    runBtn.disabled = false;
    statusLine.style.display = 'none';
    statusLine.textContent = '';
    updateViz(document.getElementById('sql-input').value);
  }).catch(err => {
    statusLine.textContent = 'Die Datenbank konnte nicht geladen werden (' + err.message + '). Lade die Seite neu.';
  });
})();
