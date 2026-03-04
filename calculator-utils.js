// calculator-utils.js
// Утилиты для форматирования и вспомогательные функции

/**
 * Форматирование суммы в рублях без группировки разрядов
 */
function formatMoneyRu(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
}

/**
 * Форматирование суммы в рублях с группировкой разрядов
 */
function formatMoneyRuGrouped(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Округление до 2 знаков после запятой
 */
function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Функция для копирования текста в буфер обмена
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // Используем новый Clipboard API если доступно
    return navigator.clipboard.writeText(text).then(() => {
      console.log('Результат скопирован в буфер обмена');
      return true;
    }).catch(err => {
      console.error('Ошибка копирования в буфер обмена:', err);
      return false;
    });
  } else {
    // Fallback для старых браузеров
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      textArea.remove();

      if (successful) {
        console.log('Результат скопирован в буфер обмена (fallback)');
        return true;
      } else {
        console.error('Не удалось скопировать в буфер обмена (fallback)');
        return false;
      }
    } catch (err) {
      console.error('Ошибка копирования в буфер обмена (fallback):', err);
      return false;
    }
  }
}

/**
 * Вспомогательная функция для названия типа объекта
 */
function getObjectTypeName(type) {
  const names = {
    'flat': 'квартира',
    'townhouse': 'таунхаус',
    'house_brick': 'дом кирпичный',
    'house_wood': 'дом деревянный'
  };
  return names[type] || type;
}

/**
 * Ограничение процента скидки в диапазоне 0-50
 */
function clampDiscountPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(50, Math.round(n)));
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatMoneyRu,
    formatMoneyRuGrouped,
    round2,
    copyToClipboard,
    getObjectTypeName,
    clampDiscountPercent
  };
} else {
  window.formatMoneyRu = formatMoneyRu;
  window.formatMoneyRuGrouped = formatMoneyRuGrouped;
  window.round2 = round2;
  window.copyToClipboard = copyToClipboard;
  window.getObjectTypeName = getObjectTypeName;
  window.clampDiscountPercent = clampDiscountPercent;
}
