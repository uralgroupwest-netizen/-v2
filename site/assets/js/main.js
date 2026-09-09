/* Efimov Group — заставка, меню, кнопка наверх, свечение кнопок.
   Всё необязательное: без JS страница читается целиком. */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ---------- 1. Заставка ---------- */
  if (root.classList.contains('intro-on')) {
    var DUR = 4000;                      // синхронно с длительностью в CSS
    var num = document.getElementById('introNum');
    var t0 = performance.now();
    var done = false;

    (function tick(now) {                // счётчик 0 → 100 за первые 1,55 с
      if (done) return;
      var p = Math.min((now - t0) / 1550, 1);
      if (num) num.textContent = Math.round(p * 100);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);

    var finish = function () {
      if (done) return;
      done = true;
      try { sessionStorage.setItem('eg_intro', '1'); } catch (e) {}
      root.classList.remove('intro-on');
      root.classList.add('intro-done');
      ['click', 'wheel', 'touchstart', 'keydown'].forEach(function (t) {
        removeEventListener(t, skip);
      });
    };
    var skip = function (e) {
      if (e && e.type === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey)) return;
      finish();
    };
    ['click', 'wheel', 'touchstart', 'keydown'].forEach(function (t) {
      addEventListener(t, skip, { passive: true });
    });
    setTimeout(finish, DUR);
    /* вкладку увели в фон — анимация встала; добиваем по возврату */
    addEventListener('pageshow', function () {
      if (performance.now() - t0 > DUR) finish();
    });
  }

  /* ---------- 2. Мобильное меню ---------- */
  var burger = document.getElementById('burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mnav.hidden = open;
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      burger.setAttribute('aria-expanded', 'false');
      mnav.hidden = true;
    });
  }

  /* ---------- 3. Кнопка наверх ---------- */
  var totop = document.getElementById('totop');
  if (totop) {
    totop.hidden = false;
    var ticking = false;
    var sync = function () {
      totop.classList.toggle('on', scrollY > 700);
      ticking = false;
    };
    addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    }, { passive: true });
    sync();
    totop.addEventListener('click', function () {
      var soft = matchMedia('(prefers-reduced-motion: reduce)').matches;
      scrollTo({ top: 0, behavior: soft ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 4. Свечение под курсором на кнопках ---------- */
  if (!matchMedia('(hover: none)').matches) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        b.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- 5. Карусель работ ---------- */
  var rail = document.getElementById('rail');
  if (rail) {
    var slides = [].slice.call(rail.querySelectorAll('.slide'));
    var thumbs = [].slice.call(document.querySelectorAll('.thumb'));
    var tint = document.getElementById('workTint');
    var cur = 0;

    var paint = function (i) {
      cur = i;
      thumbs.forEach(function (t, k) { t.classList.toggle('on', k === i); });
      slides.forEach(function (s, k) {
        s.classList.toggle('on', k === i);
        s.classList.toggle('before', k < i);
        s.classList.toggle('after', k > i);
      });
      if (tint && slides[i]) tint.style.setProperty('--tint', slides[i].dataset.tint || '#1B2430');
    };
    var go = function (i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      rail.scrollTo({ left: slides[i].offsetLeft - rail.offsetLeft, behavior: 'smooth' });
      paint(i);
    };

    /* какой слайд в центре — по позиции скролла */
    var idle;
    rail.addEventListener('scroll', function () {
      clearTimeout(idle);
      idle = setTimeout(function () {
        var mid = rail.scrollLeft + rail.clientWidth / 2;
        var near = 0, best = Infinity;
        slides.forEach(function (s, k) {
          var c = s.offsetLeft - rail.offsetLeft + s.clientWidth / 2;
          var d = Math.abs(c - mid);
          if (d < best) { best = d; near = k; }
        });
        if (near !== cur) paint(near);
      }, 90);
    }, { passive: true });

    var prev = document.getElementById('railPrev');
    var next = document.getElementById('railNext');
    if (prev) prev.addEventListener('click', function () { go(cur - 1); });
    if (next) next.addEventListener('click', function () { go(cur + 1); });
    thumbs.forEach(function (t, k) {
      t.addEventListener('click', function (e) { e.preventDefault(); go(k); });
    });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(cur - 1); }
    });
    paint(0);
  }
})();
