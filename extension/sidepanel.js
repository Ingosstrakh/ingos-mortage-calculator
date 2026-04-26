// Логика боковой панели

console.log('Sidepanel загружен');

// Элементы DOM
const tabs = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const clientInput = document.getElementById('client-input');
const calculateBtn = document.getElementById('calculate-btn');
const clearBtn = document.getElementById('clear-btn');
const extractBtn = document.getElementById('extract-btn');
const pasteBtn = document.getElementById('paste-btn');
const resultsSection = document.getElementById('results-section');
const resultsContent = document.getElementById('results-content');
const copyResultBtn = document.getElementById('copy-result-btn');
const insertResultBtn = document.getElementById('insert-result-btn');
const saveResultBtn = document.getElementById('save-result-btn');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Текущий результат расчета
let currentResult = null;
let currentInput = null;

// Инициализация
init();

function init() {
  // Обработчики вкладок
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Обработчики кнопок калькулятора
  calculateBtn.addEventListener('click', performCalculation);
  clearBtn.addEventListener('click', clearInput);
  extractBtn.addEventListener('click', extractFromPage);
  pasteBtn.addEventListener('click', pasteFromClipboard);
  
  // Обработчики результатов
  copyResultBtn.addEventListener('click', copyResult);
  insertResultBtn.addEventListener('click', insertResult);
  saveResultBtn.addEventListener('click', saveToHistory);
  
  // Обработчики истории
  clearHistoryBtn.addEventListener('click', clearHistory);
  
  // Горячие клавиши
  clientInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      performCalculation();
    }
  });
  
  // Загружаем историю
  loadHistory();
  
  // Загружаем настройки
  loadSettings();
  
  // Слушаем сообщения от background и content scripts
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'performCalculation') {
      clientInput.value = request.text;
      performCalculation();
      sendResponse({ success: true });
    }
    return true;
  });
}

// Переключение вкладок
function switchTab(tabName) {
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  tabPanes.forEach(pane => {
    if (pane.id === `${tabName}-tab`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
  
  // Обновляем историю при переключении на вкладку истории
  if (tabName === 'history') {
    loadHistory();
  }
}

// Выполнение расчета
function performCalculation() {
  const inputText = clientInput.value.trim();
  
  if (!inputText) {
    showToast('⚠️ Введите данные клиента', 'warning');
    return;
  }
  
  try {
    // Используем функцию из calculator-main.js
    if (typeof window.handleClientRequest !== 'function') {
      showToast('❌ Модули калькулятора не загружены', 'error');
      return;
    }
    
    calculateBtn.classList.add('loading');
    calculateBtn.textContent = '⏳ Расчет...';
    
    // Выполняем расчет
    const result = window.handleClientRequest(inputText);
    
    // Сохраняем результат
    currentResult = result;
    currentInput = inputText;
    
    // Отображаем результат
    displayResult(result);
    
    // Автоматически сохраняем в историю если включено
    chrome.storage.sync.get(['saveToHistory'], (data) => {
      if (data.saveToHistory !== false) {
        saveToHistory();
      }
    });
    
    // Автоматически копируем если включено
    chrome.storage.sync.get(['autoCopy'], (data) => {
      if (data.autoCopy !== false) {
        copyResult();
      }
    });
    
  } catch (error) {
    console.error('Ошибка расчета:', error);
    showToast('❌ Ошибка: ' + error.message, 'error');
  } finally {
    calculateBtn.classList.remove('loading');
    calculateBtn.innerHTML = '<span>⚡</span> Рассчитать';
  }
}

// Отображение результата
function displayResult(result) {
  resultsContent.innerHTML = result;
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // Добавляем обработчик для кнопки конструктора варианта 2
  // (onclick в HTML не работает из-за CSP)
  const constructorBtn = resultsContent.querySelector('button[onclick*="openVariant2Constructor"]');
  if (constructorBtn) {
    constructorBtn.removeAttribute('onclick');
    constructorBtn.addEventListener('click', () => {
      if (typeof window.openVariant2Constructor === 'function') {
        window.openVariant2Constructor();
      } else {
        showToast('❌ Конструктор варианта 2 недоступен', 'error');
      }
    });
  }
}

// Очистка ввода
function clearInput() {
  clientInput.value = '';
  resultsSection.style.display = 'none';
  currentResult = null;
  currentInput = null;
  clientInput.focus();
}

// Извлечение данных со страницы
async function extractFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (response) => {
      if (chrome.runtime.lastError) {
        showToast('⚠️ Не удалось извлечь данные. Убедитесь, что вы на странице Max или Outlook', 'warning');
        return;
      }
      
      if (response && response.data) {
        clientInput.value = response.data;
        showToast('✓ Данные извлечены', 'success');
      } else {
        showToast('⚠️ Данные не найдены на странице', 'warning');
      }
    });
  } catch (error) {
    console.error('Ошибка извлечения:', error);
    showToast('❌ Ошибка извлечения данных', 'error');
  }
}

