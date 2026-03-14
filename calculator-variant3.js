// calculator-variant3.js - Расчет варианта 3 (указанная скидка)

/**
 * Функция для расчета варианта 3 с указанной скидкой
 * @param {Object} data - Данные клиента
 * @param {Object} bankConfig - Конфигурация банка
 * @param {number} insuranceAmount - Страховая сумма
 * @param {number} discountPercent - Процент скидки
 * @returns {Object} Результат с output и total
 */
function calculateVariant3(data, bankConfig, insuranceAmount, discountPercent) {
  const discountRate = discountPercent / 100;
  let output = '';
  let totalV3 = 0;

  // Расчет имущества с указанной скидкой
  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult) {
      const basePremium = propertyResult.totalWithoutDiscount || propertyResult.total;
      const propertyPremiumV3 = Math.round(basePremium * (1 - discountRate) * 100) / 100;
      output += `имущество ${propertyPremiumV3.toLocaleString('ru-RU', {useGrouping: false})}<br>`;
      totalV3 += propertyPremiumV3;
    }
  }

  // Расчет жизни с указанной скидкой
  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult && lifeResult.borrowers && lifeResult.borrowers.length > 0) {
      const isMultipleBorrowers = data.borrowers && data.borrowers.length > 1;
      
      lifeResult.borrowers.forEach((borrower, index) => {
        const borrowerLabel = isMultipleBorrowers ? `заемщик ${index + 1}` : 'заемщик';
        const basePremium = borrower.premiumWithoutDiscount || borrower.premium;
        const lifePremiumV3 = Math.round(basePremium * (1 - discountRate) * 100) / 100;
        
        output += `жизнь ${borrowerLabel} ${lifePremiumV3.toLocaleString('ru-RU', {useGrouping: false})}<br>`;
        totalV3 += lifePremiumV3;
      });
    } else if (lifeResult) {
      // Fallback: используем общую сумму
      const borrowerLabel = data.borrowers && data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
      const basePremium = lifeResult.totalWithoutDiscount || lifeResult.total;
      const lifePremiumV3 = Math.round(basePremium * (1 - discountRate) * 100) / 100;
      
      output += `жизнь ${borrowerLabel} ${lifePremiumV3.toLocaleString('ru-RU', {useGrouping: false})}<br>`;
      totalV3 += lifePremiumV3;
    }
  }

  // Расчет титула (без скидки или со скидкой в зависимости от банка)
  if (data.risks.titul) {
    const withLifeInsurance = data.risks.life || false;
    const titleResult = calculateTitleInsurance(data, bankConfig, insuranceAmount, withLifeInsurance, data.contractDate);
    if (titleResult) {
      output += `титул ${titleResult.total.toLocaleString('ru-RU', {useGrouping: false})}<br>`;
      totalV3 += titleResult.total;
    }
  }

  output += `ИТОГО тариф/ взнос ${totalV3.toLocaleString('ru-RU', {useGrouping: false})}<br><br>`;

  return {
    output: output,
    total: totalV3
  };
}

// Экспортируем функцию в глобальную область
window.calculateVariant3 = calculateVariant3;
