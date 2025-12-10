const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor(getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim());

const DATA_URL = "db.json"; // ОБНОВИТЕ ИМЯ ФАЙЛА!

let appData = { printers: [], cartridges: [] };
let currentPrinterId = null;

// Навигация
let activeTab = "printers"; // 'printers' или 'stock'
let navHistory = []; // Стек для кнопки Назад

document.addEventListener("DOMContentLoaded", () => {
  fetchData();

  // Нативная кнопка назад
  tg.BackButton.onClick(() => {
    handleBack();
  });
});

async function fetchData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Ошибка сети");
    appData = await response.json();

    // Рендерим оба списка
    renderPrinters(appData.printers);
    renderStock(appData.cartridges);
  } catch (error) {
    alert("Ошибка загрузки: " + error.message);
  }
}

// === ЛОГИКА ТАБОВ ===
function switchTab(tabName, el) {
  // Меняем активный класс у кнопок меню
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  if (el) el.classList.add("active");

  // Скрываем все содержимое табов
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.add("hidden"));

  // Показываем нужный таб
  document.getElementById(`tab-${tabName}`).classList.remove("hidden");

  activeTab = tabName;

  // Сбрасываем внутренние страницы таба на главную
  if (tabName === "printers") showPrinterList();
  if (tabName === "stock") showStockList();
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
                <span class="status-badge" style="background:${getStatusColor(p.status)}">${
      p.status_text
    }</span>
            </div>
            <div class="p-model">${p.model}</div>
            <div style="font-size:13px; color:#888; margin-top:4px;">📍 ${p.location}</div>
        `;
    div.onclick = () => openPrinterDetails(p);
    container.appendChild(div);
  });
}

function openPrinterDetails(printer) {
  currentPrinterId = printer.id;
  document.getElementById("page-list").classList.add("hidden");
  document.getElementById("page-details").classList.remove("hidden");

  document.getElementById("detail-number").innerText = `Принтер № ${printer.number}`;
  document.getElementById("detail-model").innerText = printer.model;
  document.getElementById("detail-location").innerText = printer.location;
  document.getElementById("detail-cartridge").innerText = printer.cartridge;

  tg.BackButton.show();
  navHistory.push("printer_details");
}

function showPrinterList() {
  document.getElementById("page-details").classList.add("hidden");
  document.getElementById("page-add-printer").classList.add("hidden");
  document.getElementById("page-issue").classList.add("hidden");
  document.getElementById("page-list").classList.remove("hidden");
  tg.BackButton.hide();
  navHistory = [];
}

function showAddPrinter() {
  document.getElementById("page-list").classList.add("hidden");
  document.getElementById("page-add-printer").classList.remove("hidden");
  tg.BackButton.show();
  navHistory.push("add_printer");
}

function showIssuePage() {
  document.getElementById("page-details").classList.add("hidden");
  document.getElementById("page-issue").classList.remove("hidden");
  tg.BackButton.show();
  navHistory.push("issue");
}

// === ФУНКЦИИ СКЛАДА ===
function renderStock(list) {
  const container = document.getElementById("stock-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color:#888">Склад пуст</div>';
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "stock-card";
    div.innerHTML = `
            <div class="stock-info">
                <h3>${item.number}</h3>
                <p>${item.model}</p>
                <div class="stock-date">Прибыл: ${item.date}</div>
            </div>
            <button class="stock-action" onclick="event.stopPropagation(); mockTake('${item.number}')">Взять</button>
        `;
    container.appendChild(div);
  });
}

function showStockList() {
  document.getElementById("page-add-cartridge").classList.add("hidden");
  document.getElementById("page-stock-list").classList.remove("hidden");
  tg.BackButton.hide();
  // Мы не сбрасываем историю полностью, если переключение табов, но для простоты тут так:
  if (activeTab === "stock") navHistory = [];
}

function showAddCartridge() {
  document.getElementById("page-stock-list").classList.add("hidden");
  document.getElementById("page-add-cartridge").classList.remove("hidden");
  tg.BackButton.show();
  navHistory.push("add_cartridge");
}

// === ОБЩЕЕ ===
function handleBack() {
  const state = navHistory.pop();

  if (!state) {
    tg.close(); // Если истории нет, закрываем мини-апп
    return;
  }

  if (activeTab === "printers") {
    if (state === "printer_details") showPrinterList();
    else if (state === "add_printer") showPrinterList();
    else if (state === "issue") {
      // Вернуться к деталям принтера (нужно найти текущий)
      const p = appData.printers.find((x) => x.id === currentPrinterId);
      openPrinterDetails(p);
      // openPrinterDetails добавляет историю, нужно убрать дубль, так как мы "вернулись"
      navHistory.pop();
    }
  } else if (activeTab === "stock") {
    if (state === "add_cartridge") showStockList();
  }
}

function getStatusColor(status) {
  const colors = { active: "#28cd41", warning: "#ff9500", repair: "#ff3b30" };
  return colors[status] || "#8e8e93";
}

function mockSave(type) {
  tg.MainButton.showProgress();
  setTimeout(() => {
    tg.MainButton.hideProgress();
    tg.showAlert("Успешно сохранено (Тест)!");

    if (type === "printer") showPrinterList();
    if (type === "issue") {
      const p = appData.printers.find((x) => x.id === currentPrinterId);
      openPrinterDetails(p);
      navHistory.pop(); // Коррекция истории
    }
    if (type === "cartridge") showStockList();
  }, 500);
}

function mockTake(number) {
  tg.showConfirm(`Забрать картридж ${number} со склада для установки?`, (ok) => {
    if (ok) tg.showAlert(`Картридж ${number} помечен как выданный.`);
  });
}
