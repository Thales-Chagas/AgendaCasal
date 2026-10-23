// Animações do site. O GSAP cuida da rolagem (ScrollSmoother, ScrollTrigger e SplitText) e o
// anime.js das microinterações (título, ícones, botões e perguntas). Sem JavaScript, ou com
// "reduzir movimento" ligado, o site continua igual, só sem animação (ver motion-boot.js).
(function () {
  var root = document.documentElement;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger || !window.ScrollSmoother || !window.SplitText || !window.anime) {
    root.classList.remove('motion');
    return;
  }
  // Se a rede foi lenta, o motion-boot.js já mostrou a página parada; liga as animações assim mesmo.
  root.classList.add('motion');

  var A = window.anime;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger, window.ScrollSmoother, window.SplitText);

  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var bouncy = A.spring({ bounce: 0.45, duration: 650 });
  // As 15 cores pessoais do app (person-colors.ts), mais o rosa do casal.
  var COLORS = [
    '#B8385A',
    '#4F5BD5',
    '#2563EB',
    '#0891B2',
    '#0EA5A0',
    '#059669',
    '#5E9C76',
    '#65A30D',
    '#B8870C',
    '#D2700F',
    '#9A6A3E',
    '#E4572E',
    '#C026D3',
    '#9150B5',
    '#8143EE',
    '#7A8597',
  ];

  // Rolagem suave só com mouse/trackpad; no toque, a rolagem nativa do celular é melhor.
  var smoother = finePointer
    ? window.ScrollSmoother.create({ wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 1.1 })
    : null;

  // Links internos (#recursos, #instalar...) rolam até a seção e levam o foco junto.
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href');
    var target = id.length > 1 && document.getElementById(id.slice(1));
    if (!target) return;
    event.preventDefault();
    if (smoother) smoother.scrollTo(target, true, 'top 80px');
    else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.replaceState(null, '', id);
  });

  // Barra de progresso no topo e topo que some ao descer e volta ao subir.
  gsap.to('.scroll-progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  });
  var topbar = $('.topbar');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: function (self) {
      var hide = self.direction === 1 && self.scroll() > 360 && !topbar.contains(document.activeElement);
      topbar.classList.toggle('topbar-hidden', hide);
    },
  });

  // ---- Topo: entrada com anime.js ----
  var h1 = $('.hero h1');
  // Por palavra (e não por letra) para não perder o ajuste fino entre as letras da fonte.
  var title = A.splitText(h1, { words: { class: 'w' } });
  var eyebrow = $('.hero .eyebrow');
  var heroRest = $$('.hero .lead, .hero .cta > *, .hero .cta-note');
  var phones = $$('.hero .phone');

  // Bolinhas nas cores pessoais flutuando atrás dos celulares.
  var dotsBox = $('.hero-dots');
  var dots = COLORS.map(function (color) {
    var dot = document.createElement('span');
    dot.style.background = color;
    dot.style.left = A.utils.random(2, 94) + '%';
    dot.style.top = A.utils.random(4, 92) + '%';
    var size = A.utils.random(10, 26);
    dot.style.width = dot.style.height = size + 'px';
    dotsBox.appendChild(dot);
    return dot;
  });

  root.classList.add('motion-ready');

  A.animate(title.words, {
    y: ['0.7em', '0em'],
    rotate: [6, 0],
    scale: [0.9, 1],
    opacity: [0, 1],
    ease: A.spring({ bounce: 0.4, duration: 800 }),
    delay: A.stagger(90, { start: 120 }),
  });
  A.animate(eyebrow, {
    innerHTML: A.scrambleText({ chars: 'a-z', cursor: '_', revealRate: 40 }),
    opacity: [0, 1],
    duration: 900,
  });
  A.animate(heroRest, {
    y: [26, 0],
    opacity: [0, 1],
    duration: 800,
    ease: 'out(4)',
    delay: A.stagger(90, { start: 520 }),
  });
  A.animate(phones, {
    y: [120, 0],
    opacity: [0, 1],
    ease: A.spring({ bounce: 0.3, duration: 1000 }),
    delay: A.stagger(140, { start: 300, reversed: true }),
  });
  A.animate(dots, {
    scale: [0, 1],
    opacity: [0, 0.85],
    duration: 700,
    ease: 'out(3)',
    delay: A.stagger(45, { start: 700, from: 'random' }),
  });
  // Movimento contínuo e leve: o celular da frente "respira" e as bolinhas flutuam.
  A.animate('.phone-front img', {
    y: [0, -12],
    duration: 3400,
    ease: 'inOutSine',
    loop: true,
    alternate: true,
  });
  dots.forEach(function (dot) {
    A.animate(dot, {
      x: A.utils.random(-24, 24),
      y: A.utils.random(-30, 30),
      duration: A.utils.random(2600, 4600),
      delay: 1400,
      ease: 'inOutSine',
      loop: true,
      alternate: true,
    });
  });

  // ---- Topo: ao rolar, os celulares se afastam (GSAP, preso à rolagem) ----
  var heroScroll = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.phone-front', { y: -110, rotation: -4, ease: 'none', scrollTrigger: heroScroll });
  gsap.to('.phone-back', { y: 70, x: 40, rotation: 12, ease: 'none', scrollTrigger: heroScroll });
  gsap.to('.hero-dots', { y: -180, ease: 'none', scrollTrigger: heroScroll });
  gsap.to('.hero-copy', { y: 90, autoAlpha: 0.15, ease: 'none', scrollTrigger: heroScroll });

  // ---- Títulos das seções: linhas sobem de dentro de uma máscara (SplitText) ----
  $$('main section:not(.hero) h2').forEach(function (heading) {
    window.SplitText.create(heading, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: function (self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.09,
          scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
        });
      },
    });
  });
  $$('main section:not(.hero) .eyebrow').forEach(function (label) {
    gsap.from(label, {
      x: -24,
      autoAlpha: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: label, start: 'top 90%', once: true },
    });
  });

  // ---- Recursos: cartões entram em ondas e os ícones pulam (anime.js) ----
  gsap.set('.feature', {
    autoAlpha: 0,
    y: 70,
    rotation: function (i) {
      return i % 2 ? 2 : -2;
    },
  });
  ScrollTrigger.batch('.feature', {
    start: 'top 90%',
    once: true,
    onEnter: function (cards) {
      gsap.to(cards, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 });
      A.animate(
        cards.map(function (card) {
          return $('.feature-icon', card);
        }),
        { scale: [0, 1], rotate: [-40, 0], ease: bouncy, delay: A.stagger(120, { start: 250 }) },
      );
    },
  });
  if (finePointer) {
    $$('.feature').forEach(function (card) {
      var icon = $('.feature-icon', card);
      var rotX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
      var rotY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
      card.addEventListener('pointerenter', function () {
        A.animate(icon, { rotate: [0, -14, 10, 0], scale: [1, 1.18, 1], duration: 650, ease: 'out(3)' });
      });
      card.addEventListener('pointermove', function (event) {
        var box = card.getBoundingClientRect();
        rotY(((event.clientX - box.left) / box.width - 0.5) * 10);
        rotX(-((event.clientY - box.top) / box.height - 0.5) * 10);
      });
      card.addEventListener('pointerleave', function () {
        rotX(0);
        rotY(0);
      });
    });
  }

  // ---- Telas: seção presa, a rolagem vertical passa as telas para o lado ----
  var showcase = $('.showcase');
  var track = $('.screens');
  var items = $$('li', track);
  var counter = $('[data-count]');
  var mm = gsap.matchMedia();

  mm.add('(min-width: 760px) and (min-height: 560px)', function () {
    showcase.classList.add('is-pinned');
    var trackLeft = 0;
    // Folga dos dois lados para a primeira e a última tela pararem no meio da tela.
    function layout() {
      track.style.paddingLeft = track.style.paddingRight = '0px';
      var item = items[0].getBoundingClientRect().width;
      trackLeft = track.getBoundingClientRect().left - gsap.getProperty(track, 'x');
      var side = Math.max(0, window.innerWidth / 2 - item / 2);
      track.style.paddingLeft = Math.max(0, side - trackLeft) + 'px';
      track.style.paddingRight = side + 'px';
    }
    function distance() {
      return Math.max(0, track.scrollWidth + trackLeft - window.innerWidth);
    }
    ScrollTrigger.addEventListener('refreshInit', layout);
    layout();

    var slide = gsap.to(track, {
      x: function () {
        return -distance();
      },
      ease: 'none',
      scrollTrigger: {
        trigger: showcase,
        start: 'top top',
        end: function () {
          return '+=' + distance();
        },
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var index = Math.round(self.progress * (items.length - 1));
          counter.textContent = String(index + 1).padStart(2, '0');
          items.forEach(function (li, i) {
            li.classList.toggle('is-current', i === index);
          });
        },
      },
    });

    // Efeito "carrossel 3D": a tela do meio fica de frente e maior, as dos lados giram.
    items.forEach(function (li) {
      var figure = $('figure', li);
      gsap
        .timeline({
          scrollTrigger: {
            containerAnimation: slide,
            trigger: li,
            start: 'left right',
            end: 'right left',
            scrub: true,
          },
        })
        .fromTo(
          figure,
          { rotationY: -35, scale: 0.8, autoAlpha: 0.55 },
          { rotationY: 0, scale: 1, autoAlpha: 1, ease: 'power1.out' },
        )
        .to(figure, { rotationY: 35, scale: 0.8, autoAlpha: 0.55, ease: 'power1.in' });
    });

    return function () {
      ScrollTrigger.removeEventListener('refreshInit', layout);
      showcase.classList.remove('is-pinned');
      track.style.paddingLeft = track.style.paddingRight = '';
    };
  });

  mm.add('(max-width: 759px), (max-height: 559px)', function () {
    gsap.from(items, {
      x: 80,
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.1,
      scrollTrigger: { trigger: track, start: 'top 85%', once: true },
    });
  });

  // ---- Privacidade: o cartão escuro cresce até ocupar a tela ----
  gsap.fromTo(
    '.privacy',
    { scale: 0.88, borderRadius: 64 },
    {
      scale: 1,
      borderRadius: 32,
      ease: 'none',
      scrollTrigger: { trigger: '.privacy', start: 'top bottom', end: 'top 25%', scrub: true },
    },
  );
  gsap.from('.privacy-list li', {
    x: 70,
    autoAlpha: 0,
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.12,
    scrollTrigger: { trigger: '.privacy-list', start: 'top 82%', once: true },
  });

  // ---- Instalar: cartões vêm dos lados e os números dos passos saltam ----
  $$('.install-card').forEach(function (card, i) {
    gsap.from(card, {
      x: i ? 90 : -90,
      rotation: i ? 3 : -3,
      autoAlpha: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          A.animate($$('.steps li', card), {
            '--step-scale': [0, 1],
            ease: bouncy,
            delay: A.stagger(140, { start: 450 }),
          });
        },
      },
    });
  });

  // ---- Botões "magnéticos": seguem um pouco o ponteiro (anime.js) ----
  if (finePointer) {
    $$('.hero .btn, .install-card .btn').forEach(function (btn) {
      var follow = A.createAnimatable(btn, { x: 500, y: 500, ease: 'out(3)' });
      btn.addEventListener('pointermove', function (event) {
        var box = btn.getBoundingClientRect();
        follow.x((event.clientX - box.left - box.width / 2) * 0.3);
        follow.y((event.clientY - box.top - box.height / 2) * 0.4);
      });
      btn.addEventListener('pointerleave', function () {
        follow.x(0);
        follow.y(0);
      });
    });
  }

  // ---- Perguntas: abrem e fecham deslizando (anime.js) ----
  $$('.faq details').forEach(function (item) {
    var summary = $('summary', item);
    var answer = $('p', item);
    var running = null;
    summary.addEventListener('click', function (event) {
      event.preventDefault();
      if (running) running.pause();
      if (!item.open) {
        item.open = true;
        var height = answer.scrollHeight;
        running = A.animate(answer, {
          height: [0, height],
          opacity: [0, 1],
          y: [-8, 0],
          duration: 420,
          ease: 'out(3)',
          onComplete: function () {
            answer.style.height = '';
          },
        });
      } else {
        running = A.animate(answer, {
          height: [answer.offsetHeight, 0],
          opacity: 0,
          duration: 300,
          ease: 'in(2)',
          onComplete: function () {
            item.open = false;
            answer.style.height = answer.style.opacity = answer.style.transform = '';
          },
        });
      }
    });
  });
  gsap.from('.faq details', {
    y: 30,
    autoAlpha: 0,
    duration: 0.7,
    ease: 'power2.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.faq', start: 'top 80%', once: true },
  });

  // As fontes mudam a altura dos textos: recalcula os pontos de disparo quando chegam.
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () {
      ScrollTrigger.refresh();
    });
})();
