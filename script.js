(() => {
    "use strict";

    const SITE_LOG_KEY = "axion_site_logs";
    const USER_TOKEN_KEY = "axion_user_token";
    const MAX_LOG_ENTRIES = 120;
    const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

    function loadLogs() {
        try {
            const raw = localStorage.getItem(SITE_LOG_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveLogs(entries) {
        localStorage.setItem(SITE_LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG_ENTRIES)));
    }

    function logSiteEvent(level, message, metadata = {}) {
        const entry = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            time: new Date().toISOString(),
            level,
            message,
            metadata
        };

        const logs = loadLogs();
        logs.unshift(entry);
        saveLogs(logs);

        if (level === "error") console.error("[Axion Web]", message, metadata);
    }

    function getSiteLogs() {
        return loadLogs();
    }

    function clearSiteLogs() {
        localStorage.removeItem(SITE_LOG_KEY);
        showAlert("Veebilehe logid puhastatud.", "success");
    }

    function showAlert(message, type = "info") {
        const alertDiv = document.createElement("div");
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 4500);
    }

    function attachNavigationState() {
        document.querySelectorAll(".nav-link").forEach((link) => {
            link.addEventListener("click", function () {
                document.querySelectorAll(".nav-link").forEach((navLink) => navLink.classList.remove("active"));
                this.classList.add("active");
            });
        });
    }

    function attachSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener("click", (event) => {
                const href = anchor.getAttribute("href");
                if (!href || href === "#") return;
                const target = document.querySelector(href);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }

    function initPageAnimation() {
        document.body.animate(
            [
                { opacity: 0, transform: "translateY(8px)" },
                { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 280, easing: "ease-out", fill: "forwards" }
        );
    }

    function purchaseItem(itemName, price) {
        logSiteEvent("info", "Ostu algatamine", { itemName, price });
        showAlert(`Valisid: ${itemName} (€${price}). Maksevoog lisatakse peagi.`, "info");
    }

    function getUserToken() {
        return localStorage.getItem(USER_TOKEN_KEY);
    }

    function setUserToken(token) {
        if (token) localStorage.setItem(USER_TOKEN_KEY, token);
        else localStorage.removeItem(USER_TOKEN_KEY);
    }

    function getApiUrl(path) {
        return `${API_BASE}${path}`;
    }

    async function apiRequest(path, payload = {}, method = "POST") {
        const headers = { "Content-Type": "application/json" };
        const token = getUserToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(getApiUrl(path), {
            method,
            headers,
            credentials: "include",
            body: method === "GET" ? undefined : JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Päring ebaõnnestus.");
        return data;
    }

    async function getCurrentUser() {
        const headers = {};
        const token = getUserToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(getApiUrl("/api/me"), { headers, credentials: "include" });
        if (!response.ok) return null;

        const data = await response.json().catch(() => ({}));
        if (!data.user) setUserToken(null);
        return data.user || null;
    }

    function setAuthTab(tabName) {
        document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
            tab.classList.toggle("is-active", tab.dataset.authTab === tabName);
        });
        document.querySelectorAll("[data-auth-view]").forEach((view) => {
            view.classList.toggle("is-active", view.dataset.authView === tabName);
        });
    }

    function setJoinAuthState(user) {
        const authPanel = document.getElementById("authPanel");
        const joinForm = document.getElementById("joinApplicationForm");
        const username = document.getElementById("joinUsername");
        const email = document.getElementById("joinEmail");
        if (!authPanel || !joinForm) return;

        authPanel.hidden = Boolean(user);
        joinForm.hidden = !user;
        if (username) username.textContent = user ? user.username : "";
        if (email) email.textContent = user ? `(${user.email})` : "";
    }

    function setButtonPending(button, pending) {
        if (!button) return;
        button.disabled = pending;
        button.classList.toggle("is-loading", pending);
    }

    function fillResetTokenFromUrl() {
        const resetToken = new URLSearchParams(window.location.search).get("reset");
        const resetInput = document.getElementById("resetToken");
        if (resetToken && resetInput) {
            resetInput.value = resetToken;
            setAuthTab("reset");
        }
    }

    function initJoinPage() {
        const loginForm = document.getElementById("loginUserForm");
        const registerForm = document.getElementById("registerUserForm");
        const forgotForm = document.getElementById("forgotPasswordForm");
        const resetForm = document.getElementById("resetPasswordForm");
        const joinForm = document.getElementById("joinApplicationForm");
        const logoutButton = document.getElementById("logoutUserButton");
        const applicationText = document.getElementById("applicationText");
        const counter = document.getElementById("applicationCounter");

        if (!loginForm || !registerForm || !forgotForm || !resetForm || !joinForm) return;

        document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
            tab.addEventListener("click", () => setAuthTab(tab.dataset.authTab));
        });

        fillResetTokenFromUrl();

        getCurrentUser()
            .then(setJoinAuthState)
            .catch(() => {
                setJoinAuthState(null);
                showAlert("Kasutaja süsteem vajab töötavat server.js protsessi aadressil localhost:3000.", "error");
            });

        applicationText.addEventListener("input", () => {
            counter.textContent = applicationText.value.length;
        });

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = loginForm.querySelector("button[type='submit']");
            setButtonPending(submitButton, true);

            try {
                const data = await apiRequest("/api/login", {
                    identifier: document.getElementById("loginIdentifier").value.trim(),
                    password: document.getElementById("loginPassword").value
                });
                setUserToken(data.token);
                setJoinAuthState(data.user);
                loginForm.reset();
                showAlert("Sisselogimine õnnestus.", "success");
            } catch (error) {
                showAlert(error.message, "error");
            } finally {
                setButtonPending(submitButton, false);
            }
        });

        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = registerForm.querySelector("button[type='submit']");
            setButtonPending(submitButton, true);

            try {
                const data = await apiRequest("/api/register", {
                    username: document.getElementById("registerUsername").value.trim(),
                    email: document.getElementById("registerEmail").value.trim(),
                    password: document.getElementById("registerPassword").value
                });
                setUserToken(data.token);
                setJoinAuthState(data.user);
                registerForm.reset();
                showAlert("Konto loodud ja oled sisse logitud.", "success");
            } catch (error) {
                showAlert(error.message, "error");
            } finally {
                setButtonPending(submitButton, false);
            }
        });

        forgotForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = forgotForm.querySelector("button[type='submit']");
            setButtonPending(submitButton, true);

            try {
                const data = await apiRequest("/api/forgot-password", {
                    email: document.getElementById("forgotEmail").value.trim()
                });
                forgotForm.reset();
                setAuthTab("reset");
                showAlert(data.message || "Kui konto eksisteerib, saadeti taastamise kiri.", "success");
            } catch (error) {
                showAlert(error.message, "error");
            } finally {
                setButtonPending(submitButton, false);
            }
        });

        resetForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = resetForm.querySelector("button[type='submit']");
            setButtonPending(submitButton, true);

            try {
                const data = await apiRequest("/api/reset-password", {
                    token: document.getElementById("resetToken").value.trim(),
                    password: document.getElementById("resetPassword").value
                });
                setUserToken(data.token);
                setJoinAuthState(data.user);
                resetForm.reset();
                showAlert("Parool muudetud ja oled sisse logitud.", "success");
            } catch (error) {
                showAlert(error.message, "error");
            } finally {
                setButtonPending(submitButton, false);
            }
        });

        logoutButton.addEventListener("click", async () => {
            try {
                await apiRequest("/api/logout", {});
            } finally {
                setUserToken(null);
                setJoinAuthState(null);
                setAuthTab("login");
                showAlert("Oled välja logitud.", "info");
            }
        });

        joinForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = joinForm.querySelector("button[type='submit']");
            setButtonPending(submitButton, true);

            try {
                await apiRequest("/api/join-applications", { message: applicationText.value });
                joinForm.reset();
                counter.textContent = "0";
                logSiteEvent("info", "Meeskonnaga liitumise avaldus saadetud");
                showAlert("Avaldus saadetud.", "success");
            } catch (error) {
                showAlert(error.message, "error");
            } finally {
                setButtonPending(submitButton, false);
            }
        });
    }

    window.addEventListener("error", (event) => {
        logSiteEvent("error", "JavaScripti viga", {
            message: event.message,
            file: event.filename,
            line: event.lineno,
            column: event.colno
        });
    });

    window.addEventListener("unhandledrejection", (event) => {
        logSiteEvent("error", "Töötlemata Promise'i viga", { reason: String(event.reason) });
    });

    document.addEventListener("DOMContentLoaded", () => {
        attachNavigationState();
        attachSmoothScroll();
        initJoinPage();
        initPageAnimation();
        logSiteEvent("info", "Leht avatud", { path: window.location.pathname });
    });

    window.showAlert = showAlert;
    window.purchaseItem = purchaseItem;
    window.logSiteEvent = logSiteEvent;
    window.getSiteLogs = getSiteLogs;
    window.clearSiteLogs = clearSiteLogs;
})();
