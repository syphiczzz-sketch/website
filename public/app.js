const header = document.querySelector(".site-header");
const navigationToggle = document.querySelector(".nav-toggle");
const navigation = document.querySelector(".site-nav");
const applicationForm = document.querySelector("#application-form");
const formStatus = document.querySelector("#form-status");
const submitButton = document.querySelector(".submit-button");
const year = document.querySelector("#current-year");

if (year) year.textContent = new Date().getFullYear();

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 18);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

navigationToggle?.addEventListener("click", () => {
  const isOpen = navigation?.classList.toggle("open") || false;
  navigationToggle.setAttribute("aria-expanded", String(isOpen));
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    navigationToggle?.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px" }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

function setFormStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = type;
}

function serializeApplication(form) {
  const data = new FormData(form);
  return {
    handle: data.get("handle"),
    discord: data.get("discord"),
    timezone: data.get("timezone"),
    role: data.get("role"),
    experience: data.get("experience"),
    tools: data.get("tools"),
    portfolio: data.get("portfolio"),
    hours: Number(data.get("hours")),
    contribution: data.get("contribution"),
    motivation: data.get("motivation"),
    company: data.get("company"),
    ageConfirmed: data.get("ageConfirmed") === "on",
    compensationAccepted: data.get("compensationAccepted") === "on",
    originalWorkAccepted: data.get("originalWorkAccepted") === "on",
    privacyAccepted: data.get("privacyAccepted") === "on"
  };
}

applicationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormStatus("");

  if (!applicationForm.checkValidity()) {
    applicationForm.reportValidity();
    setFormStatus("Please complete every required field.", "error");
    return;
  }

  if (window.location.protocol === "file:") {
    setFormStatus(
      "Run the website with npm start before submitting an application.",
      "error"
    );
    return;
  }

  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Sending application";

  try {
    const response = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializeApplication(applicationForm))
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "The application could not be submitted.");
    }

    applicationForm.reset();
    setFormStatus(
      `Application ${result.applicationId || ""} was submitted successfully. We will contact shortlisted applicants on Discord.`,
      "success"
    );
  } catch (error) {
    setFormStatus(error.message || "The application could not be submitted.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Submit application";
  }
});
