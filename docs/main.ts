const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const LS_KEY = "keep-notes-store-v1";

const store = {
  data: {
    notes: [],
    tags: ["Coding", "Exercise", "Quotes", "태그1"],
    sort: "created",
    view: "notes",
    activeTag: null,
  },
  load() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) this.data = JSON.parse(raw);
  },
  save() {
    localStorage.setItem(LS_KEY, JSON.stringify(this.data));
  },
};
store.load();

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (t) => new Date(t).toLocaleDateString();
const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

const viewTitle = $("#viewTitle");
const tagList = $("#tagList");
const noteGrid = $("#noteGrid");
const emptyState = $("#emptyState");
const addBtn = $("#addBtn");
const sortBtn = $("#sortBtn");

const noteModal = $("#noteModal");
const sortModal = $("#sortModal");
const addTagsModal = $("#addTagsModal");
const editTagsModal = $("#editTagsModal");

const noteTitle = $("#noteTitle");
const noteBody = $("#noteBody");
const bgSelect = $("#bgSelect");
const prioritySelect = $("#prioritySelect");
const saveNoteBtn = $("#saveNoteBtn");
const addTagsBtn = $("#addTagsBtn");

const newTagInput = $("#newTagInput");
const addTagList = $("#addTagList");
const manageTagInput = $("#manageTagInput");
const manageTagList = $("#manageTagList");

let editingId = null;
let tempSelectedTags = new Set();

function renderSidebar() {
  tagList.innerHTML = "";
  store.data.tags.forEach((t) => {
    const row = document.createElement("button");
    row.className = "tag-chip" + (store.data.activeTag === t ? " active" : "");
    row.innerHTML = `🏷️ <span>${escapeHtml(t)}</span>`;
    row.onclick = () => {
      store.data.view = "notes";
      store.data.activeTag = t;
      selectNav("notes");
      saveAndRender();
    };
    tagList.appendChild(row);
  });
}

function selectNav(view) {
  store.data.view = view;
  $$(".nav-item").forEach((b) => b.classList.remove("active"));
  const btn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (btn) btn.classList.add("active");
}

function renderHeader() {
  const { view, activeTag } = store.data;
  if (view === "notes" && activeTag) viewTitle.textContent = activeTag;
  else if (view === "archive") viewTitle.textContent = "Archive";
  else if (view === "trash") viewTitle.textContent = "Trash";
  else if (view === "edit-tags") viewTitle.textContent = "Edit Tags";
  else viewTitle.textContent = "Notes";
}

function applySort(list) {
  switch (store.data.sort) {
    case "prio-asc":
      return list.sort((a, b) => (a.priority > b.priority ? 1 : -1));
    case "prio-desc":
      return list.sort((a, b) => (a.priority < b.priority ? 1 : -1));
    case "latest":
      return list.sort((a, b) => b.createdAt - a.createdAt);
    case "edited":
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    case "created":
    default:
      return list.sort((a, b) => a.createdAt - b.createdAt);
  }
}

function filterByView(note) {
  const { view, activeTag } = store.data;
  if (view === "archive") return !note.trashed && !!note.archived;
  if (view === "trash") return !!note.trashed;
  if (note.archived || note.trashed) return false;
  if (!activeTag) return true;
  return note.tags.includes(activeTag);
}

function renderNotes() {
  const list = applySort(store.data.notes.filter(filterByView));
  noteGrid.innerHTML = "";
  if (list.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  list.forEach((n) => {
    const card = document.createElement("article");
    card.className = "card " + (n.bg !== "none" ? n.bg : "");
    card.innerHTML = `
      <div class="title">${escapeHtml(n.title || "제목 없음")}</div>
      <div class="content">${n.html}</div>
      <div class="meta">
        <div class="badges">
          ${n.tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div>${fmt(n.createdAt)}</div>
      </div>
      <div class="meta" style="margin-top:6px">
        <div>우선순위: ${n.priority.toUpperCase()}</div>
        <div>
          <button class="icon-btn" data-act="edit">✏️</button>
          <button class="icon-btn" data-act="archive">🗄️</button>
          <button class="icon-btn" data-act="trash">🗑️</button>
        </div>
      </div>
    `;
    card.querySelector('[data-act="edit"]').addEventListener("click", () => openNoteModal(n));
    card.querySelector('[data-act="archive"]').addEventListener("click", () => {
      n.archived = !n.archived;
      if (n.archived) n.trashed = false;
      saveAndRender();
    });
    card.querySelector('[data-act="trash"]').addEventListener("click", () => {
      n.trashed = !n.trashed;
      if (n.trashed) n.archived = false;
      saveAndRender();
    });

    noteGrid.appendChild(card);
  });
}

function renderManageTags() {
  manageTagList.innerHTML = "";
  store.data.tags.forEach((t, idx) => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `
      <span>${escapeHtml(t)}</span>
      <button data-del="${idx}">✕</button>
    `;
    row.querySelector("button").onclick = () => {
      store.data.tags.splice(idx, 1);
      store.data.notes.forEach((n) => (n.tags = n.tags.filter((x) => x !== t)));
      saveAndRender();
      renderManageTags();
    };
    manageTagList.appendChild(row);
  });
}