// Вставка из буфера обмена
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      clientInput.value = text;
      showToast('✓ Данные вставлены', 'success');
    }
  } catch (error) {
    console.error('Ошибка вставки:', error);
    showToast('❌ Не удалось вставить из буфера обмена', 'error');
  }
}

// Копирование результата
async function copyResult() {
  if (!currentResult) {
    showToast('⚠️ Нет результата для копирования', 'warning');
    return;
  }
  
  try {
    // Убираем HTML теги
    const textResult = stripHtml(currentResult);
    await navigator.clipboard.writeText(textResult);
    
    copyResultBtn.innerHTML = '<span>✓</span> Скопировано';
    setTimeout(() => {
      copyResultBtn.innerHTML = '<span>📋</span> Копировать';
    }, 2000);
    
    showToast('✓ Результат скопирован', 'success');
  } catch (error) {
    console.error('Ошибка копирования:', error);
    showToast('❌ Ошибка копирования', 'error');
  }
}

// Вставка результата на страницу
async function insertResult() {
  if (!currentResult) {
    showToast('⚠️ Нет результата для вставки', 'warning');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const textResult = stripHtml(currentResult);
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'insertResult',
      result: textResult
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Если не удалось вставить, копируем в буфер
        navigator.clipboard.writeText(textResult);
        showToast('📋 Результат скопирован в буфер обмена', 'info');
      } else {
        showToast('✓ Результат вставлен на страницу', 'success');
      }
    });
  } catch (error) {
    console.error('Ошибка вставки:', error);
    showToast('❌ Ошибка вставки', 'error');
  }
}

// Сохранение в историю
function saveToHistory() {
  if (!currentResult || !currentInput) {
    return;
  }
  
  chrome.runtime.sendMessage({
    action: 'saveCalculation',
    data: {
      input: currentInput,
      result: stripHtml(currentResult),
      pageType: 'sidepanel',
      url: 'sidepanel'
    }
  }, (response) => {
    if (response && response.success) {
      showToast('✓ Сохранено в историю', 'success');
      loadHistory();
    }
  });
}

// Загрузка истории
function loadHistory() {
  chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
    if (response && response.history) {
      displayHistory(response.history);
    }
  });
}

// Отображение истории
function displayHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📭</div>
        <p>История расчетов пуста</p>
      </div>
    `;
    return;
  }
  
  historyList.innerHTML = history.map(item => {
    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const sourceLabel = item.pageType === 'max' ? 'Max' :
                       item.pageType === 'outlook' ? 'Outlook' : 'Калькулятор';
    
    return `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-header">
          <span class="history-item-date">${dateStr}</span>
          <span class="history-item-source">${sourceLabel}</span>
        </div>
        <div class="history-item-input">${escapeHtml(item.input)}</div>
        <div class="history-item-result">${escapeHtml(item.result.substring(0, 100))}...</div>
      </div>
    `;
  }).join('');
  
  // Добавляем обработчики кликов
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const historyItem = history.find(h => h.id === id);
      if (historyItem) {
        clientInput.value = historyItem.input;
        switchTab('calculator');
        showToast('✓ Данные загружены из истории', 'success');
      }
    });
  });
}

// Очистка истории
function clearHistory() {
  if (!confirm('Вы уверены, что хотите очистить всю историю?')) {
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'clearHistory' }, (response) => {
    if (response && response.success) {
      loadHistory();
      showToast('✓ История очищена', 'success');
    }
  });
}

// Загрузка настроек
function loadSettings() {
  const settingIds = ['autoExtract', 'autoCopy', 'showFloatingBtn', 'saveToHistory'];
  
  chrome.storage.sync.get(settingIds, (data) => {
    settingIds.forEach(id => {
      const checkbox = document.getElementById(id.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (checkbox) {
        checkbox.checked = data[id] !== false;
        checkbox.addEventListener('change', () => {
          chrome.storage.sync.set({ [id]: checkbox.checked });
        });
      }
    });
  });
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

function showToast(message, type = 'info') {
  // Создаем временное уведомление
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  @keyframes slideDown {
    from { opacity: 1; transform: translate(-50%, 0); }
    to { opacity: 0; transform: translate(-50%, 20px); }
  }
`;
document.head.appendChild(style);
