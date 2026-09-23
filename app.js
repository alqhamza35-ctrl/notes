const KEY = 'my-notes';

const listEl = document.getElementById('noteList');
const emptyMsg = document.getElementById('emptyMsg');
const titleEl = document.getElementById('title');
const bodyEl = document.getElementById('body');
const statusEl = document.getElementById('status');
const savedEl = document.getElementById('saved');
const searchEl = document.getElementById('search');
const toastEl = document.getElementById('toast');

let notes = load();
let currentId = null;
let dirty = false;
let toastTimer = null;

function load() {
  return JSON.parse(localStorage.getItem(KEY) || '[]');
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function sorted() {
  return [...notes].sort((a, b) => b.updated - a.updated);
}

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const shown = sorted().filter(n =>
    !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
  );

  listEl.innerHTML = '';
  for (const n of shown) {
    const li = document.createElement('li');
    li.className = n.id === currentId ? 'active' : '';
    li.dataset.id = n.id;

    const t = document.createElement('div');
    t.className = 'n-title';
    t.textContent = n.title || 'Untitled';

    const p = document.createElement('div');
    p.className = 'n-preview';
    p.textContent = n.body.replace(/\s+/g, ' ').trim() || 'No content';

    const d = document.createElement('div');
    d.className = 'n-date';
    d.textContent = fmtDate(n.updated);

    li.append(t, p, d);
    listEl.append(li);
  }

  emptyMsg.classList.toggle('hidden', shown.length > 0);
  emptyMsg.textContent = q ? 'No notes match your search.' : 'No notes yet.';
}

function open(id) {
  currentId = id;
  const n = notes.find(x => x.id === id);
  titleEl.value = n ? n.title : '';
  bodyEl.value = n ? n.body : '';
  setDirty(false);
  savedEl.textContent = n ? 'Saved ' + fmtDate(n.updated) : '';
  render();
}

function newNote() {
  currentId = null;
  titleEl.value = '';
  bodyEl.value = '';
  savedEl.textContent = '';
  setDirty(false);
  render();
  titleEl.focus();
}

function setDirty(v) {
  dirty = v;
  statusEl.textContent = v ? 'Unsaved changes' : (currentId ? 'Saved' : 'New note');
  statusEl.classList.toggle('dirty', v);
}

function save() {
  if (!titleEl.value.trim() && !bodyEl.value.trim()) {
    toast('Nothing to save.');
    return;
  }

  const now = Date.now();
  if (currentId) {
    const n = notes.find(x => x.id === currentId);
    n.title = titleEl.value.trim();
    n.body = bodyEl.value;
    n.updated = now;
  } else {
    currentId = uid();
    notes.push({ id: currentId, title: titleEl.value.trim(), body: bodyEl.value, updated: now });
  }

  persist();
  setDirty(false);
  savedEl.textContent = 'Saved ' + fmtDate(now);
  render();
  toast('Note saved.');
}

function remove() {
  const i = notes.findIndex(x => x.id === currentId);
  if (i === -1) return;

  const [gone] = notes.splice(i, 1);
  persist();
  newNote();
  toast('Note deleted.', () => {
    notes.push(gone);
    persist();
    open(gone.id);
  });
}

function toast(msg, undo) {
  clearTimeout(toastTimer);
  toastEl.innerHTML = '';
  toastEl.append(document.createTextNode(msg));

  if (undo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'undo';
    b.textContent = 'Undo';
    b.onclick = () => {
      toastEl.classList.add('hidden');
      undo();
    };
    toastEl.append(b);
  }

  toastEl.classList.remove('hidden');
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), undo ? 6000 : 2000);
}

document.getElementById('saveBtn').onclick = save;
document.getElementById('deleteBtn').onclick = remove;
document.getElementById('newBtn').onclick = newNote;
listEl.onclick = e => {
  const li = e.target.closest('li');
  if (li) open(li.dataset.id);
};
searchEl.oninput = render;
titleEl.oninput = () => setDirty(true);
bodyEl.oninput = () => setDirty(true);

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
});

window.addEventListener('beforeunload', e => {
  if (dirty) e.preventDefault();
});

render();
const first = sorted()[0];
if (first) open(first.id);
else newNote();
