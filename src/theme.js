// Darkmode- und Sprachumschalter für alle Seiten. Das Theme selbst setzt ein kleines Skript im <head>,
// damit die Seite nicht kurz hell aufblitzt.
const EN = document.documentElement.lang === 'en';

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function updateThemeButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.textContent = currentTheme() === 'dark' ? (EN ? '☀ light' : '☀ hell') : (EN ? '☾ dark' : '☾ dunkel');
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('mondial-theme', next); } catch (e) {}
  updateThemeButton();
  document.dispatchEvent(new Event('themechange'));
});
updateThemeButton();

// Sprachwahl merken, damit die automatische Weiterleitung sie respektiert.
// Auf der Startseite wandert die aktuelle Abfrage mit in die andere Sprache.
document.querySelectorAll('a[data-lang]').forEach((a) => {
  const carryQuery = () => {
    const ta = document.getElementById('sql-input');
    if (ta && ta.value.trim()) a.href = a.href.split('#')[0] + '#q=' + encodeURIComponent(ta.value);
  };
  const remember = () => {
    try { localStorage.setItem('mondial-lang', a.dataset.lang); } catch (e) {}
    carryQuery();
  };
  a.addEventListener('mousedown', carryQuery);
  a.addEventListener('click', remember);
  a.addEventListener('auxclick', remember);
});
