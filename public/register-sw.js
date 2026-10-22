// Registra o service worker do DuoDay (abre rápido e funciona sem internet).
(function () {
  if (!('serviceWorker' in navigator)) return;
  var startedAt = Date.now();
  var hadController = !!navigator.serviceWorker.controller;

  // Versão nova chegou logo na abertura: troca já, antes de a pessoa começar a mexer.
  // Depois disso, a troca fica para a próxima abertura (nunca recarrega no meio do uso).
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (hadController && Date.now() - startedAt < 8000) window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .then(function (registration) {
        // App instalado volta do segundo plano sem recarregar: procura atualização nessa hora.
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') registration.update().catch(function () {});
        });
      })
      .catch(function () {});
  });
})();
