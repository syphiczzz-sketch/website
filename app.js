const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const updateList = document.getElementById('updateList');
const formTitle = document.getElementById('formTitle');
const titleInput = document.getElementById('title');
const tagInput = document.getElementById('tag');
const summaryInput = document.getElementById('summary');
const createdAtInput = document.getElementById('createdAt');
const activeInput = document.getElementById('active');
const bodyEditor = document.getElementById('bodyEditor');
const saveButton = document.getElementById('saveUpdate');
const deleteButton = document.getElementById('deleteUpdate');
const newButton = document.getElementById('newUpdate');
const logoutButton = document.getElementById('logout');
const feedbackTitle = document.getElementById('feedbackTitle');
const feedbackSummary = document.getElementById('feedbackSummary');
const feedbackList = document.getElementById('feedbackList');
const refreshFeedbackButton = document.getElementById('refreshFeedback');

const basePath = (() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length > 0 && parts[0] !== 'admin' ? `/${parts[0]}` : '';
})();

let csrf = '';
let updates = [];
let currentId = null;

const USE_MOCK_API = true;

function apiPath(path) {
    return `${basePath}/api${path}`;
}

// Simple in-memory mock API for local/dev usage (no backend required)
const MockAPI = (() => {
    let nextUpdateId = 2;
    let nextFeedbackId = 2;
    let updatesMock = [
        {
            id: 1,
            title: 'Esimene uuendus',
            tag: 'Patch 1.0',
            summary: 'Algne versioon',
            createdAt: Math.floor(Date.now() / 1000),
            active: true,
            bodyHtml: '<p>Tere tulemast!</p>'
        }
    ];

    let feedbackMock = [
        {
            id: 1,
            updateId: 1,
            playerName: 'Mängija1',
            rating: 4,
            comment: 'Hea uuendus',
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000)
        }
    ];

    const CSRF_TOKEN = 'dev-csrf-token';

    function parseBody(raw) {
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
    }

    async function handle(path, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const body = parseBody(options.body || '');

        if (path === '/me' && method === 'GET') {
            return { status: 200, data: { csrf: CSRF_TOKEN, user: { username: 'admin' } } };
        }

        if (path === '/login' && method === 'POST') {
            return { status: 200, data: { csrf: CSRF_TOKEN } };
        }

        if (path === '/logout' && method === 'POST') {
            return { status: 200, data: {} };
        }

        if (path === '/updates' && method === 'GET') {
            return { status: 200, data: { updates: updatesMock } };
        }

        if (path === '/updates' && method === 'POST') {
            const newUpdate = {
                id: nextUpdateId++,
                title: body.title || '',
                tag: body.tag || '',
                summary: body.summary || '',
                createdAt: Number(body.createdAt) || Math.floor(Date.now() / 1000),
                active: body.active === undefined ? true : !!body.active,
                bodyHtml: body.bodyHtml || ''
            };
            updatesMock.unshift(newUpdate);
            return { status: 200, data: { update: newUpdate } };
        }

        const updMatch = path.match(/^\/updates\/(\d+)$/);
        if (updMatch) {
            const id = Number(updMatch[1]);
            const idx = updatesMock.findIndex(u => u.id === id);

            if (method === 'GET') {
                if (idx >= 0) return { status: 200, data: { update: updatesMock[idx] } };
                return { status: 404, data: { error: 'Not found' } };
            }

            if (method === 'DELETE') {
                if (idx >= 0) { updatesMock.splice(idx, 1); return { status: 200, data: {} }; }
                return { status: 404, data: { error: 'Not found' } };
            }

            if (method === 'PUT') {
                if (idx < 0) return { status: 404, data: { error: 'Not found' } };
                const u = updatesMock[idx];
                u.title = body.title !== undefined ? body.title : u.title;
                u.tag = body.tag !== undefined ? body.tag : u.tag;
                u.summary = body.summary !== undefined ? body.summary : u.summary;
                u.createdAt = body.createdAt !== undefined ? Number(body.createdAt) : u.createdAt;
                u.active = body.active !== undefined ? !!body.active : u.active;
                u.bodyHtml = body.bodyHtml !== undefined ? body.bodyHtml : u.bodyHtml;
                return { status: 200, data: { update: u } };
            }
        }

        const fbMatch = path.match(/^\/feedback\/(\d+)$/);
        if (fbMatch) {
            const identifier = Number(fbMatch[1]);
            if (method === 'GET') {
                return { status: 200, data: { feedback: feedbackMock.filter(f => f.updateId === identifier) } };
            }
            if (method === 'DELETE') {
                const idx = feedbackMock.findIndex(f => f.id === identifier);
                if (idx >= 0) { feedbackMock.splice(idx, 1); return { status: 200, data: {} }; }
                return { status: 404, data: { error: 'Not found' } };
            }
        }

        return { status: 404, data: { error: 'NOT_FOUND' } };
    }

    return { handle, CSRF_TOKEN };
})();

