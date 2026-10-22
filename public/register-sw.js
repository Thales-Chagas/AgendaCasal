// Registra o service worker do DuoDay (abre rápido e funciona sem internet).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
