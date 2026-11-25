// Wird mit esbuild gebündelt. Nur der SQLite-Dialekt, damit die Datei klein bleibt.
import { formatDialect, sqlite } from 'sql-formatter';

window.formatSqlite = (sql) => formatDialect(sql, {
  dialect: sqlite,
  keywordCase: 'upper',
  functionCase: 'upper',
  tabWidth: 2,
  linesBetweenQueries: 1,
});
