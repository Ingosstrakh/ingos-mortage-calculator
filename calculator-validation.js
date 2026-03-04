// calculator-validation.js
// Модуль валидации входных данных

/**
 * Детальная валидация входных данных перед расчетами
 *
 * Проверяет все необходимые поля для корректного расчета страховых премий:
 * - Название банка (проверка поддержки)
 * - Остаток задолженности (обязательное поле)
 * - Типы страхования (жизнь/имущество/титул)
 * - Данные заемщиков (для страхования жизни)
 * - Тип объекта недвижимости (для имущества)
 * - Материал стен (для домов)
 * - Наличие газа (для деревянных домов)
 * - Процентная ставка (для некоторых банков)
 *
 * @param {Object} data - Разобранные данные от parseTextToObject
 * @returns {Array|null} Массив строк с ошибками или null если все OK
 */
function validateParsedData(data) {
  const errors = [];

  // 1. Проверка банка
  if (!data.bank) {
    errors.push("❌ Название банка не найдено. Укажите название банка в запросе (например: 'Сбербанк', 'ВТБ', 'Альфа Банк' и т.д.)");
  } else {
    // Проверяем, поддерживается ли банк в конфигурации
    const bankConfig = window.BANKS[data.bank];
    if (!bankConfig) {
      errors.push(`❌ Банк "${data.bank}" не поддерживается. Поддерживаемые банки: ${Object.keys(window.BANKS).join(', ')}`);
    }
  }

  // 2. Проверка остатка задолженности
  if (!data.osz || data.osz <= 0) {
    errors.push("❌ Остаток задолженности не найден. Укажите остаток долга в рублях (например: 'остаток 2 500 000 ₽' или 'осз 2500000')");
  }

  // 3. Проверка рисков страхования
  const hasRisks = data.risks.life || data.risks.property || data.risks.titul;
  if (!hasRisks) {
    errors.push("❌ Тип страхования не указан. Укажите что нужно застраховать: 'жизнь', 'имущество' или 'титул'");
  }

  // 4. Проверка заемщиков для страхования жизни
  if (data.risks.life) {
    if (!data.borrowers || data.borrowers.length === 0) {
      errors.push("❌ Для страхования жизни нужны данные заемщика. Укажите дату рождения и пол (например: 'муж 15.08.1985' или 'жен 23.04.1990')");
    } else {
      // Проверяем каждый заемщик
      data.borrowers.forEach((borrower, index) => {
        if (!borrower.dob) {
          errors.push(`❌ У заемщика ${index + 1} не указана дата рождения. Формат: 'муж/жен DD.MM.YYYY'`);
        }
        if (!borrower.gender) {
          errors.push(`❌ У заемщика ${index + 1} не указан пол. Укажите 'муж' или 'жен'`);
        }
      });
    }
  }

  // 5. Проверка объекта недвижимости для страхования имущества
  if (data.risks.property) {
    if (!data.objectType) {
      errors.push("❌ Для страхования имущества укажите тип объекта: 'квартира', 'дом', 'таунхаус', 'апартаменты'");
    }
    if (data.objectType === 'дом' && !data.material) {
      errors.push("❌ Для дома укажите материал стен: 'кирпич', 'дерево', 'панель', 'монолит'");
    }
    if (data.objectType === 'дом' && data.material === 'дерево' && data.gas === null) {
      errors.push("❌ Для деревянного дома укажите наличие газа: 'с газом' или 'без газа'");
    }
  }

  // 6. Проверка процентной ставки для некоторых банков
  const bankConfig = data.bank ? window.BANKS[data.bank] : null;
  if (bankConfig && bankConfig.add_percent === null) {
    // Банки, где нужно указывать процентную ставку вручную
    if (!data.markupPercent && data.markupPercent !== 0) {
      const banksNeedingPercent = ['Альфа Банк', 'УБРИР', 'Банк СПБ'];
      if (banksNeedingPercent.includes(data.bank)) {
        errors.push(`❌ Для банка "${data.bank}" нужно указать процент надбавки (например: "${data.bank} 6%" или "ставка 6%")`);
      }
    }
  }

  // Возвращаем ошибки или null если все OK
  return errors.length > 0 ? errors : null;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateParsedData };
} else {
  window.validateParsedData = validateParsedData;
}
