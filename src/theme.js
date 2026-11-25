// Darkmode-Umschalter für alle Seiten. Das Theme selbst setzt ein kleines Skript im <head>,
// damit die Seite nicht kurz hell aufblitzt.
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function updateThemeButton() {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = currentTheme() === 'dark' ? '☀ hell' : '☾ dunkel';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('mondial-theme', next); } catch (e) {}
  updateThemeButton();
  document.dispatchEvent(new Event('themechange'));
});
updateThemeButton();
