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

  /* ---------- 4. Пламенная кнопка: свечение идёт за курсором ---------- */
  if (!matchMedia('(hover: none)').matches) {
    document.querySelectorAll('.flame').forEach(function (wrap) {
      var btn = wrap.querySelector('.flame__btn');
      var spot = wrap.querySelector('.flame__spot');
      if (!btn) return;
      var target = 0, shown = 0, raf = null;

      var tick = function () {
        var d = target - shown;
        if (Math.abs(d) < 0.004) { shown = target; raf = null; }
        else { shown += d * 0.16; raf = requestAnimationFrame(tick); }
        wrap.style.setProperty('--edge', shown.toFixed(3));
      };
      var kick = function () { if (!raf) raf = requestAnimationFrame(tick); };

      wrap.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left;
        var n = r.width ? x / r.width : 0.5;
        /* чем ближе к краю, тем ярче ореол — как в исходном компоненте */
        target = Math.pow(Math.min(1, Math.abs(n - 0.5) * 2), 1.6);
        wrap.style.setProperty('--side', (n >= 0.5 ? 88 : 12) + '%');
        if (spot) spot.style.setProperty('--mx', x + 'px');
        kick();
      });
      wrap.addEventListener('pointerleave', function () { target = 0; kick(); });
    });
  }

  /* ---------- 5. Карусель работ ---------- */
  var deck = document.getElementById('deck');
  if (deck) {
    var all = [].slice.call(deck.querySelectorAll('.pane'));
    var bg = document.getElementById('workBg');
    var ths = [].slice.call(document.querySelectorAll('.th'));
    var live = all;          // текущая выборка после фильтра
    var cur = 0;

    var layout = function () {
      all.forEach(function (p) { p.classList.toggle('hide', live.indexOf(p) === -1); });
      live.forEach(function (p, k) {
        var off = k - cur;
        p.style.setProperty('--o', off);
        var a = Math.abs(off);
        p.dataset.off = a > 2 ? '' : String(off);
        p.classList.toggle('far', a > 2);
        p.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
      });
      ths.forEach(function (t) {
        var p = all[Number(t.dataset.go)];
        var k = live.indexOf(p);
        t.hidden = k === -1;
        t.classList.toggle('on', k === cur);
      });
      var act = live[cur];
      if (bg && act) {
        bg.style.setProperty('--tint', act.dataset.tint || '#16211D');
        bg.style.setProperty('--ring', act.dataset.ring || '#2C4A3E');
      }
      var pv = document.getElementById('deckPrev');
      var nx = document.getElementById('deckNext');
      if (pv) pv.disabled = cur <= 0;
      if (nx) nx.disabled = cur >= live.length - 1;
    };
    var go = function (i) {
      cur = Math.max(0, Math.min(live.length - 1, i));
      layout();
    };

    var pv = document.getElementById('deckPrev');
    var nx = document.getElementById('deckNext');
    if (pv) pv.addEventListener('click', function () { go(cur - 1); });
    if (nx) nx.addEventListener('click', function () { go(cur + 1); });
    ths.forEach(function (t) {
      t.addEventListener('click', function () {
        var k = live.indexOf(all[Number(t.dataset.go)]);
        if (k > -1) go(k);
      });
    });
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(cur - 1); }
    });

    /* свайп пальцем */
    var x0 = null;
    deck.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(cur + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });

    /* фильтр «Все / Действующие / Демо» */
    [].slice.call(document.querySelectorAll('.seg input')).forEach(function (r) {
      r.addEventListener('change', function () {
        var v = r.value;
        live = v === 'all' ? all : all.filter(function (p) { return p.dataset.kind === v; });
        cur = 0;
        layout();
      });
    });

    layout();
  }
})();
