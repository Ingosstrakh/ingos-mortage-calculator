// Content Script - работает на страницах Max и Outlook

console.log('Ингосстрах Content Script загружен');

// Определяем тип страницы
const pageType = detectPageType();

// Функция определения типа страницы
function detectPageType() {
  const hostname = window.location.hostname;
  if (hostname.includes('max.ru')) {
    return 'max';
  } else if (hostname.includes('outlook')) {
    return 'outlook';
  }
  return 'unknown';
}

// Автоматическое извлечение данных со страницы
function extractDataFromPage() {
  if (pageType === 'max') {
    return extractFromMax();
  } else if (pageType === 'outlook') {
    return extractFromOutlook();
  }
  return null;
}

// Извлечение данных из Max
function extractFromMax() {
  try {
    // Ищем текст сообщения в Max
    // Примерные селекторы - нужно будет уточнить после просмотра реальной страницы
    const messageSelectors = [
      '.message-text',
      '.chat-message-content',
      '[data-message-text]',
      '.message-body'
    ];
    
    for (const selector of messageSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.innerText || element.textContent;
      }
    }
    
    // Если не нашли, пробуем получить выделенный текст
    const selection = window.getSelection().toString();
    if (selection) {
      return selection;
    }
  } catch (error) {
    console.error('Ошибка извлечения данных из Max:', error);
  }
  return null;
}

// Извлечение данных из Outlook
function extractFromOutlook() {
  try {
    // Ищем текст письма в Outlook
    const messageSelectors = [
      '[role="document"]',
      '.ReadingPaneContents',
      '[aria-label*="Текст сообщения"]',
      '.rps_1a0b'
    ];
    
    for (const selector of messageSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.innerText || element.textContent;
      }
    }
    
    // Если не нашли, пробуем получить выделенный текст
    const selection = window.getSelection().toString();
    if (selection) {
      return selection;
    }
  } catch (error) {
    console.error('Ошибка извлечения данных из Outlook:', error);
  }
  return null;
}

// Обработка сообщений от background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'calculate') {
    // Расчет из контекстного меню
    calculateAndShow(request.text);
  } else if (request.action === 'calculateSelected') {
    // Расчет из горячей клавиши
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      calculateAndShow(selectedText);
    } else {
      // Если текст не выделен, пробуем извлечь со страницы
      const extractedText = extractDataFromPage();
      if (extractedText) {
        calculateAndShow(extractedText);
      } else {
        showToast('⚠️ Выделите текст с данными клиента', 'warning');
      }
    }
  } else if (request.action === 'extractData') {
    // Запрос на извлечение данных со страницы
    const data = extractDataFromPage();
    sendResponse({ data });
  }
  
  return true;
});

// Функция расчета и отображения результата
async function calculateAndShow(inputText) {
  if (!inputText || inputText.trim() === '') {
    showToast('⚠️ Нет данных для расчета', 'warning');
    return;
  }
  
  showToast('⏳ Выполняется расчет...', 'info');
  
  try {
    // Отправляем данные в sidepanel для расчета
    chrome.runtime.sendMessage({
      action: 'performCalculation',
      text: inputText
    }, (response) => {
      if (response && response.success) {
        showResultPopup(response.result, inputText);
      } else {
        showToast('❌ Ошибка расчета', 'error');
      }
    });
  } catch (error) {
    console.error('Ошибка расчета:', error);
    showToast('❌ Ошибка: ' + error.message, 'error');
  }
}

// Показать всплывающее окно с результатом
function showResultPopup(result, originalText) {
  // Удаляем предыдущий popup если есть
  const existingPopup = document.getElementById('ingos-result-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Создаем popup
  const popup = document.createElement('div');
  popup.id = 'ingos-result-popup';
  popup.className = 'ingos-popup';
  popup.innerHTML = `
    <div class="ingos-popup-header">
      <h3>💰 Результат расчета</h3>
      <button class="ingos-popup-close" onclick="this.closest('.ingos-popup').remove()">×</button>
    </div>
    <div class="ingos-popup-body">
      <div class="ingos-result-content">${result}</div>
    </div>
    <div class="ingos-popup-footer">
      <button class="ingos-btn ingos-btn-primary" onclick="navigator.clipboard.writeText(this.dataset.text).then(() => {
        this.textContent = '✓ Скопировано';
        setTimeout(() => this.textContent = '📋 Копировать', 2000);
      })" data-text="${escapeHtml(stripHtml(result))}">📋 Копировать</button>
      <button class="ingos-btn ingos-btn-secondary" onclick="document.getElementById('ingos-insert-helper').dataset.result = this.dataset.result; insertResultToCurrentField();" data-result="${escapeHtml(stripHtml(result))}">📝 Вставить</button>
      <button class="ingos-btn ingos-btn-secondary" onclick="this.closest('.ingos-popup').remove()">Закрыть</button>
    </div>
  `;
  
  // Добавляем helper для вставки
  if (!document.getElementById('ingos-insert-helper')) {
    const helper = document.createElement('div');
    helper.id = 'ingos-insert-helper';
    helper.style.display = 'none';
    document.body.appendChild(helper);
  }
  
  document.body.appendChild(popup);
  
  // Сохраняем в историю
  chrome.runtime.sendMessage({
    action: 'saveCalculation',
    data: {
      input: originalText,
      result: stripHtml(result),
      pageType: pageType,
      url: window.location.href
    }
  });
}

// Вставка результата в текущее поле ввода
function insertResultToCurrentField() {
  const helper = document.getElementById('ingos-insert-helper');
  const result = helper.dataset.result;
  
  if (!result) return;
  
  // Находим активное поле ввода
  const activeElement = document.activeElement;
  
  if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
    // Вставляем в input/textarea
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const text = activeElement.value;
    activeElement.value = text.substring(0, start) + result + text.substring(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + result.length;
    showToast('✓ Результат вставлен', 'success');
  } else if (activeElement && activeElement.contentEditable === 'true') {
    // Вставляем в contentEditable элемент
    document.execCommand('insertText', false, result);
    showToast('✓ Результат вставлен', 'success');
  } else {
    // Копируем в буфер обмена
    navigator.clipboard.writeText(result).then(() => {
      showToast('📋 Результат скопирован в буфер обмена', 'success');
    });
  }
  
  // Закрываем popup
  const popup = document.getElementById('ingos-result-popup');
  if (popup) popup.remove();
}

// Показать toast уведомление
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `ingos-toast ingos-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Анимация появления
  setTimeout(() => toast.classList.add('ingos-toast-show'), 10);
  
  // Удаление через 3 секунды
  setTimeout(() => {
    toast.classList.remove('ingos-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Вспомогательные функции
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Добавляем кнопку быстрого доступа на страницу (опционально)
function addFloatingButton() {
  const button = document.createElement('button');
  button.id = 'ingos-floating-btn';
  button.className = 'ingos-floating-btn';
  button.innerHTML = '🏛️';
  button.title = 'Открыть калькулятор Ингосстрах (Ctrl+Shift+I)';
  button.onclick = () => {
    chrome.runtime.sendMessage({ action: 'openSidePanel' });
  };
  document.body.appendChild(button);
}

// Инициализация
if (pageType === 'max' || pageType === 'outlook') {
  console.log(`Ингосстрах: Обнаружена страница ${pageType}`);
  // Добавляем плавающую кнопку через 2 секунды после загрузки
  setTimeout(addFloatingButton, 2000);
}
