// Liga as animações (motion.js) antes da primeira pintura, para o topo não "piscar" antes de
// animar. Se "reduzir movimento" estiver ligado, ou se o motion.js não carregar a tempo, o site
// aparece normal, sem animação.
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement;
  root.classList.add('motion');
  setTimeout(function () {
    if (!root.classList.contains('motion-ready')) root.classList.remove('motion');
  }, 3000);
})();
