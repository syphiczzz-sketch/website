(function () {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const year = document.querySelector("[data-year]");
  const revealItems = document.querySelectorAll(".reveal");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function syncHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.tagName !== "A") return;
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
    const track = carousel.querySelector("[data-carousel-track]");
    const prev = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");

    if (!track) return;

    function scrollByCard(direction) {
      const card = track.querySelector(".testimonial");
      const amount = card ? card.getBoundingClientRect().width + 16 : track.clientWidth;
      track.scrollBy({ left: amount * direction, behavior: "smooth" });
    }

    if (prev) {
      prev.addEventListener("click", function () {
        scrollByCard(-1);
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        scrollByCard(1);
      });
    }
  });
})();
