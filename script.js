const tg = window.Telegram.WebApp;
tg.expand();

// Настройка цветов хедера под тему
tg.setHeaderColor(getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim());
tg.setBackgroundColor(
  getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim()
);

const DATA_URL = "printers.json";
let printersData = [];
let currentPrinterId = null; // Чтобы знать, для кого выдаем картридж

// История навигации (чтобы правильно работать с кнопкой Назад)
// 'list', 'details', 'add', 'issue'
let currentPage = "list";

document.addEventListener("DOMContentLoaded", () => {
  fetchPrinters();

  // Слушаем нативную кнопку "Назад"
  tg.BackButton.onClick(() => {
    if (currentPage === "details" || currentPage === "add") {
      showList();
    } else if (currentPage === "issue") {
      // Если мы были на выдаче картриджа, возвращаемся к деталям принтера
      const printer = printersData.find((p) => p.id === currentPrinterId);
      openDetails(printer);
    }
  });
});

async function fetchPrinters() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Network error");
    printersData = await response.json();
    renderList(printersData);
  } catch (error) {
    document.getElementById(
      "printer-list"
    ).innerHTML = `<p style="text-align:center; padding:20px; color:red">Ошибка: ${error.message}</p>`;
  }
}

function renderList(data) {
  const listContainer = document.getElementById("printer-list");
  listContainer.innerHTML = "";
  data.forEach((printer) => {
    const card = document.createElement("div");
    card.className = `printer-card`;
    card.style.borderLeftColor = getStatusColor(printer.status); // Полоска цвета

    card.innerHTML = `
            <div class="card-header">
                <span class="p-number">№ ${printer.number}</span>
                <span class="status-badge st-${printer.status}">${printer.status_text}</span>
            </div>
            <div class="p-location">📍 ${printer.location}</div>
            <div class="p-cartridge">💾 ${printer.cartridge}</div>
        `;
    card.onclick = () => openDetails(printer);
    listContainer.appendChild(card);
  });
}

function getStatusColor(status) {
  const map = {
    active: "var(--status-ok)",
    warning: "var(--status-warn)",
    repair: "var(--status-err)",
    inactive: "var(--status-grey)",
  };
  return map[status] || "#888";
}

// === НАВИГАЦИЯ ===

function hideAllPages() {
  document.querySelectorAll(".page").forEach((el) => el.classList.add("hidden"));
}

function showList() {
  hideAllPages();
  document.getElementById("page-list").classList.remove("hidden");
  tg.BackButton.hide(); // На главной кнопка назад не нужна
  tg.MainButton.hide(); // Скрываем главную кнопку (если была)
  currentPage = "list";
}

function openDetails(printer) {
  currentPrinterId = printer.id;
  hideAllPages();
  document.getElementById("page-details").classList.remove("hidden");

  // Заполняем инфо
  document.getElementById("detail-number").innerText = `Принтер № ${printer.number}`;
  document.getElementById("detail-model").innerText = printer.model;
  document.getElementById("detail-location").innerText = printer.location;
  document.getElementById("detail-cartridge").innerText = printer.cartridge;

  const sb = document.getElementById("detail-status");
  sb.className = `status-badge-large st-${printer.status}`;
  sb.innerText = printer.status_text;

  renderHistory("history-cartridge", printer.history_cartridge);
  renderHistory("history-repair", printer.history_repair);

  tg.BackButton.show();
  currentPage = "details";
}

function showAddPage() {
  hideAllPages();
  document.getElementById("page-add").classList.remove("hidden");
  tg.BackButton.show();
  currentPage = "add";
}

function showIssuePage() {
  hideAllPages();
  document.getElementById("page-issue").classList.remove("hidden");

  // Подставим номер принтера в заголовок
  const printer = printersData.find((p) => p.id === currentPrinterId);
  if (printer) {
    document.getElementById(
      "issue-subtitle"
    ).innerText = `Для принтера № ${printer.number} (${printer.model})`;
  }

  tg.BackButton.show();
  currentPage = "issue";
}

// Рендер истории
function renderHistory(elId, list) {
  const container = document.getElementById(elId);
  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML = '<li style="color:var(--hint-color); text-align:center">Нет записей</li>';
    return;
  }
  list.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
            <div class="h-row">
                <span class="h-act">${item.action}</span>
                <span class="h-date">${item.date}</span>
            </div>
        `;
    container.appendChild(li);
  });
}

// === ИМИТАЦИЯ СОХРАНЕНИЯ ===
function mockSave(type) {
  // Показываем нативный лоадер ТГ
  tg.MainButton.showProgress();

  setTimeout(() => {
    tg.MainButton.hideProgress();

    if (type === "printer") {
      tg.showAlert("Принтер добавлен в базу (Тест)!");
      showList();
    } else if (type === "issue") {
      tg.showAlert("Картридж выдан (Тест)!");
      // Возвращаемся к деталям принтера
      const printer = printersData.find((p) => p.id === currentPrinterId);
      openDetails(printer);
    }
  }, 800);
}
