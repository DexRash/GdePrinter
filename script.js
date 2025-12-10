const tg = window.Telegram.WebApp;
tg.expand();
// Устанавливаем цвета для шапки и фона Telegram WebApp
tg.setHeaderColor(getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim());
tg.setBackgroundColor(
  getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim()
);

const DATA_URL = "db.json";

let appData = { printers: [], cartridges: [] };
let currentPrinterId = null;

// Стек для корректной обработки нативной кнопки "Назад"
// Содержит имена страниц: 'list', 'details', 'add_printer', 'stock_list', 'add_cartridge', 'issue'
let navHistory = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchData();

  // Слушаем нативную кнопку "Назад"
  tg.BackButton.onClick(() => {
    handleBack();
  });
});

async function fetchData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Ошибка сети при загрузке db.json");
    appData = await response.json();

    renderPrinters(appData.printers);
    renderStock(appData.cartridges);
  } catch (error) {
    document.getElementById(
      "printer-list"
    ).innerHTML = `<p style="text-align:center; padding:20px; color:var(--status-err)">Ошибка загрузки базы: ${error.message}</p>`;
  }
}

// === ОБЩИЕ ФУНКЦИИ НАВИГАЦИИ ===

function hideAllInnerPages() {
  // Скрывает все страницы внутри обоих табов, кроме их главных списков
  document.getElementById("page-details").classList.add("hidden");
  document.getElementById("page-add-printer").classList.add("hidden");
  document.getElementById("page-issue").classList.add("hidden");
  document.getElementById("page-add-cartridge").classList.add("hidden");
  document.getElementById("page-list").classList.add("hidden");
  document.getElementById("page-stock-list").classList.add("hidden");
}

function switchTab(tabName, el) {
  // 1. Сброс UI табов
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  if (el) el.classList.add("active");

  // 2. Скрытие всего содержимого табов
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.add("hidden"));

  // 3. Установка текущего состояния
  navHistory = []; // Сброс истории при переключении табов
  tg.BackButton.hide();

  // 4. Отображение нужного таба и его главной страницы
  document.getElementById(`tab-${tabName}`).classList.remove("hidden");

  if (tabName === "printers") {
    document.getElementById("page-list").classList.remove("hidden");
    document.getElementById("fab-printer").classList.remove("hidden"); // FAB для принтеров
  } else if (tabName === "stock") {
    document.getElementById("page-stock-list").classList.remove("hidden");
    document.getElementById("fab-cartridge").classList.remove("hidden"); // FAB для картриджей
  }
}

function pushState(pageName) {
  navHistory.push(pageName);
  if (navHistory.length > 0) {
    tg.BackButton.show();
  }
}

// === ЛОГИКА КНОПКИ НАЗАД ===
function handleBack() {
  const state = navHistory.pop();

  if (!state) {
    tg.close();
    return;
  }

  if (state === "details" || state === "add_printer" || state === "issue") {
    showPrinterList(); // Возвращаемся в список принтеров
  } else if (state === "add_cartridge") {
    showStockList(); // Возвращаемся в список склада
  }
}

// === ФУНКЦИИ ПРИНТЕРОВ ===

function renderPrinters(list) {
  const container = document.getElementById("printer-list");
  container.innerHTML = "";
  list.forEach((p) => {
    const div = document.createElement("div");
    div.className = "printer-card";
    div.style.borderLeftColor = getStatusColor(p.status);
    div.innerHTML = `
            <div class="card-header">
                <span class="p-number">№ ${p.number}</span>
                <span class="status-badge st-${p.status}">${p.status_text}</span>
            </div>
            <div class="p-model">${p.model}</div>
            <div class="p-location">📍 ${p.location}</div>
        `;
    div.onclick = () => openPrinterDetails(p);
    container.appendChild(div);
  });
}

function showPrinterList() {
  hideAllInnerPages();
  document.getElementById("page-list").classList.remove("hidden");
  tg.BackButton.hide();
  navHistory = [];
}

