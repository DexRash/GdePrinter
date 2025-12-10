const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем приложение на весь экран

// URL к JSON файлу.
// ВАЖНО: Если запускаете локально, будет ошибка CORS.
// На GitHub Pages все будет работать.
const DATA_URL = "printers.json";

let printersData = [];

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
  fetchPrinters();
});

// Загрузка данных
async function fetchPrinters() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Ошибка сети");
    printersData = await response.json();
    renderList(printersData);
  } catch (error) {
    document.getElementById(
      "printer-list"
    ).innerHTML = `<div style="text-align:center; color:red;">Ошибка загрузки данных:<br>${error.message}</div>`;
  }
}

// Отрисовка списка
function renderList(data) {
  const listContainer = document.getElementById("printer-list");
  listContainer.innerHTML = "";

  data.forEach((printer) => {
    const card = document.createElement("div");
    card.className = `printer-card st-${printer.status}`;
    // Цветная полоска слева зависит от статуса в CSS
    card.style.borderLeftColor = getStatusColor(printer.status);

    card.innerHTML = `
            <div class="card-header">
                <span class="p-number">№ ${printer.number}</span>
                <span class="status-badge st-${printer.status}">${printer.status_text}</span>
            </div>
            <div class="p-location">📍 ${printer.location}</div>
            <div class="p-cartridge">💾 ${printer.cartridge}</div>
        `;

    // Кликом открываем детали
    card.onclick = () => openDetails(printer);
    listContainer.appendChild(card);
  });
}

// Вспомогательная функция цветов
function getStatusColor(status) {
  const map = {
    active: "var(--status-ok)",
    warning: "var(--status-warn)",
    repair: "var(--status-err)",
    inactive: "var(--status-grey)",
  };
  return map[status] || "#000";
}

// Открытие страницы деталей
function openDetails(printer) {
  // Скрываем список, показываем детали
  document.getElementById("page-list").classList.add("hidden");
  document.getElementById("page-details").classList.remove("hidden");
  tg.BackButton.show(); // Показываем нативную кнопку "Назад" в ТГ (опционально)

  // Заполняем данными
  document.getElementById("detail-number").innerText = `Принтер № ${printer.number}`;
  document.getElementById("detail-model").innerText = printer.model;
  document.getElementById("detail-location").innerText = printer.location;
  document.getElementById("detail-cartridge").innerText = printer.cartridge;

  const statusBadge = document.getElementById("detail-status");
  statusBadge.className = `status-badge st-${printer.status}`;
  statusBadge.innerText = printer.status_text;
  statusBadge.style.display = "inline-block";

  // Рендер истории
  renderHistory("history-cartridge", printer.history_cartridge);
  renderHistory("history-repair", printer.history_repair);

  // Обработка нативной кнопки "Назад"
  tg.BackButton.onClick(goBack);
}

// Рендер списков истории
function renderHistory(elementId, historyArray) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  if (!historyArray || historyArray.length === 0) {
    container.innerHTML = '<li style="color:var(--hint-color)">Записей нет</li>';
    return;
  }

  historyArray.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
            <span>${item.action}</span>
            <span class="h-date">${item.date}</span>
        `;
    container.appendChild(li);
  });
}

// Возврат назад
function goBack() {
  document.getElementById("page-details").classList.add("hidden");
  document.getElementById("page-list").classList.remove("hidden");
  tg.BackButton.hide();
  tg.BackButton.offClick(goBack); // Убираем листенер, чтобы не дублировался
}
