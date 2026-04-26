// calculator-installment.js
// Модуль форматирования результатов рассрочки

/**
 * Форматирование результатов расчета рассрочки
 * @param {Object} calculationResult - Результат расчета рассрочки
 * @returns {string} HTML-форматированный результат
 */
function formatInstallmentResult(calculationResult) {
  if (!calculationResult.success) {
    return `<div style="color: #dc3545; padding: 15px; border: 1px solid #dc3545; border-radius: 8px; margin: 15px 0; background-color: #f8d7da;">
      <strong>❌ Ошибка расчета рассрочки</strong><br><br>
      ${calculationResult.error}
    </div>`;
  }
  
  const data = calculationResult.data;
  let output = `<b>Расчет рассрочки</b><br><br>`;
  
  // Если несколько заемщиков
  if (data.borrowers && data.borrowers.length > 1) {
    output += `<b>Заемщики:</b><br>`;
    data.borrowers.forEach((borrower, index) => {
      output += `${index + 1}. ${borrower.fullName}, ${borrower.age} лет, ${borrower.gender}, доля ${borrower.share}%<br>`;
      output += `   Сумма: ${borrower.installmentAmount.toLocaleString('ru-RU')} ₽`;
      if (borrower.effectiveInstallmentAmount && borrower.effectiveInstallmentAmount !== borrower.installmentAmount) {
        output += ` (эффективная: ${borrower.effectiveInstallmentAmount.toLocaleString('ru-RU')} ₽)`;
      }
      output += `<br>`;
    });
    output += `<b>Общая сумма в рассрочку:</b> ${data.installmentAmount.toLocaleString('ru-RU')} ₽<br>`;
  } else {
    // Один заемщик
    output += `<b>ФИО:</b> ${data.fullName}<br>`;
    output += `<b>Возраст:</b> ${data.age} лет<br>`;
    output += `<b>Пол:</b> ${data.gender}<br>`;
    output += `<b>Сумма в рассрочку:</b> ${data.installmentAmount.toLocaleString('ru-RU')} ₽<br>`;
    
    // Показываем эффективную сумму, если она отличается от исходной (из-за лимитов по возрасту)
    if (data.effectiveInstallmentAmount && data.effectiveInstallmentAmount !== data.installmentAmount) {
      output += `<b>Эффективная сумма (с учетом лимитов):</b> ${data.effectiveInstallmentAmount.toLocaleString('ru-RU')} ₽<br>`;
    }
  }
  
  output += `<b>Срок рассрочки до:</b> ${data.endDate}<br>`;
  output += `<b>Количество месяцев:</b> ${data.monthsUntilEnd}<br>`;
  if (data.monthsUntilEnd < 12) {
    output += `<b>Примечание:</b> Срок менее 12 месяцев, расчет выполнен как за 1 год (12 месяцев)<br>`;
  }
  
  if (!data.borrowers || data.borrowers.length === 1) {
    output += `<b>Тариф:</b> ${data.tariff}%<br>`;
  }
  
  // Добавляем сообщения о медицинском андеррайтинге и лимитах
  if (data.medicalUnderwritingMessage) {
    output += `<br><span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span><br>`;
  }
  
  output += `<br><b>Вариант 1 (без скидки):</b><br>`;
  
  if (data.borrowers && data.borrowers.length > 1) {
    // Несколько заемщиков - показываем каждого отдельно
    data.borrowers.forEach((borrower, index) => {
      const borrowerLabel = data.borrowers.length > 1 ? `заемщик ${index + 1}` : 'заемщик';
      output += `жизнь ${borrowerLabel} ${borrower.variant1.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      if (index === 0 && data.medicalUnderwritingMessage) {
        output += ` <span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span>`;
      }
      output += `<br>`;
    });
    output += `<b>ИТОГО:</b> ${data.variant1.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>`;
  } else {
    // Один заемщик
    output += `жизнь заемщик ${data.variant1.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Добавляем сообщение о медицинском андеррайтинге после премии
    if (data.medicalUnderwritingMessage && !data.requiresMedicalExam) {
      if (data.medicalUnderwritingFactor === 1.25) {
        output += ` <span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span>`;
      } else if (data.medicalUnderwritingMessage.includes('Максимальная страховая сумма')) {
        output += ` <span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span>`;
      }
    }
    output += `<br>`;
  }
  
  output += `<br><b>Вариант 2 (со скидкой 25%):</b><br>`;
  
  if (data.borrowers && data.borrowers.length > 1) {
    // Несколько заемщиков - показываем каждого отдельно
    const hasDiscountRestriction = data.borrowers.some(b => b.requiresMedicalExam || b.medicalUnderwritingFactor === 1.25);
    data.borrowers.forEach((borrower, index) => {
      const borrowerLabel = data.borrowers.length > 1 ? `заемщик ${index + 1}` : 'заемщик';
      output += `жизнь ${borrowerLabel} ${borrower.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      if (borrower.requiresMedicalExam || borrower.medicalUnderwritingFactor === 1.25) {
        output += ` <span style="color: #dc3545; font-weight: bold;">(скидки недоступны)</span>`;
      }
      output += `<br>`;
    });
    output += `<b>ИТОГО:</b> ${data.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (hasDiscountRestriction) {
      output += ` <span style="color: #dc3545; font-weight: bold;">(скидки недоступны из-за мед. андеррайтинга)</span>`;
    }
    output += `<br>`;
  } else {
    // Один заемщик
    if (data.requiresMedicalExam || data.medicalUnderwritingFactor === 1.25) {
      output += `жизнь заемщик ${data.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style="color: #dc3545; font-weight: bold;">(скидки недоступны из-за мед. андеррайтинга)</span><br>`;
    } else {
      output += `жизнь заемщик ${data.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>`;
    }
  }
  
  return output;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatInstallmentResult };
} else {
  window.formatInstallmentResult = formatInstallmentResult;
}
