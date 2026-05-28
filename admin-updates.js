(() => {
    "use strict";

    const state = {
        csrf: "",
        updates: [],
        currentId: null
    };

    const $ = (id) => document.getElementById(id);

    function notify(message, type = "info") {
        if (typeof window.showAlert === "function") {
            window.showAlert(message, type);
            return;
        }

        window.alert(message);
    }

    function apiPath(path) {
        return new URL(`../api${path}`, window.location.href).toString();
    }

    async function request(path, options = {}) {
        const headers = {
            "Content-Type": "text/plain; charset=UTF-8",
            ...(options.headers || {})
        };

        if (state.csrf && options.method && options.method !== "GET") {
            headers["X-CSRF-Token"] = state.csrf;
        }

        const response = await fetch(apiPath(path), {
            credentials: "same-origin",
            ...options,
            headers
        });

        const raw = await response.text();
        let data = {};
        try {
            data = raw ? JSON.parse(raw) : {};
        } catch {
            data = { error: raw || `HTTP ${response.status}` };
        }

        if (!response.ok || data.ok === false) {
            throw new Error(data.error || `Päring ebaõnnestus. HTTP ${response.status}`);
        }

        return data;
    }

    function showDashboard(username) {
        $("loginForm").style.display = "none";
        $("adminDashboard").style.display = "block";
        $("adminName").textContent = username;
        $("settingsAdminName").textContent = username;
    }

    function showLogin() {
        $("loginForm").style.display = "block";
        $("adminDashboard").style.display = "none";
    }

    function switchTab(tabName) {
        document.querySelectorAll(".admin-section").forEach((section) => {
            section.style.display = section.id === tabName ? "block" : "none";
        });

        if (tabName === "logs") renderSiteLogs();
        if (tabName === "feedback") loadFeedback();
        if (tabName === "updates") loadUpdates(false);
    }

    function toLocalDateTime(timestamp) {
        const date = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    function fromLocalDateTime(value) {
        return value ? Math.floor(new Date(value).getTime() / 1000) : Math.floor(Date.now() / 1000);
    }

    function formatDate(timestamp) {
        if (!timestamp) return "";
        return new Intl.DateTimeFormat("et-EE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(Number(timestamp) * 1000));
    }

    function renderUpdateList() {
        const target = $("updateList");
        target.innerHTML = "";
        $("updateCount").textContent = state.updates.length;

        if (!state.updates.length) {
            target.innerHTML = '<div class="admin-card"><p>Uuendusi pole veel lisatud.</p></div>';
            return;
        }

        for (const update of state.updates) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `admin-update-item${update.id === state.currentId ? " active" : ""}`;
            button.innerHTML = `<strong></strong><span></span>`;
            button.querySelector("strong").textContent = update.title || "Pealkirjata";
            button.querySelector("span").textContent = `${formatDate(update.createdAt)}${update.active === false ? " · peidetud" : ""}`;
            button.addEventListener("click", () => selectUpdate(update.id));
            target.appendChild(button);
        }
    }

    function selectUpdate(id) {
        const update = state.updates.find((item) => item.id === id);
        if (!update) return;

        state.currentId = update.id;
        $("updateTitle").value = update.title || "";
        $("updateTag").value = update.tag || "";
        $("updateSummary").value = update.summary || "";
        $("updateCreatedAt").value = toLocalDateTime(update.createdAt);
        $("updateActive").checked = update.active !== false;
        $("updateBodyEditor").innerHTML = update.bodyHtml || "";
        $("deleteUpdateButton").hidden = false;
        renderUpdateList();
        loadFeedback(update.id);
    }

    function newUpdate() {
        state.currentId = null;
        $("updateTitle").value = "";
        $("updateTag").value = "";
        $("updateSummary").value = "";
        $("updateCreatedAt").value = toLocalDateTime();
        $("updateActive").checked = true;
        $("updateBodyEditor").innerHTML = "";
        $("deleteUpdateButton").hidden = true;
        renderUpdateList();
    }

    function updatePayload() {
        return {
            title: $("updateTitle").value.trim(),
            tag: $("updateTag").value.trim(),
            summary: $("updateSummary").value.trim(),
            createdAt: fromLocalDateTime($("updateCreatedAt").value),
            active: $("updateActive").checked,
            bodyHtml: $("updateBodyEditor").innerHTML.trim()
        };
    }

    async function loadUpdates(selectLatest = true) {
        const data = await request("/updates");
        state.updates = data.updates || [];
        renderUpdateList();

        if (state.currentId && state.updates.some((item) => item.id === state.currentId)) {
            selectUpdate(state.currentId);
        } else if (selectLatest && state.updates[0]) {
            selectUpdate(state.updates[0].id);
        } else if (!state.currentId) {
            newUpdate();
        }
    }

    async function saveUpdate() {
        const payload = updatePayload();
        if (!payload.title) {
            $("updateTitle").focus();
            notify("Pealkiri on kohustuslik.", "error");
            return;
        }

        if (state.currentId) {
            await request(`/updates/${state.currentId}`, { method: "PUT", body: JSON.stringify(payload) });
            notify("Uuendus salvestatud.", "success");
        } else {
            const data = await request("/updates", { method: "POST", body: JSON.stringify(payload) });
            state.currentId = data.update.id;
            notify("Uuendus lisatud.", "success");
        }

        await loadUpdates(false);
    }

    async function deleteUpdate() {
        if (!state.currentId) return;

        const current = state.updates.find((item) => item.id === state.currentId);
        if (!window.confirm(`Kustutada "${current?.title || "see uuendus"}"?`)) return;

        await request(`/updates/${state.currentId}`, { method: "DELETE" });
        state.currentId = null;
        notify("Uuendus kustutatud.", "success");
        await loadUpdates(true);
    }

    function renderFeedback(items = []) {
        const list = $("feedbackList");
        const summary = $("feedbackSummary");
        list.innerHTML = "";
        summary.innerHTML = "";

        $("feedbackCount").textContent = items.length;

        const total = items.reduce((sum, item) => sum + Number(item.rating || 0), 0);
        const average = items.length ? Math.round((total / items.length) * 10) / 10 : 0;
        summary.innerHTML = `
            <div class="admin-card"><h3>Keskmine</h3><p class="admin-metric">${average}/5</p></div>
            <div class="admin-card"><h3>Kokku</h3><p class="admin-metric">${items.length}</p></div>
        `;

        if (!items.length) {
            list.innerHTML = '<div class="admin-card"><p>Hinnanguid pole veel.</p></div>';
            return;
        }

        for (const item of items) {
            const card = document.createElement("article");
            card.className = "admin-feedback-card";
            card.innerHTML = `
                <header><strong></strong><span class="admin-stars"></span></header>
                <p></p>
                <footer></footer>
                <button class="admin-button danger" type="button">Kustuta hinnang</button>
            `;
            card.querySelector("strong").textContent = item.playerName || "Unknown";
            card.querySelector(".admin-stars").textContent = "★".repeat(Number(item.rating || 0)).padEnd(5, "☆");
            card.querySelector("p").textContent = item.comment || "Kommentaari pole lisatud.";
            card.querySelector("footer").textContent = formatDate(item.updatedAt || item.createdAt);
            card.querySelector("button").addEventListener("click", async () => {
                await request(`/feedback/${item.id}`, { method: "DELETE" });
                await loadFeedback();
            });
            list.appendChild(card);
        }
    }

    async function loadFeedback(updateId = state.currentId) {
        if (!updateId) {
            renderFeedback([]);
            return;
        }

        const data = await request(`/feedback/${encodeURIComponent(updateId)}`);
        renderFeedback(data.feedback || []);
    }

    function renderSiteLogs() {
        const logs = typeof window.getSiteLogs === "function" ? window.getSiteLogs() : [];
        const count = $("siteLogCount");
        const target = $("siteLogs");
        if (count) count.textContent = logs.length;
        if (!target) return;
        target.innerHTML = logs.length
            ? logs.map((entry) => `<div class="site-log-row"><strong>${entry.level}</strong><span>${new Date(entry.time).toLocaleString("et-EE")}</span><p>${entry.message}</p></div>`).join("")
            : "<p>Logisid pole veel.</p>";
    }

    function bindEvents() {
        $("adminLoginForm").addEventListener("submit", async (event) => {
            event.preventDefault();

            try {
                const data = await request("/login", {
                    method: "POST",
                    body: JSON.stringify({
                        username: $("username").value.trim(),
                        password: $("password").value
                    })
                });
                state.csrf = data.csrf || "";
                showDashboard("root");
                await loadUpdates(true);
                notify("Edukalt sisselogitud.", "success");
            } catch (error) {
                notify(error.message, "error");
            }
        });

        $("logoutButton").addEventListener("click", async () => {
            await request("/logout", { method: "POST", body: "{}" }).catch(() => {});
            state.csrf = "";
            state.updates = [];
            state.currentId = null;
            showLogin();
            notify("Oled välja logitud.", "info");
        });

        document.querySelectorAll("[data-tab]").forEach((button) => {
            button.addEventListener("click", () => switchTab(button.dataset.tab));
        });

        $("newUpdateButton").addEventListener("click", newUpdate);
        $("saveUpdateButton").addEventListener("click", () => saveUpdate().catch((error) => notify(error.message, "error")));
        $("deleteUpdateButton").addEventListener("click", () => deleteUpdate().catch((error) => notify(error.message, "error")));
        $("refreshFeedbackButton").addEventListener("click", () => loadFeedback().catch((error) => notify(error.message, "error")));
        $("refreshLogsButton").addEventListener("click", renderSiteLogs);
        $("clearLogsButton").addEventListener("click", () => {
            if (typeof window.clearSiteLogs === "function") window.clearSiteLogs();
            renderSiteLogs();
        });

        document.querySelectorAll("[data-command]").forEach((button) => {
            button.addEventListener("click", () => {
                $("updateBodyEditor").focus();
                document.execCommand(button.dataset.command, false, null);
            });
        });

        $("insertDividerButton").addEventListener("click", () => {
            $("updateBodyEditor").focus();
            document.execCommand("insertHTML", false, '<hr class="axion-divider">');
        });
    }

    document.addEventListener("DOMContentLoaded", async () => {
        bindEvents();

        try {
            const data = await request("/me");
            state.csrf = data.csrf || "";
            showDashboard(data.username || "root");
            await loadUpdates(true);
        } catch {
            showLogin();
        }
    });
})();
