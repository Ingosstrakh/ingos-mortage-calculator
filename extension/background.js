// Background Service Worker для расширения

// Создание контекстного меню при установке расширения
chrome.runtime.onInstalled.addListener(() => {
  // Контекстное меню для выделенного текста
  chrome.contextMenus.create({
    id: 'calculate-insurance',
    title: '⚡ Рассчитать страховку',
    contexts: ['selection']
  });

  // Контекстное меню для страницы
  chrome.contextMenus.create({
    id: 'open-calculator',
    title: '📊 Открыть калькулятор',
    contexts: ['page']
  });

  console.log('Расширение Ингосстрах установлено');
});

// Обработка кликов по контекстному меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'calculate-insurance') {
    // Отправляем выделенный текст в content script для расчета
    chrome.tabs.sendMessage(tab.id, {
      action: 'calculate',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'open-calculator') {
    // Открываем боковую панель
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Обработка горячих клавиш
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'calculate') {
    // Получаем выделенный текст и рассчитываем
    chrome.tabs.sendMessage(tab.id, {
      action: 'calculateSelected'
    });
  } else if (command === 'open-sidepanel') {
    // Открываем боковую панель
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Обработка клика по иконке расширения
chrome.action.onClicked.addListener((tab) => {
  // Открываем боковую панель
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Обработка сообщений от content scripts и sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveCalculation') {
    // Сохраняем расчет в историю
    saveToHistory(request.data).then(() => {
      sendResponse({ success: true });
    });
    return true; // Асинхронный ответ
  } else if (request.action === 'getHistory') {
    // Получаем историю расчетов
    getHistory().then(history => {
      sendResponse({ history });
    });
    return true;
  } else if (request.action === 'clearHistory') {
    // Очищаем историю
    clearHistory().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Функции для работы с историей
async function saveToHistory(calculation) {
  const history = await getHistory();
  
  // Добавляем timestamp
  calculation.timestamp = Date.now();
  calculation.id = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Добавляем в начало массива
  history.unshift(calculation);
  
  // Ограничиваем историю 50 записями
  if (history.length > 50) {
    history.splice(50);
  }
  
  await chrome.storage.local.set({ calculationHistory: history });
}

async function getHistory() {
  const result = await chrome.storage.local.get('calculationHistory');
  return result.calculationHistory || [];
}

async function clearHistory() {
  await chrome.storage.local.set({ calculationHistory: [] });
}

// Функция для отправки уведомлений
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message
  });
}