function openPrinterDetails(printer) {
  currentPrinterId = printer.id;
  hideAllInnerPages();
  document.getElementById("page-details").classList.remove("hidden");

  // Заполнение деталей
  document.getElementById("detail-number").innerText = `Принтер № ${printer.number}`;
  document.getElementById("detail-model").innerText = printer.model;
  document.getElementById("detail-location").innerText = printer.location;
  document.getElementById("detail-cartridge").innerText = printer.cartridge;

  const sb = document.getElementById("detail-status");
  sb.className = `status-badge-large st-${printer.status}`;
  sb.innerText = printer.status_text;

  // Восстановленный рендеринг раздельной истории
  renderHistory("history-cartridge", printer.history_cartridge);
  renderHistory("history-repair", printer.history_repair);

  pushState("details");
}

function showAddPrinter() {
  hideAllInnerPages();
  document.getElementById("page-add-printer").classList.remove("hidden");
  pushState("add_printer");
}

function showIssuePage() {
  hideAllInnerPages();
  document.getElementById("page-issue").classList.remove("hidden");

  const printer = appData.printers.find((p) => p.id === currentPrinterId);
  if (printer) {
    document.getElementById(
      "issue-subtitle"
    ).innerText = `Для принтера № ${printer.number} (${printer.model})`;
  }
  pushState("issue");
}

// Рендер истории
function renderHistory(elId, list) {
  const container = document.getElementById(elId);
  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML =
      '<li style="color:var(--hint-color); text-align:center; padding:12px 16px;">Нет записей</li>';
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

// === ФУНКЦИИ СКЛАДА ===

function renderStock(list) {
  const container = document.getElementById("stock-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color:var(--hint-color)">Склад пуст</div>';
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "stock-card";
    div.innerHTML = `
            <div class="stock-info">
                <h3>№ ${item.number}</h3>
                <p>${item.model}</p>
                <div class="stock-date">Прибыл: ${item.date}</div>
            </div>
            <button class="stock-action" onclick="event.stopPropagation(); mockTake('${item.number}', '${item.model}')">Взять</button>
        `;
    container.appendChild(div);
  });
}

function showStockList() {
  hideAllInnerPages();
  document.getElementById("page-stock-list").classList.remove("hidden");
  tg.BackButton.hide();
  navHistory = [];
}

function showAddCartridge() {
  hideAllInnerPages();
  document.getElementById("page-add-cartridge").classList.remove("hidden");
  pushState("add_cartridge");
}

// === УТИЛИТЫ И МОКИ ===
function getStatusColor(status) {
  const colors = { active: "#28cd41", warning: "#ff9500", repair: "#ff3b30" };
  return colors[status] || "#8e8e93";
}

function mockSave(type) {
  tg.MainButton.showProgress();

  setTimeout(() => {
    tg.MainButton.hideProgress();

    let message = "Успешно сохранено (Тест)!";
    if (type === "printer") {
      message = "Новый принтер добавлен в базу (Тест)!";
      showPrinterList();
    } else if (type === "issue") {
      message = "Выдача картриджа зафиксирована (Тест)!";
      // Возвращаемся к деталям принтера
      const p = appData.printers.find((x) => x.id === currentPrinterId);
      openPrinterDetails(p);
      navHistory.pop(); // Удаляем дубликат истории
    } else if (type === "cartridge") {
      message = "Новый картридж добавлен на склад (Тест)!";
      showStockList();
    }

    tg.showAlert(message);
  }, 500);
}

function mockTake(number, model) {
  tg.showConfirm(
    `Вы уверены, что хотите забрать картридж № ${number} (${model}) со склада?`,
    (ok) => {
      if (ok) tg.showAlert(`Картридж № ${number} помечен как выданный со склада.`);
    }
  );
}

// Инициализация при старте, чтобы показать вкладку Принтеры
window.onload = () => {
  switchTab("printers", document.querySelector(".nav-item"));
};
