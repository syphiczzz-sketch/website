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

  function showToast(message) {
    const oldToast = document.querySelector(".toast");
    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    window.setTimeout(function () {
      toast.remove();
    }, 3600);
  }

  document.querySelectorAll("[data-toast]").forEach(function (element) {
    element.addEventListener("click", function () {
      showToast(element.getAttribute("data-toast") || "This action is simulated in the static build.");
    });
  });

  document.querySelectorAll("[data-static-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const password = form.querySelector('input[name="password"]');
      const confirmPassword = form.querySelector('input[name="confirmPassword"]');

      if (password && confirmPassword && password.value !== confirmPassword.value) {
        showToast("Passwords do not match.");
        return;
      }

      showToast(form.getAttribute("data-success") || "Form submitted in preview mode.");

      const submitButton = form.querySelector("[data-redirect]");
      const redirectUrl = submitButton ? submitButton.getAttribute("data-redirect") : null;
      if (redirectUrl) {
        window.setTimeout(function () {
          window.location.href = redirectUrl;
        }, 700);
      }
    });
  });

  const courseForm = document.querySelector("[data-course-form]");
  if (courseForm) {
    courseForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const data = new FormData(courseForm);
      const params = new URLSearchParams();
      params.set("topic", data.get("topic") || "New course");
      params.set("masteryLevel", data.get("masteryLevel") || "Normal Path");
      params.set("knowledgeLevel", data.get("knowledgeLevel") || "Beginner");
      params.set("courseMode", data.get("mode") || "Solo");
      window.location.href = "course-generation.html?" + params.toString();
    });
  }

  const progressBar = document.querySelector("[data-progress-bar]");
  const generationStatus = document.querySelector("[data-generation-status]");
  if (progressBar && generationStatus) {
    const statuses = [
      { progress: 12, text: "Validating topic...", step: 0 },
      { progress: 34, text: "Building course outline...", step: 1 },
      { progress: 62, text: "Generating lesson content...", step: 2 },
      { progress: 88, text: "Saving your course...", step: 3 },
      { progress: 100, text: "Course created successfully.", step: 3 },
    ];
    let index = 0;

    function tickGeneration() {
      const item = statuses[index];
      progressBar.style.width = item.progress + "%";
      generationStatus.textContent = item.text;
      document.querySelectorAll("[data-gen-step]").forEach(function (step, stepIndex) {
        step.classList.toggle("is-active", stepIndex <= item.step);
      });

      index += 1;
      if (index < statuses.length) {
        window.setTimeout(tickGeneration, 900);
      }
    }

    tickGeneration();
  }

  const canvas = document.querySelector("[data-whiteboard]");
  if (canvas) {
    const context = canvas.getContext("2d");
    let drawing = false;
    let color = "#1c1814";

    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";

    function getPoint(event) {
      const rect = canvas.getBoundingClientRect();
      const source = event.touches ? event.touches[0] : event;
      return {
        x: ((source.clientX - rect.left) / rect.width) * canvas.width,
        y: ((source.clientY - rect.top) / rect.height) * canvas.height,
      };
    }

    function startDrawing(event) {
      drawing = true;
      const point = getPoint(event);
      context.beginPath();
      context.moveTo(point.x, point.y);
      event.preventDefault();
    }

    function draw(event) {
      if (!drawing) return;
      const point = getPoint(event);
      context.strokeStyle = color;
      context.lineTo(point.x, point.y);
      context.stroke();
      event.preventDefault();
    }

    function stopDrawing() {
      drawing = false;
    }

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    window.addEventListener("touchend", stopDrawing);

    document.querySelectorAll("[data-board-color]").forEach(function (button) {
      button.addEventListener("click", function () {
        color = button.getAttribute("data-board-color") || color;
        document.querySelectorAll("[data-board-color]").forEach(function (item) {
          item.classList.remove("active");
        });
        button.classList.add("active");
      });
    });

    const clearButton = document.querySelector("[data-board-clear]");
    if (clearButton) {
      clearButton.addEventListener("click", function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
      });
    }
  }
})();