function openModal(node) {
  node.classList.remove("hide");
  node.setAttribute("aria-hidden", "false");
}
function closeModal(node) {
  node.classList.add("hide");
  node.setAttribute("aria-hidden", "true");
}
$$("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(document.getElementById(btn.getAttribute("data-close"))));
});

function openNoteModal(note) {
  editingId = note?.id ?? null;
  noteTitle.value = note?.title ?? "노트1";
  noteBody.innerHTML = note?.html ?? "노트1";
  bgSelect.value = note?.bg ?? "red";
  prioritySelect.value = note?.priority ?? "low";
  tempSelectedTags = new Set(note?.tags ?? []);
  applyEditorBg();
  renderAddTagList();
  openModal(noteModal);
}

function applyEditorBg() {
  const map = { red: "var(--red)", blue: "var(--blue)", yellow: "var(--yellow)", none: "#fff" };
  noteBody.style.background = map[bgSelect.value] || "#fff";
}

function renderAddTagList() {
  addTagList.innerHTML = "";
  store.data.tags.forEach((t) => {
    const row = document.createElement("div");
    row.className = "add-row";
    const selected = tempSelectedTags.has(t);
    row.innerHTML = `
      <span>${escapeHtml(t)}</span>
      <button>${selected ? "✓ 선택됨" : "+"}</button>
    `;
    row.querySelector("button").onclick = () => {
      if (selected) tempSelectedTags.delete(t);
      else tempSelectedTags.add(t);
      renderAddTagList();
    };
    addTagList.appendChild(row);
  });
}

function saveNote() {
  const now = Date.now();
  const existing = editingId && store.data.notes.find((n) => n.id === editingId);
  const data = {
    id: editingId ?? uid(),
    title: noteTitle.value.trim(),
    html: noteBody.innerHTML,
    tags: Array.from(tempSelectedTags),
    bg: bgSelect.value,
    priority: prioritySelect.value,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    archived: false,
    trashed: false,
  };

  if (editingId) {
    const idx = store.data.notes.findIndex((n) => n.id === editingId);
    store.data.notes[idx] = { ...store.data.notes[idx], ...data };
  } else {
    store.data.notes.push(data);
  }
  closeModal(noteModal);
  saveAndRender();
}

function openSort() {
  openModal(sortModal);
  const v = store.data.sort ?? "created";
  const r = document.querySelector(`input[name="sort"][value="${v}"]`);
  if (r) r.checked = true;
}
function setSortFromRadio() {
  const r = document.querySelector('input[name="sort"]:checked');
  store.data.sort = (r && r.value) || "created";
  saveAndRender();
}

function openAddTags() {
  openModal(addTagsModal);
  newTagInput.value = "";
  renderAddTagList();
}
function openEditTags() {
  openModal(editTagsModal);
  manageTagInput.value = "";
  renderManageTags();
}
function createTag(name) {
  const clean = (name || "").trim();
  if (!clean) return;
  if (!store.data.tags.includes(clean)) {
    store.data.tags.push(clean);
    saveAndRender();
  }
}

// events
addBtn.addEventListener("click", () => openNoteModal());
sortBtn.addEventListener("click", openSort);
bgSelect.addEventListener("change", applyEditorBg);
saveNoteBtn.addEventListener("click", saveNote);
addTagsBtn.addEventListener("click", openAddTags);
$("#clearSort").addEventListener("click", () => {
  store.data.sort = null;
  saveAndRender();
  closeModal(sortModal);
});
sortModal.addEventListener("change", (e) => {
  const target = e.target;
  if (target.name === "sort") setSortFromRadio();
});
$("#addTagsModal").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    createTag(newTagInput.value);
    newTagInput.value = "";
    renderAddTagList();
  }
});
$("#editTagsModal").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    createTag(manageTagInput.value);
    manageTagInput.value = "";
    renderManageTags();
  }
});

// toolbar
$(".toolbar").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const raw = btn.getAttribute("data-cmd");
  if (raw === "code") {
    document.execCommand(
      "insertHTML",
      false,
      "<code style='background:#f4f4f4;border:1px solid #ddd;border-radius:4px;padding:2px 4px;display:inline-block'>" +
        document.getSelection() +
        "</code>"
    );
    return;
  }
  if (raw.startsWith("formatBlock:")) {
    document.execCommand("formatBlock", false, raw.split(":")[1]);
    return;
  }
  if (raw === "insertImage") {
    const url = prompt("이미지 URL을 입력하세요");
    if (url) document.execCommand("insertImage", false, url);
    return;
  }
  document.execCommand(raw);
});

// nav
$$(".nav-item").forEach((b) =>
  b.addEventListener("click", () => {
    const v = b.getAttribute("data-view");
    if (v === "edit-tags") openEditTags();
    selectNav(v);
    if (v !== "notes") store.data.activeTag = null;
    saveAndRender();
  })
);

// modal outside click
[noteModal, sortModal, addTagsModal, editTagsModal].forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m) closeModal(m);
  });
});

function saveAndRender() {
  store.save();
  renderSidebar();
  renderHeader();
  renderNotes();
}
selectNav(store.data.view);
saveAndRender();
