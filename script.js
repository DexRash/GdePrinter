// script.js (module)
const PRINTERS_URL = "./printers.json";
const HISTORY_URL = "./db.json";

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

/** Утилиты */
function safeText(text) {
  return text == null ? "" : String(text);
}
function formatDateISO8601(dtStr) {
  const d = new Date(dtStr);
  if (Number.isNaN(d.getTime())) return safeText(dtStr);
  return d.toLocaleString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Состояние */
const state = {
  printers: [],
  history: [],
  filteredHistory: [],
  currentPage: 1,
  pageSize: 10,
  search: "",
  filterLocation: "",
};

/** Загрузка данных */
async function loadJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Fetch error", url, err);
    return null;
  }
}

async function init() {
  const [printersData, historyData] = await Promise.all([
    loadJson(PRINTERS_URL),
    loadJson(HISTORY_URL),
  ]);

  state.printers = Array.isArray(printersData) ? printersData : printersData?.printers || [];
  state.history = Array.isArray(historyData)
    ? historyData
    : historyData?.history || historyData || [];
  // сортируем по дате (убывание)
  state.history.sort((a, b) => new Date(b.date) - new Date(a.date));
  state.filteredHistory = state.history.slice();

  populateLocationFilter();
  renderPrinters();
  renderHistory();
  bindUI();
}

/** Рендер списка принтеров */
function renderPrinters() {
  const list = qs("#printersList");
  list.innerHTML = "";
  if (!state.printers.length) {
    list.textContent = "Список принтеров пуст.";
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const p of state.printers) {
    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("role", "listitem");
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = p.name || "—";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${p.location || "Не указано"} • ${p.model || ""}`;
    card.append(title, meta);
    fragment.append(card);
  }
  list.append(fragment);
}

/** Рендер истории с пагинацией */
function renderHistory() {
  const tbody = qs("#historyTable tbody");
  tbody.innerHTML = "";
  const { currentPage, pageSize, filteredHistory } = state;
  const total = filteredHistory.length;
  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredHistory.slice(start, start + pageSize);

  for (const rec of pageItems) {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    tdDate.textContent = formatDateISO8601(rec.date);
    const tdPrinter = document.createElement("td");
    tdPrinter.textContent = safeText(rec.printer || rec.device || "");
    const tdAction = document.createElement("td");
    tdAction.textContent = safeText(rec.action || rec.event || "");
    const tdUser = document.createElement("td");
    tdUser.textContent = safeText(rec.user || rec.by || "");
    tr.append(tdDate, tdPrinter, tdAction, tdUser);
    tbody.append(tr);
  }

  renderPager(total, currentPage, pageSize);
}

/** Пагинация */
function renderPager(total, currentPage, pageSize) {
  const pager = qs("#historyPager");
  pager.innerHTML = "";
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const info = document.createElement("div");
  info.textContent = `Показано ${Math.min(total, pageSize)} из ${total}`;
  pager.append(info);

  const prev = document.createElement("button");
  prev.textContent = "◀";
  prev.disabled = currentPage <= 1;
  prev.addEventListener("click", () => {
    state.currentPage = Math.max(1, state.currentPage - 1);
    renderHistory();
  });
  pager.append(prev);

  const next = document.createElement("button");
  next.textContent = "▶";
  next.disabled = currentPage >= pages;
  next.addEventListener("click", () => {
    state.currentPage = Math.min(pages, state.currentPage + 1);
    renderHistory();
  });
  pager.append(next);
}

/** Фильтрация и поиск по истории */
function applyFilters() {
  let list = state.history.slice();

  if (state.filterLocation) {
    // если записи содержат поле location/printer, фильтруем
    list = list.filter(
      (r) => r.location === state.filterLocation || r.printer === state.filterLocation
    );
  }

  if (state.search) {
    const s = state.search.toLowerCase();
    list = list.filter(
      (r) =>
        (r.printer && String(r.printer).toLowerCase().includes(s)) ||
        (r.action && String(r.action).toLowerCase().includes(s)) ||
        (r.user && String(r.user).toLowerCase().includes(s)) ||
        (r.note && String(r.note).toLowerCase().includes(s))
    );
  }

  state.filteredHistory = list;
  state.currentPage = 1;
  renderHistory();
}

/** Заполнение фильтра по локациям на основе данных принтеров */
function populateLocationFilter() {
  const sel = qs("#filterLocation");
  const locs = new Set(state.printers.map((p) => p.location).filter(Boolean));
  for (const l of locs) {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    sel.append(opt);
  }
}

/** Привязка UI событий */
function bindUI() {
  const search = qs("#searchInput");
  search.addEventListener(
    "input",
    debounce((e) => {
      state.search = e.target.value.trim();
      applyFilters();
    }, 300)
  );

  const locSel = qs("#filterLocation");
  locSel.addEventListener("change", (e) => {
    state.filterLocation = e.target.value;
    applyFilters();
  });

  const pageSizeSel = qs("#historyPageSize");
  pageSizeSel.addEventListener("change", (e) => {
    state.pageSize = Number(e.target.value) || 10;
    state.currentPage = 1;
    renderHistory();
  });
}

/** Запуск */
document.addEventListener("DOMContentLoaded", init);
