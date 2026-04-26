// calculator-insurance-property.js
// Модуль расчета страхования имущества

/**
 * Расчет страхования имущества
 * @param {Object} data - Данные запроса
 * @param {Object} bankConfig - Конфигурация банка
 * @param {number} insuranceAmount - Страховая сумма
 * @returns {Object} Результат расчета
 */
function calculatePropertyInsurance(data, bankConfig, insuranceAmount) {
  // Определяем тип объекта
  let objectType = 'flat'; // по умолчанию квартира

  if (data.objectType === 'townhouse') {
    objectType = 'townhouse';
  } else if (data.objectType === 'house_brick') {
    objectType = 'house_brick';
  } else if (data.objectType === 'house_wood') {
    objectType = 'house_wood';
  } else if (data.objectType === 'house') {
    // Для совместимости со старым кодом
    if (data.material === 'wood') {
      objectType = 'house_wood';
    } else {
      objectType = 'house_brick';
    }
  }

  // Получаем тариф (для ГПБ учитываем дату КД и комбинацию с жизнью)
  const withLifeInsurance = data.risks && data.risks.life || false;
  const tariff = (window.getPropertyTariff || getPropertyTariff)(bankConfig.bankName, objectType, data.contractDate, withLifeInsurance);
  if (!tariff) {
    return {
      output: `<b>Страхование имущества:</b> тариф для типа объекта не найден<br><br>`,
      total: 0
    };
  }

  const premium = Math.round(insuranceAmount * (tariff / 100) * 100) / 100;

  // Применяем скидку: стандартная 10% (0.9) или кастомная из конфигурации банка
  let discountedPremium = premium;
  let discountApplied = false;
  if (bankConfig.allow_discount_property) {
    let discountMultiplier = 0.9; // стандартная скидка 10%
    if (bankConfig.discount_property_percent) {
      discountMultiplier = 1 - (bankConfig.discount_property_percent / 100);
    }
    discountedPremium = Math.round(premium * discountMultiplier * 100) / 100;
    discountApplied = true;
  }

  // Минимальная сумма премии для имущества: 600 рублей
  const MIN_PREMIUM_PROPERTY = 600;
  const finalPremium = Math.max(discountedPremium, MIN_PREMIUM_PROPERTY);
  const finalPremiumWithoutDiscount = Math.max(premium, MIN_PREMIUM_PROPERTY);

  return {
    total: finalPremium,
    totalWithoutDiscount: finalPremiumWithoutDiscount,
    hasDiscount: discountApplied
  };
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculatePropertyInsurance };
} else {
  window.calculatePropertyInsurance = calculatePropertyInsurance;
}
