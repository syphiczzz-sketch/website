// ── Scroll reveal ─────────────────────────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });
revealEls.forEach(el => revealObs.observe(el));

// ── Carousel ──────────────────────────────────────────────────────────────────
const track    = document.querySelector('[data-carousel-track]');
const cards    = track ? Array.from(track.children) : [];
const prevBtn  = document.querySelector('[data-carousel-prev]');
const nextBtn  = document.querySelector('[data-carousel-next]');

let carouselIdx = 0;
const perView   = () => window.innerWidth <= 640 ? 1 : 2;

function slideCarousel(dir) {
  const total = cards.length;
  const pv    = perView();
  carouselIdx = (carouselIdx + dir + total) % total;
  const pct   = (100 / pv) * carouselIdx;
  track.style.transform = `translateX(-${pct}%)`;
}

if (prevBtn) prevBtn.addEventListener('click', () => slideCarousel(-1));
if (nextBtn) nextBtn.addEventListener('click', () => slideCarousel( 1));

// ── Footer year ───────────────────────────────────────────────────────────────
const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Sticky header scroll shadow ───────────────────────────────────────────────
const header = document.querySelector('[data-header]');
window.addEventListener('scroll', () => {
  if (header) header.style.boxShadow = window.scrollY > 10
    ? '0 4px 24px rgba(0,0,0,0.07)'
    : 'none';
}, { passive: true });
