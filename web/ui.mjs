// Feste Seitentexte je Sprache (Navigation, Startseite, Fußzeile, Schema- und Aufgabenseite).
// Inhalte wie FAQ und Tabellenbeschreibungen stehen in site.mjs, die Aufgaben in aufgaben.mjs.
// Werte mit HTML sind als solche markiert (…Html), alles andere wird beim Build escaped.

export const LANGS = ['de', 'en'];

// Pfade je Sprache. Deutsch ist die Standardsprache und liegt im Wurzelverzeichnis.
export const PATHS = {
  home: { de: '', en: 'en/' },
  tasks: { de: 'aufgaben/', en: 'en/exercises/' },
  schema: { de: 'schema/', en: 'en/schema/' },
};

export const UI = {
  de: {
    locale: 'de_DE', numberLocale: 'de-DE',
    navAria: 'Hauptnavigation', navTasks: 'Aufgaben', navSchema: 'Schema', navTables: 'Tabellen',
    langLink: 'EN', langTitle: 'English version',
    ogAlt: 'Vorschau: SQL üben mit der Mondial-Datenbank, Editor mit Ergebnistabelle und ER-Diagramm',
    app: {
      sqlLabel: 'SQL-Abfrage', run: 'Ausführen', runHint: '⌘/Strg + Enter',
      format: 'Formatieren', formatTitle: 'Abfrage einrücken und Schlüsselwörter großschreiben (mit Strg+Z rückgängig)',
      history: 'Verlauf', historyTitle: 'Frühere Abfragen · auch mit ⌘/Strg + ↑ / ↓ im Editor',
      help: 'Hilfe:', askGpt: 'ChatGPT fragen', askClaude: 'Claude fragen',
      tabTables: 'Tabellen', tabPipeline: 'Ablauf',
    },
    learningType: 'Übungsumgebung',
    foot: {
      faq: 'Häufige Fragen',
      about: 'Über die Daten',
      aboutHtml: (M, L) => `<p>Die Daten stammen aus der <a href="${M.homepage}" target="_blank" rel="noopener">MONDIAL-Datenbank</a> von Wolfgang May (Institut für Informatik, Universität Göttingen) und stehen unter der Lizenz <a href="${L}" target="_blank" rel="noopener">CC BY 3.0</a>. Diese Seite nutzt eine SQLite-Fassung der Daten, Grundlage ist <a href="${M.copy}" target="_blank" rel="noopener">github.com/ullenboom/mondial-database</a>.</p>
      <p>Zitiervorschlag des Autors: Wolfgang May, <i>Information Extraction and Integration with Florid: The Mondial Case Study</i>, Technical Report 131, Universität Freiburg, 1999.</p>
      <p>Die Zahlen stammen aus verschiedenen Jahren und Quellen (unter anderem CIA World Factbook). Sie eignen sich zum Üben von SQL, nicht als aktuelle Statistik.</p>`,
      privacy: 'Datenschutz',
      privacyHtml: `<p>Die Seite setzt keine Cookies und lädt nichts von fremden Servern. Deine Abfragen werden nur in deinem Browser ausgeführt. Der Verlauf und die Einstellungen (hell/dunkel, Sprache) liegen im lokalen Speicher deines Browsers und verlassen dein Gerät nicht.</p>
      <p>Klickst du auf „ChatGPT fragen“ oder „Claude fragen“, öffnet sich die Seite des jeweiligen Anbieters mit deiner Abfrage. Ab da gelten dessen Datenschutzbestimmungen. Die Seite selbst wird über Cloudflare Pages ausgeliefert.</p>`,
      fineHtml: (S, L) => `Kostenlos und Open Source · <a href="${S.repo}" target="_blank" rel="noopener">GitHub</a> · Daten: MONDIAL von Wolfgang May, <a href="${L}" target="_blank" rel="noopener">CC BY 3.0</a> · Unabhängiges Projekt, nicht verbunden mit der Universität Göttingen`,
    },
    schema: {
      h1: 'Mondial-Datenbank: Schema und Tabellen',
      leadHtml: (n) => `Alle ${n} Tabellen der MONDIAL-Datenbank mit Spalten, Primärschlüsseln und Verknüpfungen. Über „Im Trainer öffnen“ schaust du dir jede Tabelle direkt im SQL-Trainer an.`,
      tocAria: 'Gruppen', groupAnchor: 'gruppe',
      referencedBy: 'wird referenziert von', rows: 'Zeilen', pk: 'Primärschlüssel', pkTitle: 'Teil des Primärschlüssels',
      column: 'Spalte', type: 'Typ', open: 'Im Trainer öffnen →',
      title: (n) => `Mondial-Datenbank Schema: alle ${n} Tabellen und Spalten`,
      description: (n) => `Das Schema der MONDIAL-Datenbank: alle ${n} Tabellen wie Country, City, Province, River und borders mit Spalten, Primärschlüsseln und Verknüpfungen.`,
    },
    tasks: {
      h1: 'SQL-Übungsaufgaben mit Lösungen',
      leadHtml: (n) => `${n} Aufgaben zur MONDIAL-Datenbank, vom einfachen SELECT bis zur korrelierten Unterabfrage. Jede Aufgabe hat einen Hinweis und eine geprüfte Musterlösung. „Im Trainer lösen“ öffnet die Aufgabe direkt im Editor.`,
      tocAria: 'Schwierigkeit', levelAnchor: 'stufe',
      comment: 'Aufgabe', hint: 'Hinweis', solution: 'Lösung', solve: 'Im Trainer lösen →', openSolution: 'Lösung im Trainer öffnen',
      title: 'SQL-Übungsaufgaben mit Lösungen zur Mondial-Datenbank',
      description: (n) => `${n} SQL-Aufgaben zur MONDIAL-Datenbank mit Hinweisen und Lösungen: SELECT, JOIN, GROUP BY, HAVING und Unterabfragen. Direkt im Browser lösen.`,
      ldName: 'SQL-Übungsaufgaben zur Mondial-Datenbank', ldType: 'Übungsaufgaben',
      ldTeaches: 'SQL: SELECT, WHERE, JOIN, GROUP BY, HAVING, Unterabfragen',
    },
    notFound: {
      title: 'Seite nicht gefunden', description: 'Diese Seite gibt es nicht.',
      lead: 'Diese Adresse gibt es nicht (mehr).', back: 'Zum SQL-Trainer',
    },
  },

  en: {
    locale: 'en_US', numberLocale: 'en-US',
    navAria: 'Main navigation', navTasks: 'Exercises', navSchema: 'Schema', navTables: 'Tables',
    langLink: 'DE', langTitle: 'Deutsche Version',
    ogAlt: 'Preview: Practice SQL with the Mondial database, editor with result table and ER diagram',
    app: {
      sqlLabel: 'SQL query', run: 'Run', runHint: '⌘/Ctrl + Enter',
      format: 'Format', formatTitle: 'Indent the query and uppercase keywords (undo with Ctrl+Z)',
      history: 'History', historyTitle: 'Previous queries · also with ⌘/Ctrl + ↑ / ↓ in the editor',
      help: 'Help:', askGpt: 'Ask ChatGPT', askClaude: 'Ask Claude',
      tabTables: 'Tables', tabPipeline: 'Order',
    },
    learningType: 'Practice environment',
    foot: {
      faq: 'Frequently asked questions',
      about: 'About the data',
      aboutHtml: (M, L) => `<p>The data comes from the <a href="${M.homepage}" target="_blank" rel="noopener">MONDIAL database</a> by Wolfgang May (Institute of Computer Science, University of Göttingen) and is licensed under <a href="${L}" target="_blank" rel="noopener">CC BY 3.0</a>. This site uses an SQLite version of the data based on <a href="${M.copy}" target="_blank" rel="noopener">github.com/ullenboom/mondial-database</a>.</p>
      <p>Citation suggested by the author: Wolfgang May, <i>Information Extraction and Integration with Florid: The Mondial Case Study</i>, Technical Report 131, Universität Freiburg, 1999.</p>
      <p>The figures come from different years and sources (including the CIA World Factbook). They are meant for practicing SQL, not as current statistics.</p>`,
      privacy: 'Privacy',
      privacyHtml: `<p>This site sets no cookies and loads nothing from third-party servers. Your queries run only in your browser. Your history and settings (light/dark, language) are kept in your browser’s local storage and never leave your device.</p>
      <p>If you click “Ask ChatGPT” or “Ask Claude”, that provider’s site opens with your query, and their privacy policy applies from there. The site itself is served via Cloudflare Pages.</p>`,
      fineHtml: (S, L) => `Free and open source · <a href="${S.repo}" target="_blank" rel="noopener">GitHub</a> · Data: MONDIAL by Wolfgang May, <a href="${L}" target="_blank" rel="noopener">CC BY 3.0</a> · Independent project, not affiliated with the University of Göttingen`,
    },
    schema: {
      h1: 'Mondial Database: Schema and Tables',
      leadHtml: (n) => `All ${n} tables of the MONDIAL database with columns, primary keys and relationships. Use “Open in trainer” to look at any table right in the SQL trainer.`,
      tocAria: 'Groups', groupAnchor: 'group',
      referencedBy: 'referenced by', rows: 'rows', pk: 'Primary key', pkTitle: 'Part of the primary key',
      column: 'Column', type: 'Type', open: 'Open in trainer →',
      title: (n) => `Mondial Database Schema: all ${n} tables and columns`,
      description: (n) => `The schema of the MONDIAL database: all ${n} tables such as Country, City, Province, River and borders with columns, primary keys and relationships.`,
    },
    tasks: {
      h1: 'SQL Exercises with Solutions',
      leadHtml: (n) => `${n} exercises for the MONDIAL database, from a simple SELECT to correlated subqueries. Each exercise has a hint and a tested solution. “Solve in trainer” opens the exercise right in the editor.`,
      tocAria: 'Difficulty', levelAnchor: 'level',
      comment: 'Exercise', hint: 'Hint', solution: 'Solution', solve: 'Solve in trainer →', openSolution: 'Open solution in trainer',
      title: 'SQL Exercises with Solutions for the Mondial Database',
      description: (n) => `${n} SQL exercises for the MONDIAL database with hints and solutions: SELECT, JOIN, GROUP BY, HAVING and subqueries. Solve them right in your browser.`,
      ldName: 'SQL exercises for the Mondial database', ldType: 'Exercises',
      ldTeaches: 'SQL: SELECT, WHERE, JOIN, GROUP BY, HAVING, subqueries',
    },
    notFound: {
      title: 'Page not found', description: 'This page does not exist.',
      lead: 'This address does not exist (anymore).', back: 'Go to the SQL trainer',
    },
  },
};
