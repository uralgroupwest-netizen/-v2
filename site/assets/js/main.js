/* Заставка. Флаг intro-on уже поставлен инлайн-скриптом в <head>. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('intro-on')) return;

  var DUR = 1600;                 // общая длительность, мс
  var num = document.getElementById('introNum');
  var t0 = performance.now();
  var done = false;

  /* счётчик 0 → 100 за первые 0,6 с */
  (function tick(now) {
    if (done) return;
    var p = Math.min((now - t0) / 600, 1);
    if (num) num.textContent = Math.round(p * 100);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);

  function finish() {
    if (done) return;
    done = true;
    try { sessionStorage.setItem('eg_intro', '1'); } catch (e) {}
    root.classList.remove('intro-on');
    root.classList.add('intro-done');
    off();
  }

  function skip(e) {
    /* не перехватываем клики по ссылкам и клавиши-модификаторы */
    if (e && e.type === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey)) return;
    finish();
  }
  function on()  { ['click','wheel','touchstart','keydown'].forEach(function(t){ addEventListener(t, skip, {passive:true}); }); }
  function off() { ['click','wheel','touchstart','keydown'].forEach(function(t){ removeEventListener(t, skip); }); }

  on();
  setTimeout(finish, DUR);
  /* страховка: если вкладку увели в фон, анимация встанет — добиваем по возврату */
  addEventListener('pageshow', function () { if (performance.now() - t0 > DUR) finish(); });
})();
