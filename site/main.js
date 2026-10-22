// Ajusta o botão principal ao aparelho de quem visita: iPhone usa o app pelo Safari,
// Android baixa o app. Sem JavaScript, os dois botões continuam funcionando.
(function () {
  var APP_URL = 'https://app.duoday.com.br';
  var ANDROID_URL = '/baixar/android';

  var ua = navigator.userAgent || '';
  var isIOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  document.documentElement.setAttribute('data-platform', platform);

  function set(selector, href, label) {
    var el = document.querySelector(selector);
    if (!el) return;
    el.setAttribute('href', href);
    var text = el.querySelector('[data-cta-label]');
    if (text && label) text.textContent = label;
  }

  function apply() {
    var note = document.querySelector('[data-cta-note]');
    var top = document.querySelector('[data-cta="top"]');
    if (platform === 'ios') {
      set('[data-cta="primary"]', APP_URL, 'Abrir no iPhone');
      var icon = document.querySelector('[data-cta="primary"] .btn-icon');
      if (icon) icon.style.display = 'none';
      set('[data-cta="secondary"]', '#iphone', 'Como instalar');
      if (top) top.setAttribute('href', '#iphone');
      if (note) note.textContent = 'Grátis, sem anúncios. Abra no Safari e adicione à Tela de Início.';
    } else if (platform === 'android') {
      set('[data-cta="primary"]', ANDROID_URL, 'Baixar para Android');
      set('[data-cta="secondary"]', APP_URL, 'Usar pelo navegador');
      if (top) top.setAttribute('href', ANDROID_URL);
      if (note) note.textContent = 'Grátis, sem anúncios. Instale o app ou use direto pelo navegador.';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
