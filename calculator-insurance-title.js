// calculator-insurance-title.js
// Модуль расчета страхования титула

/**
 * Расчет страхования титула
 * @param {Object|number} dataOrAmount - Данные запроса или страховая сумма (для обратной совместимости)
 * @param {Object} bankConfig - Конфигурация банка
 * @param {number} insuranceAmount - Страховая сумма
 * @param {boolean} withLifeInsurance - Комбинация с жизнью
 * @param {string} contractDate - Дата договора
 * @returns {Object} Результат расчета
 */
function calculateTitleInsurance(dataOrAmount, bankConfig, insuranceAmount, withLifeInsurance = false, contractDate = null) {
  // Поддержка старого формата вызова (только insuranceAmount)
  let amount, config;
  if (typeof dataOrAmount === 'number') {
    amount = dataOrAmount;
    config = null;
  } else {
    amount = insuranceAmount;
    config = bankConfig;
  }

  // Специальная логика для ГПБ и ВТБ
  let tariff = 0.2; // базовый тариф 0.2%

  // Логика для Газпромбанка
  if (config && config.bankName === "Газпромбанк" && contractDate) {
    const cutoffDate = new Date('2024-05-02');
    // Конвертируем DD.MM.YYYY в YYYY-MM-DD
    let contractDateObj;
    const parts = contractDate.split('.');
    if (parts.length === 3) {
      const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      contractDateObj = new Date(isoDate);
    } else {
      contractDateObj = new Date(contractDate);
    }
    const useOldTariffs = contractDateObj < cutoffDate;

    if (useOldTariffs) {
      // Старые тарифы ГПБ (до 02.05.2024)
      tariff = withLifeInsurance ? 0.28 : 0.336; // 0.28% с жизнью, 0.336% отдельно
    } else {
      // Новые тарифы ГПБ (после 02.05.2024)
      tariff = withLifeInsurance ? 0.38 : 0.457; // 0.38% с жизнью, 0.457% отдельно
    }
  }

  // Логика для ВТБ (после 01.02.2025)
  else if (config && config.bankName === "ВТБ" && contractDate) {
    const cutoffDate = new Date('2025-02-01T00:00:00');
    let contractDateObj;
    const parts = contractDate.split('.');
    if (parts.length === 3) {
      const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`;
      contractDateObj = new Date(isoDate);
    } else {
      contractDateObj = new Date(contractDate);
    }
    
    // Сравниваем даты без учета времени
    const contractDateOnly = new Date(contractDateObj.getFullYear(), contractDateObj.getMonth(), contractDateObj.getDate());
    const cutoffDateOnly = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), cutoffDate.getDate());
    const useNewTariffs = contractDateOnly >= cutoffDateOnly;

    if (useNewTariffs) {
      // Новые тарифы ВТБ (после 01.02.2025 включительно) - всегда 0.2%
      tariff = 0.2;
    }
    // Для старых дат (до 01.02.2025) используется базовый тариф 0.2%
  }

  const premium = Math.round(amount * (tariff / 100) * 100) / 100;

  // Применяем скидку для второго варианта
  let discountedPremium = premium;
  let discountApplied = false;
  if (config && config.allow_discount_title) {
    let discountMultiplier = 0.7; // стандартная скидка 30%
    if (config.discount_title_percent) {
      discountMultiplier = 1 - (config.discount_title_percent / 100);
    }
    discountedPremium = Math.round(premium * discountMultiplier * 100) / 100;
    discountApplied = true;
  }

  // Минимальная сумма премии для титула: 600 рублей
  const MIN_PREMIUM_TITLE = 600;
  const finalPremium = Math.max(discountedPremium, MIN_PREMIUM_TITLE);
  const finalPremiumWithoutDiscount = Math.max(premium, MIN_PREMIUM_TITLE);

  return {
    total: finalPremium,
    totalWithoutDiscount: finalPremiumWithoutDiscount,
    hasDiscount: discountApplied
  };
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateTitleInsurance };
} else {
  window.calculateTitleInsurance = calculateTitleInsurance;
}
