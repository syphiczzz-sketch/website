// ── Reveal on scroll ──────────────────────────────────────────────────────────
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(function (el) { obs.observe(el); });
}());

// ── Carousel ──────────────────────────────────────────────────────────────────
(function () {
  var track   = document.querySelector('[data-carousel-track]');
  var prevBtn = document.querySelector('[data-carousel-prev]');
  var nextBtn = document.querySelector('[data-carousel-next]');
  if (!track) return;

  var cards = track.children;
  var idx   = 0;

  function perView() { return window.innerWidth <= 640 ? 1 : 2; }

  function slide(dir) {
    var total = cards.length;
    var pv    = perView();
    idx = (idx + dir + total) % total;
    // Clamp so we never scroll past the last card
    if (idx > total - pv) idx = 0;
    var pct = (100 / pv) * idx;
    track.style.transform = 'translateX(-' + pct + '%)';
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { slide(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { slide(1); });
}());

// ── Footer year ───────────────────────────────────────────────────────────────
document.querySelectorAll('[data-year]').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});

// ── Sticky header scroll shadow ───────────────────────────────────────────────
(function () {
  var header = document.querySelector('[data-header]');
  if (!header) return;
  window.addEventListener('scroll', function () {
    header.style.boxShadow = window.scrollY > 10
      ? '0 4px 24px rgba(0,0,0,0.07)'
      : 'none';
  }, { passive: true });
}());
