const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const updateList = document.getElementById('updateList');
const editorTitle = document.getElementById('editorTitle');
const titleInput = document.getElementById('title');
const tagInput = document.getElementById('tag');
const summaryInput = document.getElementById('summary');
const createdAtInput = document.getElementById('createdAt');
const activeInput = document.getElementById('active');
const bodyEditor = document.getElementById('bodyEditor');
const statusNode = document.getElementById('status');
const saveButton = document.getElementById('saveUpdate');
const deleteButton = document.getElementById('deleteUpdate');
const newButton = document.getElementById('newUpdate');
const logoutButton = document.getElementById('logout');
const feedbackTitle = document.getElementById('feedbackTitle');
const feedbackStats = document.getElementById('feedbackStats');
const feedbackList = document.getElementById('feedbackList');
const refreshFeedbackButton = document.getElementById('refreshFeedback');

let csrf = '';
let updates = [];
let currentId = null;

function apiPath(path) {
    return new URL(`../api${path}`, window.location.href).toString();
}

async function request(path, options = {}) {
    const headers = {
        'Content-Type': 'text/plain; charset=UTF-8',
        ...(options.headers || {})
    };

    if (csrf && options.method && options.method !== 'GET') {
        headers['X-CSRF-Token'] = csrf;
    }

    const response = await fetch(apiPath(path), {
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
        throw new Error(data.error || `Päring ebaõnnestus. HTTP ${response.status}`);
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

function setStatus(message, isError = false) {
    statusNode.textContent = message || '';
    statusNode.classList.toggle('error', isError);
}

function toLocalDateTime(timestamp) {
    const date = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalDateTime(value) {
    return value ? Math.floor(new Date(value).getTime() / 1000) : Math.floor(Date.now() / 1000);
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

function renderList() {
    updateList.innerHTML = '';

    if (!updates.length) {
        const empty = document.createElement('p');
        empty.className = 'message';
        empty.textContent = 'Update pole veel lisatud.';
        updateList.appendChild(empty);
        return;
    }

    for (const update of updates) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `update-item${update.id === currentId ? ' active' : ''}`;

        const title = document.createElement('strong');
        title.textContent = update.title || 'Pealkirjata';

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
    editorTitle.textContent = 'Muuda update';
    titleInput.value = update.title || '';
    tagInput.value = update.tag || '';
    summaryInput.value = update.summary || '';
    createdAtInput.value = toLocalDateTime(update.createdAt);
    activeInput.checked = update.active !== false;
    bodyEditor.innerHTML = update.bodyHtml || '';
    deleteButton.classList.remove('hidden');
    setStatus('');
    renderList();
    loadFeedback(update.id).catch((error) => setStatus(error.message, true));
}

function newUpdate() {
    currentId = null;
    editorTitle.textContent = 'Uus update';
    titleInput.value = '';
    tagInput.value = '';
    summaryInput.value = '';
    createdAtInput.value = toLocalDateTime();
    activeInput.checked = true;
    bodyEditor.innerHTML = '';
    deleteButton.classList.add('hidden');
    setStatus('');
    renderList();
    renderFeedback([]);
}

function payload() {
    return {
        title: titleInput.value.trim(),
        tag: tagInput.value.trim(),
        summary: summaryInput.value.trim(),
        createdAt: fromLocalDateTime(createdAtInput.value),
        active: activeInput.checked,
        bodyHtml: bodyEditor.innerHTML.trim()
    };
}

async function loadUpdates(selectLatest = true) {
    const data = await request('/updates');
    updates = data.updates || [];
    renderList();

    if (currentId && updates.some((item) => item.id === currentId)) {
        selectUpdate(currentId);
    } else if (selectLatest && updates[0]) {
        selectUpdate(updates[0].id);
    } else {
        newUpdate();
    }
}

async function saveUpdate() {
    const data = payload();

    if (!data.title) {
        titleInput.focus();
        setStatus('Pealkiri on kohustuslik.', true);
        return;
    }

    saveButton.disabled = true;
    setStatus('Salvestan...');

    try {
        if (currentId) {
            await request(`/updates/${currentId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            const created = await request('/updates', { method: 'POST', body: JSON.stringify(data) });
            currentId = created.update.id;
        }

        setStatus('Salvestatud.');
        await loadUpdates(false);
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        saveButton.disabled = false;
    }
}

async function deleteUpdate() {
    if (!currentId) return;

    const selected = updates.find((item) => item.id === currentId);
    if (!window.confirm(`Kustutada "${selected?.title || 'see update'}"?`)) return;

    deleteButton.disabled = true;

    try {
        await request(`/updates/${currentId}`, { method: 'DELETE' });
        currentId = null;
        setStatus('Kustutatud.');
        await loadUpdates(true);
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        deleteButton.disabled = false;
    }
}

function renderFeedback(items) {
    feedbackList.innerHTML = '';
    feedbackStats.innerHTML = '';

    const count = items.length;
    const total = items.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

    feedbackStats.innerHTML = `
        <div class="metric"><strong>${average}/5</strong><span>Keskmine</span></div>
        <div class="metric"><strong>${count}</strong><span>Hinnangut</span></div>
    `;

    if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'message';
        empty.textContent = 'Sellel update-il pole veel hinnanguid.';
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

        card.append(header, comment, footer);
        feedbackList.appendChild(card);
    }
}

async function loadFeedback(updateId = currentId) {
    const update = updates.find((item) => item.id === updateId);
    feedbackTitle.textContent = update ? update.title : 'Vali update';

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
                username: document.getElementById('username').value.trim(),
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

logoutButton.addEventListener('click', async () => {
    await request('/logout', { method: 'POST', body: '{}' }).catch(() => {});
    csrf = '';
    showLogin();
});

newButton.addEventListener('click', newUpdate);
saveButton.addEventListener('click', saveUpdate);
deleteButton.addEventListener('click', deleteUpdate);
refreshFeedbackButton.addEventListener('click', () => loadFeedback().catch((error) => setStatus(error.message, true)));

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
