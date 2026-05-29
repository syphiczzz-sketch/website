const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const updateList = document.getElementById('updateList');
const formTitle = document.getElementById('formTitle');
const titleInput = document.getElementById('title');
const tagInput = document.getElementById('tag');
const summaryInput = document.getElementById('summary');
const activeInput = document.getElementById('active');
const bodyEditor = document.getElementById('bodyEditor');
const saveButton = document.getElementById('saveUpdate');
const deleteButton = document.getElementById('deleteUpdate');
const newButton = document.getElementById('newUpdate');
const logoutButton = document.getElementById('logout');
const saveStatus = document.getElementById('saveStatus');
const searchInput = document.getElementById('searchUpdates');
const feedbackTitle = document.getElementById('feedbackTitle');
const feedbackSummary = document.getElementById('feedbackSummary');
const feedbackList = document.getElementById('feedbackList');
const refreshFeedbackButton = document.getElementById('refreshFeedback');

let csrf = '';
let updates = [];
let currentId = null;
let searchTerm = '';
const ADMIN_KEYWORD = '140311';

function apiPath(path) {
    const localApi = 'http://localhost:3000';

    if (window.location.hostname === 'localhost' && window.location.port === '3000') {
        return `/api${path}`;
    }

    return `${localApi}/api${path}`;
}

async function request(path, options = {}) {
    const url = apiPath(path);
    const headers = {
        'Content-Type': 'text/plain; charset=UTF-8',
        ...(options.headers || {})
    };

    let response;

    try {
        response = await fetch(url, {
            credentials: url.startsWith('http://localhost:3000') ? 'omit' : 'same-origin',
            ...options,
            headers
        });
    } catch {
        throw new Error('Localhost API ei vasta. Paneel on avatud, aga uuenduste laadimiseks peab node server.js jooksma.');
    }

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

function loadUpdatesIntoPanel(selectLatest = false) {
    return loadUpdates(selectLatest).catch((error) => {
        setSaveStatus(error.message, 'error');

        if (updates.length === 0) {
            newUpdate();
        }
    });
}

function showAdmin() {
    loginView.classList.add('hidden');
    adminView.classList.remove('hidden');
}

function showLogin() {
    adminView.classList.add('hidden');
    loginView.classList.remove('hidden');
}

function setSaveStatus(message, type = '') {
    saveStatus.textContent = message;
    saveStatus.className = `save-status${type ? ` ${type}` : ''}`;
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
    const filteredUpdates = updates.filter((update) => {
        if (!searchTerm) return true;

        return [update.title, update.tag, update.summary, update.bodyHtml]
            .map((value) => String(value || '').toLowerCase())
            .some((value) => value.includes(searchTerm));
    });

    if (filteredUpdates.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'error';
        empty.textContent = updates.length === 0 ? 'Uuendusi pole veel lisatud.' : 'Otsingule vastavaid uuendusi pole.';
        updateList.appendChild(empty);
        return;
    }

    for (const update of filteredUpdates) {
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
    activeInput.checked = update.active !== false;
    bodyEditor.innerHTML = update.bodyHtml || '';
    deleteButton.classList.remove('hidden');
    setSaveStatus('');
    renderList();
    loadFeedback(update.id);
}

function newUpdate() {
    currentId = null;
    formTitle.textContent = 'Uus uuendus';
    titleInput.value = '';
    tagInput.value = '';
    summaryInput.value = '';
    activeInput.checked = true;
    bodyEditor.innerHTML = '';
    deleteButton.classList.add('hidden');
    setSaveStatus('');
    renderList();
    loadFeedback(updates[0]?.id || '');
}

function formPayload() {
    const existing = updates.find((item) => item.id === currentId);

    return {
        title: titleInput.value.trim(),
        tag: tagInput.value.trim(),
        summary: summaryInput.value.trim(),
        createdAt: existing?.createdAt || Math.floor(Date.now() / 1000),
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

    if (document.getElementById('keyword').value.trim() !== ADMIN_KEYWORD) {
        loginError.textContent = 'Vale keyword.';
        return;
    }

    sessionStorage.setItem('axion_updates_admin', '1');
    showAdmin();
    newUpdate();
    await loadUpdatesIntoPanel(true);
});

saveButton.addEventListener('click', async () => {
    const payload = formPayload();

    if (!payload.title) {
        setSaveStatus('Pealkiri on kohustuslik.', 'error');
        titleInput.focus();
        return;
    }

    saveButton.disabled = true;
    setSaveStatus('Laen üles...');

    try {
        if (currentId) {
            await request(`/updates/${currentId}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            const data = await request('/updates', { method: 'POST', body: JSON.stringify(payload) });
            currentId = data.update.id;
        }

        await loadUpdates(false);
        setSaveStatus('Uuendus on üleval.', 'success');
    } catch (error) {
        setSaveStatus(error.message, 'error');
    } finally {
        saveButton.disabled = false;
    }
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

searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderList();
});

window.setInterval(() => {
    if (!adminView.classList.contains('hidden') && currentId) {
        loadFeedback(currentId).catch(() => {});
    }
}, 5000);

logoutButton.addEventListener('click', async () => {
    csrf = '';
    sessionStorage.removeItem('axion_updates_admin');
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
    if (sessionStorage.getItem('axion_updates_admin') !== '1') {
        showLogin();
        return;
    }

    showAdmin();
    newUpdate();
    await loadUpdatesIntoPanel(true);
})();