async function request(path, options = {}) {
    if (USE_MOCK_API) {
        const resp = await MockAPI.handle(path, options);
        if (resp.status >= 400) {
            const err = resp.data && resp.data.error ? resp.data.error : `HTTP ${resp.status}`;
            throw new Error(err);
        }
        return resp.data;
    }

    const url = apiPath(path);
    const headers = {
        'Content-Type': 'text/plain; charset=UTF-8',
        ...(options.headers || {})
    };

    if (csrf && options.method && options.method !== 'GET') {
        headers['X-CSRF-Token'] = csrf;
    }

    const response = await fetch(url, {
        credentials: 'same-origin',
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
        throw new Error(data.error || `Päring ebaõnnestus. HTTP ${response.status}. URL: ${url}`);
    }

    return data;
}

function showAdmin() {
    loginView.classList.add('hidden');
    adminView.classList.remove('hidden');
}

function showLogin() {
    adminView.classList.add('hidden');
    loginView.classList.remove('hidden');
}

function toLocalDateTime(timestamp) {
    const date = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalDateTime(value) {
    if (!value) return Math.floor(Date.now() / 1000);
    return Math.floor(new Date(value).getTime() / 1000);
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat('et-EE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(Number(timestamp) * 1000));
}

function escapeText(value) {
    return value == null ? '' : String(value);
}

function renderList() {
    updateList.innerHTML = '';

    if (updates.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'error';
        empty.textContent = 'Uuendusi pole veel lisatud.';
        updateList.appendChild(empty);
        return;
    }

    for (const update of updates) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `update-item${update.id === currentId ? ' active' : ''}`;

        const title = document.createElement('strong');
        title.textContent = update.title;

        const meta = document.createElement('span');
        meta.textContent = `${formatDate(update.createdAt)}${update.active === false ? ' · peidetud' : ''}`;

        button.append(title, meta);
        button.addEventListener('click', () => selectUpdate(update.id));
        updateList.appendChild(button);
    }
}

function selectUpdate(id) {
    const update = updates.find((item) => item.id === id);
    if (!update) return;

    currentId = update.id;
    formTitle.textContent = 'Muuda uuendust';
    titleInput.value = update.title || '';
    tagInput.value = update.tag || '';
    summaryInput.value = update.summary || '';
    createdAtInput.value = toLocalDateTime(update.createdAt);
    activeInput.checked = update.active !== false;
    bodyEditor.innerHTML = update.bodyHtml || '';
    deleteButton.classList.remove('hidden');
    renderList();
    loadFeedback(update.id);
}

function newUpdate() {
    currentId = null;
    formTitle.textContent = 'Uus uuendus';
    titleInput.value = '';
    tagInput.value = '';
    summaryInput.value = '';
    createdAtInput.value = toLocalDateTime();
    activeInput.checked = true;
    bodyEditor.innerHTML = '';
    deleteButton.classList.add('hidden');
    renderList();
    loadFeedback(updates[0]?.id || '');
}

function formPayload() {
    return {
        title: titleInput.value.trim(),
        tag: tagInput.value.trim(),
        summary: summaryInput.value.trim(),
        createdAt: fromLocalDateTime(createdAtInput.value),
        active: activeInput.checked,
        bodyHtml: bodyEditor.innerHTML.trim()
    };
}

async function loadUpdates(selectLatest = false) {
    const data = await request('/updates');
    updates = data.updates || [];
    renderList();

    if (selectLatest && updates[0]) {
        selectUpdate(updates[0].id);
    } else if (!currentId) {
        newUpdate();
    } else {
        selectUpdate(currentId);
    }
}

function renderFeedback(items) {
    feedbackList.innerHTML = '';

    const count = items.length;
    const total = items.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

    feedbackSummary.innerHTML = '';
    const averageMetric = document.createElement('div');
    averageMetric.className = 'metric';
    averageMetric.innerHTML = `<strong>${average}/5</strong><span>Keskmine hinnang</span>`;

    const countMetric = document.createElement('div');
    countMetric.className = 'metric';
    countMetric.innerHTML = `<strong>${count}</strong><span>Hinnanguid kokku</span>`;
    feedbackSummary.append(averageMetric, countMetric);

    if (items.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'error';
        empty.textContent = 'Sellele uuendusele pole veel hinnanguid.';
        feedbackList.appendChild(empty);
        return;
    }

    for (const item of items) {
        const card = document.createElement('article');
        card.className = 'feedback-card';

        const header = document.createElement('header');
        const name = document.createElement('strong');
        name.textContent = item.playerName || 'Unknown';
        const stars = document.createElement('span');
        stars.className = 'stars';
        stars.textContent = '★'.repeat(Number(item.rating || 0)).padEnd(5, '☆');
        header.append(name, stars);

        const comment = document.createElement('p');
        comment.textContent = item.comment || 'Kommentaari pole lisatud.';

        const footer = document.createElement('footer');
        footer.textContent = formatDate(item.updatedAt || item.createdAt);

        const deleteFeedback = document.createElement('button');
        deleteFeedback.type = 'button';
        deleteFeedback.className = 'small-danger';
        deleteFeedback.textContent = 'Kustuta hinnang';
        deleteFeedback.addEventListener('click', async () => {
            await request(`/feedback/${item.id}`, { method: 'DELETE' });
            await loadFeedback(currentId);
        });

        card.append(header, comment, footer, deleteFeedback);
        feedbackList.appendChild(card);
    }
}

async function loadFeedback(updateId = currentId) {
    const selected = updates.find((item) => item.id === updateId);
    feedbackTitle.textContent = selected ? `Tagasiside: ${selected.title}` : 'Viimase uuenduse tagasiside';

    if (!updateId) {
        renderFeedback([]);
        return;
    }

    const data = await request(`/feedback/${encodeURIComponent(updateId)}`);
    renderFeedback(data.feedback || []);
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';

    try {
        const data = await request('/login', {
            method: 'POST',
            body: JSON.stringify({
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            })
        });

        csrf = data.csrf || '';
        showAdmin();
        await loadUpdates(true);
    } catch (error) {
        loginError.textContent = error.message;
    }
});

saveButton.addEventListener('click', async () => {
    const payload = formPayload();

    if (!payload.title) {
        titleInput.focus();
        return;
    }

    if (currentId) {
        await request(`/updates/${currentId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
        const data = await request('/updates', { method: 'POST', body: JSON.stringify(payload) });
        currentId = data.update.id;
    }

    await loadUpdates(false);
});

deleteButton.addEventListener('click', async () => {
    if (!currentId) return;
    const title = updates.find((item) => item.id === currentId)?.title || 'see uuendus';
    if (!window.confirm(`Kustutada "${title}"?`)) return;

    await request(`/updates/${currentId}`, { method: 'DELETE' });
    currentId = null;
    await loadUpdates(true);
});

newButton.addEventListener('click', newUpdate);
refreshFeedbackButton.addEventListener('click', () => loadFeedback(currentId));

logoutButton.addEventListener('click', async () => {
    await request('/logout', { method: 'POST', body: '{}' }).catch(() => {});
    csrf = '';
    showLogin();
});

document.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => {
        bodyEditor.focus();
        document.execCommand(button.dataset.command, false, null);
    });
});

document.getElementById('divider').addEventListener('click', () => {
    bodyEditor.focus();
    document.execCommand('insertHTML', false, '<hr class="axion-divider">');
});

(async function boot() {
    try {
        const data = await request('/me');
        csrf = data.csrf || '';
        showAdmin();
        await loadUpdates(true);
    } catch {
        showLogin();
    }
})();
