// calculator_v2.js

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
      const banksNeedingPercent = ['Альфа Банк', 'УБРИР'];
      if (banksNeedingPercent.includes(data.bank)) {
        errors.push(`❌ Для банка "${data.bank}" нужно указать процент надбавки (например: "${data.bank} 6%" или "ставка 6%")`);
      }
    }
  }


  // Возвращаем ошибки или null если все OK
  return errors.length > 0 ? errors : null;
}

// Основная функция для обработки запроса клиента
function handleClientRequest(clientText) {
  try {
    // Парсим текст с помощью parseTextToObject
    const parsedData = parseTextToObject(clientText);

    console.log("Разобранные данные:", parsedData);

    // Детальная валидация всех данных
    const validationErrors = validateParsedData(parsedData);
    if (validationErrors) {
      // Возвращаем все ошибки в читаемом формате
      return "🚫 <b>Найдены ошибки в данных:</b><br><br>" + validationErrors.join("<br><br>");
    }

    // Выполняем расчеты
    const result = performCalculations(parsedData);

    // Автоматически копируем только варианты расчета в буфер обмена
    if (result && (result.includes('Вариант 1') || result.includes('Вариант 2'))) {
      // Извлекаем только части с вариантами расчета
      let textForClipboard = '';

      // Разбиваем результат на строки
      const lines = result.split('<br>');
      let captureVariant = false;
      let variantCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/<[^>]*>/g, '').trim(); // Убираем HTML теги

        // Начинаем захватывать с "Вариант 1:" или "Вариант 2:"
        if (line.includes('Вариант 1:') || line.includes('Вариант 2')) {
          if (variantCount > 0) {
            textForClipboard += '\n\n'; // Два переноса строки между вариантами
          }
          captureVariant = true;
          variantCount++;
          textForClipboard += line + '\n';
        } else if (captureVariant && line) {
          // Продолжаем захватывать строки варианта
          textForClipboard += line + '\n';
        } else if (captureVariant && !line && variantCount >= 2) {
          // Прекращаем захват после второго варианта
          break;
        }
      }

      // Убираем лишние переносы в конце
      textForClipboard = textForClipboard.trim();

      if (textForClipboard) {
        copyToClipboard(textForClipboard);
      }
    }

    return result;
  } catch (error) {
    console.error("Ошибка в handleClientRequest:", error);
    return "Произошла ошибка при обработке запроса: " + error.message;
  }
}

// Экспортируем функции в глобальную область
window.validateParsedData = validateParsedData;
window.handleClientRequest = handleClientRequest;
window.performCalculations = performCalculations;

// Функция выполнения всех расчетов
function performCalculations(data) {
  // Нормализуем название банка
  let normalizedBank = data.bank;
  if (window.BANKS[data.bank]) {
    // Уже нормализован
  } else {
    // Пробуем найти по алиасам
    for (const [bankName, bankData] of Object.entries(window.BANKS)) {
      if (bankData.aliases && bankData.aliases.some(alias =>
        alias.toLowerCase() === data.bank.toLowerCase())) {
        normalizedBank = bankName;
        break;
      }
    }
  }

  const bankConfig = { ...window.BANKS[normalizedBank], bankName: normalizedBank };
  if (!bankConfig.bankName) {
    return `Банк "${data.bank}" не найден в конфигурации.`;
  }

  // Специальная логика для ВТБ: после 01.02.2025 меняем правила
  if (bankConfig.bankName === "ВТБ" && data.contractDate) {
    const cutoffDate = new Date('2025-02-01');
    const parts = data.contractDate.split('.');
    let contractDateObj;
    if (parts.length === 3) {
      const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      contractDateObj = new Date(isoDate);
    } else {
      contractDateObj = new Date(data.contractDate);
    }

    if (contractDateObj >= cutoffDate) {
      // Новые правила для ВТБ после 01.02.2025
      bankConfig.add_percent = 0; // Надбавка 0%
      bankConfig.allow_discount_property = false; // Скидки запрещены
      bankConfig.allow_discount_life = false;
      bankConfig.allow_discount_title = false;
    }
  }

  // Обновляем data.bank для использования в других функциях
  data.bank = normalizedBank;

  let output = `<b>Банк:</b> ${data.bank}<br>`;
  output += `<b>Остаток долга:</b> ${data.osz.toLocaleString('ru-RU')} ₽<br><br>`;

  // Расчет страховой суммы с надбавкой
  let insuranceAmount = data.osz;
  if (bankConfig.add_percent && bankConfig.add_percent > 0) {
    // Фиксированная надбавка из конфигурации банка
    const markup = data.osz * (bankConfig.add_percent / 100);
    insuranceAmount = data.osz + markup;
    output += `<b>Надбавка ${bankConfig.add_percent}%:</b> ${markup.toLocaleString('ru-RU')} ₽<br>`;
    output += `<b>Страховая сумма:</b> ${insuranceAmount.toLocaleString('ru-RU')} ₽<br><br>`;
  } else if (bankConfig.add_percent === null && data.markupPercent) {
    // Клиент сам указывает надбавку (для Альфа Банка и УБРИР)
    const markup = data.osz * (data.markupPercent / 100);
    insuranceAmount = data.osz + markup;
    output += `<b>Надбавка ${data.markupPercent}% (клиент):</b> ${markup.toLocaleString('ru-RU')} ₽<br>`;
    output += `<b>Страховая сумма:</b> ${insuranceAmount.toLocaleString('ru-RU')} ₽<br><br>`;
  } else if (bankConfig.add_percent === null) {
    // Надбавка не указана клиентом
    output += `<b>Внимание:</b> Для этого банка укажите надбавку в процентах (например: "15% надбавка")<br><br>`;
  } else {
    // add_percent = 0 - надбавки нет, используем остаток как страховую сумму
    output += `<b>Страховая сумма:</b> ${insuranceAmount.toLocaleString('ru-RU')} ₽<br><br>`;
  }

  let totalPremium = 0;
  const calculations = [];

  // Расчет страхования жизни
  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult) {
      lifeResult.type = 'life';
      calculations.push(lifeResult);
      totalPremium += lifeResult.total;
    }
  }

  // Расчет страхования имущества
  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult) {
      propertyResult.type = 'property';
      calculations.push(propertyResult);
      totalPremium += propertyResult.total;
    }
  }

  // Расчет титула
  if (data.risks.titul) {
    const withLifeInsurance = data.risks.life || false;
    const titleResult = calculateTitleInsurance(data, bankConfig, insuranceAmount, withLifeInsurance, data.contractDate);
    titleResult.type = 'title';
    calculations.push(titleResult);
    totalPremium += titleResult.total;
  }

  // Формируем вывод в новом формате
  let totalWithoutDiscount = 0;
  let totalWithDiscount = 0;
  let hasAnyDiscount = false;

  // Находим результаты расчетов
  const lifeResult = calculations.find(calc => calc.type === 'life');
  const propertyResult = calculations.find(calc => calc.type === 'property');
  const titleResult = calculations.find(calc => calc.type === 'title');

  // Собираем итоговые суммы
  calculations.forEach(calc => {
    totalWithoutDiscount += calc.totalWithoutDiscount || calc.total;
    totalWithDiscount += calc.total;
    if (calc.hasDiscount) hasAnyDiscount = true;
  });

  // Округляем итоговые суммы до 2 знаков
  totalWithoutDiscount = Math.round(totalWithoutDiscount * 100) / 100;
  totalWithDiscount = Math.round(totalWithDiscount * 100) / 100;

  // === ВАРИАНТ 1: Без скидок вообще ===
  output += `<b>Вариант 1:</b><br>`;

  if (data.risks.property && propertyResult) {
    output += `Имущество ${(propertyResult.totalWithoutDiscount || propertyResult.total).toLocaleString('ru-RU')}<br>`;
  }

  if (data.risks.life && lifeResult) {
    lifeResult.borrowers.forEach((borrower, index) => {
      const borrowerLabel = data.borrowers.length > 1 ? `заемщик ${index + 1}` : 'заемщик';
      output += `жизнь ${borrowerLabel} ${borrower.premium.toLocaleString('ru-RU')}<br>`;
    });
  }

  if (data.risks.titul && titleResult) {
    // Используем totalWithoutDiscount, чтобы в 1 варианте всегда была полная цена
    output += `титул ${(titleResult.totalWithoutDiscount || titleResult.total).toLocaleString('ru-RU')}<br>`;
  }

  output += `ИТОГО тариф/ взнос ${totalWithoutDiscount.toLocaleString('ru-RU')}<br><br>`;

  // Расчет варианта 2 (повышенные скидки + доп. риски)
  console.log('Начинаем расчет варианта 2...');
  try {
    const variant2Result = calculateVariant2(data, bankConfig, insuranceAmount, totalWithoutDiscount);
    console.log('Результат расчета варианта 2:', variant2Result);
    if (variant2Result && variant2Result.output) {
      console.log('Добавляем вариант 2 в вывод');
      output += `<b>Вариант 2 (повышенные скидки + доп. риски):</b><br>`;
      output += variant2Result.output;
    } else {
      console.log('Вариант 2 не будет показан - нет результата или пустой output');
    }
  } catch (error) {
    console.error('Ошибка расчета варианта 2:', error);
    // Не показываем ошибку пользователю, просто пропускаем вариант
  }

  // Расчет варианта 3 (указанная скидка)
  if (data.variant3Discount) {
    console.log('Начинаем расчет варианта 3 со скидкой', data.variant3Discount + '%...');
    try {
      const variant3Result = calculateVariant3(data, bankConfig, insuranceAmount, data.variant3Discount);
      console.log('Результат расчета варианта 3:', variant3Result);
      if (variant3Result && variant3Result.output) {
        console.log('Добавляем вариант 3 в вывод');
        output += `<b>Вариант 3 (скидка ${data.variant3Discount}%):</b><br>`;
        output += variant3Result.output;
      } else {
        console.log('Вариант 3 не будет показан - нет результата или пустой output');
      }
    } catch (error) {
      console.error('Ошибка расчета варианта 3:', error);
      // Не показываем ошибку пользователю, просто пропускаем вариант
    }
  }

  return output;
}

// Функция для копирования текста в буфер обмена
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

// Расчет страхования жизни
function calculateLifeInsurance(data, bankConfig, insuranceAmount) {
  if (!data.borrowers || data.borrowers.length === 0) {
    return null;
  }

  let totalPremium = 0;
  let totalPremiumWithDiscount = 0;
  let hasDiscount = bankConfig.allow_discount_life;
  const borrowerPremiums = [];

  // Определяем тарифы в зависимости от банка
  let tariffTable;
  if (bankConfig && bankConfig.bankName === "Дом.РФ") {
    tariffTable = window.LIFE_TARIFF_DOMRF || LIFE_TARIFF_DOMRF;
  } else if (bankConfig && bankConfig.bankName === "РСХБ") {
    tariffTable = window.LIFE_TARIFF_RSHB_LOSS || LIFE_TARIFF_RSHB_LOSS;
  } else if (bankConfig && bankConfig.bankName === "Банк СПБ") {
    tariffTable = window.LIFE_TARIFF_SPB || LIFE_TARIFF_SPB;
  } else if (bankConfig && bankConfig.bankName === "МКБ") {
    tariffTable = window.LIFE_TARIFF_MKB || LIFE_TARIFF_MKB;
  } else if (bankConfig && bankConfig.bankName === "Газпромбанк") {
    // Для ГПБ выбираем тарифы в зависимости от даты КД
    if (data.contractDate) {
      const cutoffDate = new Date('2024-05-02');
      // Конвертируем DD.MM.YYYY в YYYY-MM-DD
      const parts = data.contractDate.split('.');
      let contractDateObj;
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        contractDateObj = new Date(isoDate);
      } else {
        contractDateObj = new Date(data.contractDate);
      }

      if (contractDateObj < cutoffDate) {
        tariffTable = window.LIFE_TARIFF_GPB_OLD || LIFE_TARIFF_GPB_OLD;
      } else {
        tariffTable = window.LIFE_TARIFF_GPB_NEW || LIFE_TARIFF_GPB_NEW;
      }
    } else {
      // Если дата не указана, используем старые тарифы по умолчанию
      tariffTable = window.LIFE_TARIFF_GPB_OLD || LIFE_TARIFF_GPB_OLD;
    }
  } else if (bankConfig && bankConfig.bankName === "ВТБ") {
    // Для ВТБ выбираем тарифы в зависимости от даты КД
    if (data.contractDate) {
      const cutoffDate = new Date('2025-02-01');
      const parts = data.contractDate.split('.');
      let contractDateObj;
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        contractDateObj = new Date(isoDate);
      } else {
        contractDateObj = new Date(data.contractDate);
      }

      if (contractDateObj < cutoffDate) {
        // Старые тарифы ВТБ (до 01.02.2025) - базовые тарифы
        tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE;
      } else {
        // Новые тарифы ВТБ (после 01.02.2025)
        if (borrower.age <= 50) {
          tariffTable = window.LIFE_TARIFF_VTB_NEW || LIFE_TARIFF_VTB_NEW;
        } else {
          // Для 51+ используем старые тарифы
          tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE;
        }
      }
    } else {
      // Если дата не указана, используем базовые тарифы
      tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE;
    }
  } else {
    tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE;
  }

  data.borrowers.forEach((borrower, index) => {
    if (!borrower.age || !borrower.gender) {
      return null;
    }

    let tariff;
    if (data.bank === "РСХБ") {
      // Для РСХБ тарифы по индексу возраста (18-64 лет)
      const ageIndex = Math.max(0, Math.min(borrower.age - 18, tariffTable[borrower.gender].length - 1));
      tariff = tariffTable[borrower.gender][ageIndex];
    } else {
      // Для остальных банков тарифы по возрасту
      tariff = tariffTable[borrower.gender][borrower.age];
    }

    if (!tariff) {
      return null;
    }

    const shareAmount = insuranceAmount * (borrower.share / 100);
    const premium = Math.round(shareAmount * (tariff / 100) * 100) / 100;
    
    // Применяем скидку: стандартная 20% (0.8) или кастомная из конфигурации банка
    let discountMultiplier = 0.8; // стандартная скидка 20%
    if (hasDiscount && bankConfig.discount_life_percent) {
      discountMultiplier = 1 - (bankConfig.discount_life_percent / 100);
    }
    const premiumWithDiscount = hasDiscount ? Math.round(premium * discountMultiplier * 100) / 100 : premium;

    borrowerPremiums.push({
      gender: borrower.gender,
      age: borrower.age,
      share: borrower.share,
      premium: premium,
      premiumWithDiscount: premiumWithDiscount
    });

    totalPremium += premium;
    if (hasDiscount) {
      totalPremiumWithDiscount += premiumWithDiscount;
    }
  });

  return {
    total: hasDiscount ? totalPremiumWithDiscount : totalPremium,
    totalWithoutDiscount: totalPremium,
    hasDiscount: hasDiscount,
    borrowers: borrowerPremiums
  };
}

// Расчет страхования имущества
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

  return {
    total: discountedPremium,
    totalWithoutDiscount: premium,
    hasDiscount: discountApplied
  };
}

// Расчет страхования титула
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
    const cutoffDate = new Date('2025-02-01');
    let contractDateObj;
    const parts = contractDate.split('.');
    if (parts.length === 3) {
      const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      contractDateObj = new Date(isoDate);
    } else {
      contractDateObj = new Date(contractDate);
    }
    const useNewTariffs = contractDateObj >= cutoffDate;

    if (useNewTariffs) {
      // Новые тарифы ВТБ (после 01.02.2025) - всегда 0.2%
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

  return {
    total: discountedPremium,
    totalWithoutDiscount: premium,
    hasDiscount: discountApplied
  };
}

// Вспомогательная функция для названия типа объекта
function getObjectTypeName(type) {
  const names = {
    'flat': 'квартира',
    'townhouse': 'таунхаус',
    'house_brick': 'дом кирпичный',
    'house_wood': 'дом деревянный'
  };
  return names[type] || type;
}

// Расчет варианта 2 с доп. рисками IFL
function calculateVariant2(data, bankConfig, insuranceAmount, variant1Total) {
  // Исключение: если только жизнь - не показываем вариант 2
  if (data.risks.life && !data.risks.property) {
    return null;
  }

  // Проверяем наличие необходимых данных для расчета
  const hasFullData = window.T_MOYA && window.EXPRESS_PACKS && window.EXPRESS_GO_PACKS && window.T_BASTION;
  console.log('Полные данные загружены:', hasFullData);

  // Проверяем, является ли устройство мобильным
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log('isMobile:', isMobile);

  // Для мобильных устройств или при проблемах с загрузкой создаем упрощенный вариант
  if (!hasFullData) {
    console.log('Используем упрощенный вариант - данные не загружены');

    // Создаем упрощенный вариант 2: просто скидки 30% без дополнительных рисков
    let propertyPremiumV2 = 0;
    let lifePremiumV2 = 0;

    // Расчет имущества с скидкой 30%
    if (data.risks.property) {
      const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
      if (propertyResult && bankConfig.allow_discount_property) {
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = Math.round(basePremium * 0.7 * 100) / 100;
      }
    }

    // Расчет жизни с скидкой 30%
    if (data.risks.life) {
      const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
      if (lifeResult && bankConfig.allow_discount_life) {
        const basePremium = lifeResult.totalWithoutDiscount;
        lifePremiumV2 = Math.round(basePremium * 0.7 * 100) / 100;
      }
    }

    const totalV2 = propertyPremiumV2 + lifePremiumV2;

    // Формируем упрощенный вывод
    let output = '';
    if (data.risks.property && propertyPremiumV2 > 0) {
      output += `имущество ${propertyPremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}<br>`;
    }
    if (data.risks.life && lifePremiumV2 > 0) {
      const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
      output += `жизнь ${borrowerLabel} ${lifePremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}<br>`;
    }

    output += `<br>Итого тариф взнос ${totalV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

    return {
      output: output,
      total: totalV2
    };
  }

  // Для мобильных устройств используем полную версию, но с ограничениями
  if (isMobile) {
    console.log('Мобильное устройство - используем полную версию с ограничениями');
    // Ограничиваем количество продуктов для мобильных
    if (availableProducts.length > 2) {
      availableProducts = availableProducts.slice(0, 2);
    }
  }

  // Полная версия для десктопных устройств
  if (isMobile && availableProducts.length > 2) {
    // На мобильных устройствах оставляем только 2 наиболее приоритетных продукта
    availableProducts = availableProducts.slice(0, 2);
  }

  // Определяем доступные продукты IFL
  let availableProducts = [];
  const isFlat = data.objectType === 'flat' || data.objectType === null;
  const isHouse = data.objectType === 'house_brick' || data.objectType === 'house_wood' || 
                  (data.objectType === 'house' && (data.material === 'brick' || data.material === 'wood'));

  if (isFlat) {
    // Для квартиры приоритет: "Моя квартира" и "Экспресс квартира", затем остальные
    availableProducts = ['moyakvartira', 'express', 'express_go', 'bastion'];
  } else if (isHouse) {
    // Для дома (кирпич или дерево) - только Бастион
    availableProducts = ['bastion'];
  } else {
    // Для других типов объектов не показываем вариант 2
    return null;
  }

  // Рассчитываем вариант 2 с скидками 30%
  console.log('=== НАЧАЛО РАСЧЕТА ВАРИАНТА 2 ===');
  console.log('variant1Total =', variant1Total);
  console.log('insuranceAmount =', insuranceAmount);
  let propertyPremiumV2 = 0;
  let lifePremiumV2 = 0;

  // Расчет имущества с скидкой 30% (где разрешено)
  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult) {
      if (bankConfig.allow_discount_property) {
        // Применяем скидку 30% вместо стандартной (10% или другой)
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = Math.round(basePremium * 0.7 * 100) / 100; // 30% скидка
      } else {
        // Если скидки не разрешены, используем базовую премию без скидки
        propertyPremiumV2 = propertyResult.totalWithoutDiscount || propertyResult.total;
      }
    }
  }

  // Расчет жизни с скидкой 30% (где разрешено)
  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult) {
      if (bankConfig.allow_discount_life) {
        // Применяем скидку 30% вместо стандартной (25% или другой)
        const basePremium = lifeResult.totalWithoutDiscount;
        lifePremiumV2 = Math.round(basePremium * 0.7 * 100) / 100; // 30% скидка
      } else {
        // Если скидки не разрешены, используем базовую премию без скидки
        lifePremiumV2 = lifeResult.totalWithoutDiscount || lifeResult.total;
      }
    }
  }

  // Рассчитываем доп. риски для каждого доступного продукта
  const productResults = [];
  const baseVariant2Total = propertyPremiumV2 + lifePremiumV2;
  console.log('Базовый вариант 2 (property + life):', baseVariant2Total);

  for (const product of availableProducts) {
    const additionalRisk = calculateIFLAdditionalRisk(product, data, insuranceAmount);
    if (additionalRisk) {
      const totalV2 = propertyPremiumV2 + lifePremiumV2 + additionalRisk.premium;
      console.log('Продукт', product, '- дополнительная премия:', additionalRisk.premium, '- итого:', totalV2);
      productResults.push({
        product: product,
        productName: additionalRisk.productName,
        riskName: additionalRisk.riskName,
        premium: additionalRisk.premium,
        total: totalV2
      });
    }
  }

  // Если нет подходящих продуктов, не показываем вариант 2
  if (productResults.length === 0) {
    return null;
  }

  // Сортируем продукты с приоритетом: сначала "Моя квартира" и "Экспресс квартира", потом остальные
  // Разделяем на приоритетные и остальные
  const priorityProducts = productResults.filter(p => p.product === 'moyakvartira' || p.product === 'express');
  const otherProducts = productResults.filter(p => p.product !== 'moyakvartira' && p.product !== 'express');

  // Сортируем приоритетные по сумме
  priorityProducts.sort((a, b) => a.total - b.total);
  // Сортируем остальные по сумме
  otherProducts.sort((a, b) => a.total - b.total);

  // Выбираем лучший продукт
  let bestProduct = null;
  let bestDifference = null;
  const targetDifference = 2200; // Целевая разница

  console.log('Поиск лучшего продукта среди', productResults.length, 'вариантов:');
  productResults.forEach(p => {
    console.log(`- ${p.product}: total=${p.total}, difference=${variant1Total - p.total}`);
  });

  // Сначала проверяем приоритетные продукты
  for (const product of priorityProducts) {
    const difference = variant1Total - product.total;
    if (difference >= 200) {
      // Если разница в допустимом диапазоне (до 2200), выбираем самый ДОРОГОЙ
      if (difference <= 2200) {
        if (!bestProduct || product.total > bestProduct.total) {
          bestProduct = product;
          bestDifference = difference;
        }
      } else {
        // Если разница больше 2200, выбираем продукт с разницей ближайшей к 2200
        if (!bestProduct || Math.abs(difference - targetDifference) < Math.abs(bestDifference - targetDifference)) {
          bestProduct = product;
          bestDifference = difference;
        }
      }
    }
  }

  // Если не нашли подходящий приоритетный продукт, проверяем остальные
  if (!bestProduct) {
    for (const product of otherProducts) {
      const difference = variant1Total - product.total;
      if (difference >= 200) {
        // Если разница в допустимом диапазоне (до 2200), выбираем самый дешевый среди остальных
        if (difference <= 2200) {
          if (!bestProduct || product.total < bestProduct.total) {
            bestProduct = product;
            bestDifference = difference;
          }
        } else {
          // Если разница больше 2200, выбираем продукт с разницей ближайшей к 2200
          if (!bestProduct || Math.abs(difference - targetDifference) < Math.abs(bestDifference - targetDifference)) {
            bestProduct = product;
            bestDifference = difference;
          }
        }
      }
    }
  }

  // Если не нашли подходящий продукт (разница меньше 200), не показываем вариант 2
  if (!bestProduct || bestDifference < 200) {
    return null;
  }

  // Если разница больше 3000, увеличиваем страховые суммы для достижения разницы около 3000
  console.log('Выбран лучший продукт:', bestProduct ? `${bestProduct.product} (total: ${bestProduct.total})` : 'null');
  console.log('bestDifference:', bestDifference);

  let finalProduct = bestProduct;
  let additionalRisks = [];
  let currentTotal = bestProduct.total;
  let currentDifference = variant1Total - currentTotal;

  console.log('До увеличения сумм:');
  console.log('- currentTotal (bestProduct.total):', currentTotal);
  console.log('- currentDifference (variant1Total - currentTotal):', currentDifference);

  // Целевая разница: около 3000 рублей
  const targetDifferenceLarge = 3000;

  // Если разница больше 3000, увеличиваем суммы подобъектов
  if (currentDifference > targetDifferenceLarge) {
    // Добавляем дополнительные риски в зависимости от продукта
    if (bestProduct.product === 'moyakvartira') {
      // Для "Моя квартира" увеличиваем суммы отделки, движимого имущества и ГО
      const moyaTariff = window.T_MOYA;
      let baseFinishSum = 200000; // По умолчанию минимум
      if (moyaTariff) {
        if (insuranceAmount > 5000000) {
          baseFinishSum = 200000;
        } else {
          baseFinishSum = Math.min(500000, Math.max(200000, insuranceAmount * 0.08));
        }
      }

      // Увеличиваем суммы для достижения разницы около 3000
      const additionalRisksResult = increaseMoyaKvartiraSumsForDifference(data, insuranceAmount, currentDifference, targetDifferenceLarge, baseFinishSum, variant1Total, propertyPremiumV2, lifePremiumV2);
      if (additionalRisksResult && additionalRisksResult.risks.length > 0) {
        additionalRisks = additionalRisksResult.risks;
        currentTotal = propertyPremiumV2 + lifePremiumV2 + additionalRisksResult.totalPremium;
        currentDifference = variant1Total - currentTotal;

        // Обновляем финальный продукт с увеличенными суммами
        finalProduct = {
          product: 'moyakvartira',
          productName: 'Моя квартира',
          riskName: 'отделка и инженерное оборудование',
          premium: additionalRisksResult.totalPremium,
          total: currentTotal,
          increasedRisks: additionalRisks,
          useIncreasedRisksOnly: true // Флаг, что показывать только increasedRisks
        };

        console.log('После увеличения сумм:');
        console.log('- additionalRisksResult.totalPremium:', additionalRisksResult.totalPremium);
        console.log('- новый currentTotal:', currentTotal);
        console.log('- новая currentDifference:', variant1Total - currentTotal);
      }
    } else if (bestProduct.product === 'bastion') {
          // Для Бастиона увеличиваем сумму конструктива
      const bastionResult = increaseBastionSumsForDifference(data, insuranceAmount, currentDifference, targetDifferenceLarge, propertyPremiumV2, lifePremiumV2, variant1Total);
      if (bastionResult) {
        finalProduct = bastionResult.finalProduct;
        additionalRisks = bastionResult.additionalRisks;
        currentTotal = bastionResult.currentTotal;
        currentDifference = bastionResult.currentDifference;

        // Для Бастиона добавляем отделку как дополнительный риск
        const isFlat = data.objectType === 'flat' || data.objectType === null;
        const objectType = isFlat ? 'flat' : 'house';
        const bastionTariff = window.T_BASTION[objectType];
        if (bastionTariff) {
          const finishMin = bastionTariff.finish.min;
          const finishMax = Math.min(bastionTariff.finish.max, insuranceAmount);
          let finishSum;
          if (insuranceAmount < finishMin) {
            finishSum = Math.min(finishMin, finishMax);
          } else if (insuranceAmount > 5000000) {
            const maxReasonable = finishMin * 3;
            finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.05)));
          } else {
            const maxReasonable = finishMin * 3;
            finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.1)));
          }

          const finishPremium = Math.round(finishSum * bastionTariff.finish.rate * 100) / 100;

          // Добавляем отделку как дополнительный риск
          additionalRisks.push({
            name: 'Бастион',
            objects: `отделка и инженерное оборудование ${isFlat ? 'квартира' : 'дом'}`,
            sum: finishSum,
            premium: finishPremium
          });

          // Обновляем итоговую сумму
          currentTotal += finishPremium;
          finalProduct.total = currentTotal;
        }
      }
    } else if (bestProduct.product === 'express') {
      // Для "Экспресс квартира" выбираем пакет с большей суммой
      const expressResult = increaseExpressSumsForDifference(currentDifference, targetDifferenceLarge, propertyPremiumV2, lifePremiumV2, variant1Total);
      if (expressResult) {
        finalProduct = expressResult.finalProduct;
        currentTotal = expressResult.currentTotal;
        currentDifference = expressResult.currentDifference;
      }
    }
  }

  // Расчет титула для сложного пути
  let titleResult = null;
  if (data.risks.titul) {
    const withLifeInsurance = data.risks.life || false;
    titleResult = calculateTitleInsurance(data, bankConfig, insuranceAmount, withLifeInsurance, data.contractDate);
  }

  // Формируем вывод варианта 2
  let output = '';
  if (data.risks.property) {
    // Форматируем с 2 знаками после запятой
    const formattedProperty = propertyPremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `имущество ${formattedProperty}<br>`;
  }
  if (data.risks.life) {
    const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
    // Форматируем с 2 знаками после запятой
    const formattedLife = lifePremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `жизнь ${borrowerLabel} ${formattedLife}<br>`;
  }
  
  // Если используем только увеличенные риски (без основного продукта) или Бастион с дополнительными рисками
  if (finalProduct.useIncreasedRisksOnly && additionalRisks.length > 0) {
    additionalRisks.forEach(risk => {
      const formattedRiskPremium = risk.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      output += `доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${formattedRiskPremium}<br>`;
    });
  } else if (finalProduct.product === 'bastion' && additionalRisks.length > 0) {
    // Для Бастиона с дополнительными рисками показываем только дополнительные риски
    additionalRisks.forEach(risk => {
      const formattedRiskPremium = risk.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      output += `доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${formattedRiskPremium}<br>`;
    });
  } else {
    // Стандартная логика с основным продуктом
    const riskDetails = getAdditionalRiskDetails(finalProduct.product, data, insuranceAmount, finalProduct.premium, additionalRisks, finalProduct.packDetails);

    // Форматируем доп. риск с деталями
    const formattedRisk = finalProduct.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (riskDetails.sum) {
      output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${riskDetails.sum} ${formattedRisk}`;
    } else {
      output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${formattedRisk}`;
    }

    // Добавляем дополнительные риски, если есть
    if (additionalRisks.length > 0) {
      additionalRisks.forEach(risk => {
        const formattedRiskPremium = risk.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        output += `<br>доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${formattedRiskPremium}`;
      });
    }
  }
  
  // Добавляем перенос строки перед итого, если есть дополнительные риски
  if (additionalRisks.length === 0) {
    output += '<br>';
  }
  
  // Добавляем титул в output, если он есть
  if (titleResult) {
    const formattedTitle = titleResult.total.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `<br>титул ${formattedTitle}`;
  }

  // Проверяем, что вариант 2 действительно дешевле варианта 1
  console.log('Финальная проверка:');
  console.log('- currentTotal:', currentTotal);
  console.log('- variant1Total:', variant1Total);
  console.log('- difference:', variant1Total - currentTotal);

  if (currentTotal >= variant1Total) {
    console.log('Вариант 2 получился дороже или равен варианту 1, не показываем:', currentTotal, '>=', variant1Total);
    return null;
  }

  // Форматируем итого
  const formattedTotal = currentTotal.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  output += `<br>Итого тариф взнос ${formattedTotal}`;

  return {
    output: output,
    total: currentTotal
  };
}

// Функция для расчета варианта 3 с указанной скидкой
function calculateVariant3(data, bankConfig, insuranceAmount, discountPercent) {
  console.log('calculateVariant3: скидка =', discountPercent + '%');

  const discountRate = discountPercent / 100;
  let output = '';

  // Расчет имущества с указанной скидкой
  if (data.risks.property) {
    const propertyPremium = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    const propertyPremiumV3 = propertyPremium * (1 - discountRate);
    const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';

    // Форматируем с 2 знаками после запятой
    const formattedProperty = propertyPremiumV3.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `имущество ${formattedProperty}<br>`;
  }

  // Расчет жизни с указанной скидкой
  if (data.risks.life) {
    for (const borrower of data.borrowers) {
      const lifePremium = calculateLifeInsurance(data, bankConfig, borrower, insuranceAmount);
      const lifePremiumV3 = lifePremium * (1 - discountRate);
      const borrowerLabel = data.borrowers.length > 1 ? `${borrower.name}` : 'заемщик';

      // Форматируем с 2 знаками после запятой
      const formattedLife = lifePremiumV3.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      output += `жизнь ${borrowerLabel} ${formattedLife}<br>`;
    }
  }


  // Итоговый расчет
  let totalV3 = 0;

  if (data.risks.property) {
    const propertyPremium = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    totalV3 += propertyPremium * (1 - discountRate);
  }

  if (data.risks.life) {
    for (const borrower of data.borrowers) {
      const lifePremium = calculateLifeInsurance(data, bankConfig, borrower, insuranceAmount);
      totalV3 += lifePremium * (1 - discountRate);
    }
  }

  if (titleResult) {
    totalV3 += titleResult.total;
  }

  const formattedTotal = totalV3.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  output += `ИТОГО тариф/ взнос ${formattedTotal}<br><br>`;

  return {
    output: output,
    total: totalV3
  };
}

// Функция для увеличения сумм "Моя квартира" для достижения разницы около 3000
function increaseMoyaKvartiraSumsForDifference(data, insuranceAmount, currentDifference, targetDifference, baseFinishSum, variant1Total, propertyPremiumV2, lifePremiumV2) {
  const moyaTariff = window.T_MOYA;
  if (!moyaTariff) return null;

  // Текущая разница между вариантом 1 и базовым вариантом 2 с выбранным продуктом
  // Нам нужно добавить дополнительные риски, чтобы итоговая премия стала variant1Total - targetDifference

  const targetTotalPremium = variant1Total - targetDifference - (propertyPremiumV2 + lifePremiumV2);
  const neededAdditionalPremium = Math.max(0, targetTotalPremium);

  console.log('increaseMoyaKvartiraSumsForDifference:');
  console.log('- variant1Total:', variant1Total);
  console.log('- базовый вариант 2 (property + life):', propertyPremiumV2 + lifePremiumV2);
  console.log('- targetDifference:', targetDifference);
  console.log('- targetTotalPremium (variant1Total - targetDifference - baseV2):', targetTotalPremium);
  console.log('- neededAdditionalPremium:', neededAdditionalPremium);
  console.log('- currentDifference (из вызова):', currentDifference);

  if (neededAdditionalPremium <= 0) {
    return null; // Ничего не нужно добавлять
  }

  const risks = [];
  let totalPremium = 0;

  // ШАГ 1: Добавляем отделку "Моя квартира" с рассчитанной суммой
  if (moyaTariff.finish && moyaTariff.finish.length > 0) {
    // Используем среднюю ставку для расчета нужной суммы
    const avgFinishRate = 0.008; // Примерная ставка
    const targetFinishSum = Math.round(neededAdditionalPremium / avgFinishRate);
    const actualFinishSum = Math.max(50000, Math.min(500000, targetFinishSum));

    // Находим правильную ставку для рассчитанной суммы
    const finishRate = moyaTariff.finish.find(r => actualFinishSum >= r.min && actualFinishSum <= r.max)?.rate || 0.0095;
    const finishPremium = Math.round(actualFinishSum * finishRate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'отделка и инженерное оборудование',
      sum: actualFinishSum,
      premium: finishPremium
    });

    totalPremium = finishPremium;
    console.log('Добавлена отделка:', actualFinishSum, '->', finishPremium, '(итого:', totalPremium, ', нужно:', neededAdditionalPremium + ')');

    // Если достаточно, возвращаем
    if (totalPremium >= neededAdditionalPremium) {
      return { risks: risks, totalPremium: totalPremium };
    }
  }

  // ШАГ 2: Добавляем движимое имущество (если нужно)
  if (totalPremium < neededAdditionalPremium && moyaTariff.movable && moyaTariff.movable.length > 0) {
    const remainingNeeded = neededAdditionalPremium - totalPremium;

    // Рассчитываем сумму движимого имущества
    const avgMovableRate = 0.004; // Примерная ставка для движимого
    const targetMovableSum = Math.round(remainingNeeded / avgMovableRate);

    // Находим подходящий диапазон
    const suitableRange = moyaTariff.movable.find(r => targetMovableSum >= r.min && targetMovableSum <= r.max) ||
                         moyaTariff.movable[moyaTariff.movable.length - 1]; // Максимальный диапазон

    const actualMovableSum = Math.min(suitableRange.max, Math.max(suitableRange.min, targetMovableSum));
    const movablePremium = Math.round(actualMovableSum * suitableRange.rate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'движимое имущество',
      sum: actualMovableSum,
      premium: movablePremium
    });

    totalPremium += movablePremium;
    console.log('Добавлено движимое:', actualMovableSum, '->', movablePremium, '(итого:', totalPremium, ', нужно:', neededAdditionalPremium + ')');

    // Если достаточно, возвращаем
    if (totalPremium >= neededAdditionalPremium) {
      return { risks: risks, totalPremium: totalPremium };
    }
  }

  // ШАГ 3: Добавляем гражданскую ответственность (если нужно)
  if (totalPremium < neededAdditionalPremium && moyaTariff.go && moyaTariff.go.pack && moyaTariff.go.pack.length > 0) {
    const remainingNeeded = neededAdditionalPremium - totalPremium;

    // Рассчитываем сумму ГО
    const avgGoRate = 0.002; // Примерная ставка для ГО
    const targetGoSum = Math.round(remainingNeeded / avgGoRate);

    // Находим подходящий диапазон
    const suitableRange = moyaTariff.go.pack.find(r => targetGoSum >= r.min && targetGoSum <= r.max) ||
                         moyaTariff.go.pack[moyaTariff.go.pack.length - 1]; // Максимальный диапазон

    const actualGoSum = Math.min(suitableRange.max, Math.max(suitableRange.min, targetGoSum));
    const goPremium = Math.round(actualGoSum * suitableRange.rate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'гражданская ответственность',
      sum: actualGoSum,
      premium: goPremium
    });

    totalPremium += goPremium;
    console.log('Добавлено ГО:', actualGoSum, '->', goPremium, '(итого:', totalPremium, ', нужно:', neededAdditionalPremium + ')');
  }


  console.log('Финальный результат: totalPremium =', totalPremium, 'из neededAdditionalPremium =', neededAdditionalPremium);
  console.log('Возвращаемые риски:', risks.map(r => `${r.name} ${r.objects}: ${r.sum} -> ${r.premium}`).join(', '));

  return totalPremium > 0 ? {
    risks: risks,
    totalPremium: totalPremium
  } : null;
}

// Функция для увеличения сумм Бастиона для достижения разницы около 3000
function increaseBastionSumsForDifference(data, insuranceAmount, currentDifference, targetDifference, propertyPremiumV2, lifePremiumV2, variant1Total) {
  const bastionTariff = window.T_BASTION;
  if (!bastionTariff) return null;

  const isFlat = data.objectType === 'flat' || data.objectType === null;
  const objectType = isFlat ? 'flat' : 'house';

  if (!bastionTariff[objectType]) return null;

  const neededPremium = currentDifference - targetDifference;
  const constructMax = bastionTariff[objectType].cons.max;
  const constructMin = bastionTariff[objectType].cons.min;
  const constructRate = bastionTariff[objectType].cons.rate;

  // Рассчитываем нужную сумму конструктива
  const baseConstructPremium = Math.round(constructMin * constructRate * 100) / 100;
  const additionalNeeded = Math.max(0, neededPremium - baseConstructPremium);

  let constructSum = constructMin;
  if (additionalNeeded > 0) {
    // Увеличиваем сумму конструктива
    const additionalSum = Math.round(additionalNeeded / constructRate);
    constructSum = Math.min(constructMax, constructMin + additionalSum);
  }

  const constructPremium = Math.round(constructSum * constructRate * 100) / 100;
  const totalV2 = propertyPremiumV2 + lifePremiumV2 + constructPremium;
  const newDifference = variant1Total - totalV2;

  return {
    finalProduct: {
      product: 'bastion',
      productName: 'Бастион',
      riskName: 'военные риски',
      premium: constructPremium,
      total: totalV2
    },
    additionalRisks: [{
      name: 'Бастион',
      objects: 'конструктивные элементы',
      sum: constructSum,
      premium: constructPremium
    }],
    currentTotal: totalV2,
    currentDifference: newDifference
  };
}

// Функция для увеличения сумм "Экспресс квартира" для достижения разницы около 3000
function increaseExpressSumsForDifference(currentDifference, targetDifference, propertyPremiumV2, lifePremiumV2, variant1Total) {
  const packs = window.EXPRESS_PACKS;
  if (!packs) return null;

  const neededPremium = currentDifference - targetDifference;
  const targetTotalV2 = variant1Total - targetDifference;
  const targetPremium = targetTotalV2 - propertyPremiumV2 - lifePremiumV2;

  // Находим пакет с максимальной премией, но не превышающий нужную
  let bestPack = null;
  let bestDiff = Infinity;

  for (const pack of packs) {
    if (pack.noGo <= targetPremium * 1.5) { // Не превышаем в 1.5 раза
      const diff = Math.abs(pack.noGo - targetPremium);
      if (diff < bestDiff) {
        bestPack = pack;
        bestDiff = diff;
      }
    }
  }

  if (!bestPack) {
    // Если не нашли подходящий, берем самый дорогой
    bestPack = packs.reduce((max, p) => p.noGo > max.noGo ? p : max, packs[0]);
  }

  const totalV2 = propertyPremiumV2 + lifePremiumV2 + bestPack.noGo;
  const newDifference = variant1Total - totalV2;

  return {
    finalProduct: {
      product: 'express',
      productName: 'Экспресс квартира',
      riskName: 'отделка и движимое имущество',
      premium: bestPack.noGo,
      total: totalV2,
      packDetails: { pack: bestPack }
    },
    currentTotal: totalV2,
    currentDifference: newDifference
  };
}

// Добавление дополнительных рисков для "Моя квартира" для уменьшения разницы
function addAdditionalRisksForMoyaKvartira(data, insuranceAmount, neededIncrease, baseFinishSum = 200000) {
  const moyaTariff = window.T_MOYA;
  if (!moyaTariff) return null;

  const risks = [];
  let totalPremium = 0;
  let remainingIncrease = neededIncrease;

  // baseFinishSum передается из вызывающей функции - это сумма отделки, которая уже используется

  // Для равномерности: движимое имущество должно быть примерно такого же порядка, как отделка
  // Максимальная разница не должна превышать 2x от базовой суммы для равномерности
  const maxReasonableMovable = baseFinishSum * 2.5; // Максимум 500 000 для равномерности

  if (remainingIncrease > 300) {
    // Пробуем суммы для движимого имущества, близкие к сумме отделки
    // Генерируем больше вариантов в разумном диапазоне
    const testSums = [];
    for (let multiplier = 1; multiplier <= 2.5; multiplier += 0.25) {
      const testSum = Math.round(baseFinishSum * multiplier);
      if (testSum >= 50000 && testSum <= Math.min(2000000, maxReasonableMovable)) {
        testSums.push(testSum);
      }
    }
    
    let bestMovable = null;
    let bestScore = Infinity;
    
    for (const testSum of testSums) {
      const movableRate = moyaTariff.movable.find(r => testSum >= r.min && testSum <= r.max);
      if (movableRate) {
        const movablePremium = Math.round(testSum * movableRate.rate * 100) / 100;
        const diff = Math.abs(movablePremium - remainingIncrease);
        
        // Оценка равномерности: штраф за отклонение от базовой суммы
        // Чем ближе к базовой сумме, тем лучше
        const uniformityPenalty = Math.abs(testSum - baseFinishSum) / baseFinishSum * 2000;
        // Оценка точности: насколько близка премия к нужной
        const accuracyScore = diff;
        // Комбинированная оценка: приоритет равномерности, но учитываем нужную премию
        const combinedScore = accuracyScore + uniformityPenalty;
        
        if (combinedScore < bestScore && movablePremium <= remainingIncrease + 2000) {
          bestMovable = {
            sum: Math.round(testSum),
            premium: movablePremium
          };
          bestScore = combinedScore;
        }
      }
    }
    
    if (bestMovable) {
      risks.push({
        name: 'Моя квартира',
        objects: 'движимое имущество',
        sum: bestMovable.sum,
        premium: bestMovable.premium
      });
      totalPremium += bestMovable.premium;
      remainingIncrease -= bestMovable.premium;
    }
  }

  // Пытаемся добавить ГО, если еще нужно
  // ГО тоже должна быть разумной суммы, не слишком большой
  // Для равномерности ГО должна быть примерно равна или меньше отделки
  if (remainingIncrease > 200) {
    // Для ГО используем суммы в диапазоне 100 000 - не больше чем отделка * 1.5
    const maxReasonableGO = Math.min(500000, baseFinishSum * 1.5);
    const testSums = [];
    for (let sum = 100000; sum <= maxReasonableGO; sum += 50000) {
      testSums.push(sum);
    }
    // Добавляем также суммы близкие к базовой
    if (baseFinishSum >= 100000 && baseFinishSum <= 500000) {
      testSums.push(baseFinishSum);
      testSums.push(Math.round(baseFinishSum * 0.8));
      testSums.push(Math.round(baseFinishSum * 1.2));
    }
    
    // Убираем дубликаты и сортируем
    const uniqueSums = [...new Set(testSums)].sort((a, b) => a - b);
    
    let bestGO = null;
    let bestScore = Infinity;
    
    for (const testSum of uniqueSums) {
      if (testSum < 100000 || testSum > 500000) continue; // Проверяем диапазон
      
      const goRate = moyaTariff.go.pack.find(r => testSum >= r.min && testSum <= r.max);
      if (goRate) {
        const goPremium = Math.round(testSum * goRate.rate * 100) / 100;
        const diff = Math.abs(goPremium - remainingIncrease);
        
        // Оценка равномерности: предпочитаем суммы близкие к базовой или меньше
        const uniformityPenalty = testSum > baseFinishSum ? (testSum - baseFinishSum) / baseFinishSum * 1500 : 0;
        // Оценка точности
        const accuracyScore = diff;
        // Комбинированная оценка
        const combinedScore = accuracyScore + uniformityPenalty;
        
        if (combinedScore < bestScore && goPremium <= remainingIncrease + 1000) {
          bestGO = {
            sum: Math.round(testSum),
            premium: goPremium
          };
          bestScore = combinedScore;
        }
      }
    }
    
    if (bestGO) {
      risks.push({
        name: 'Моя квартира',
        objects: 'гражданская ответственность',
        sum: bestGO.sum,
        premium: bestGO.premium
      });
      totalPremium += bestGO.premium;
    }
  }

  if (risks.length === 0) return null;

  return {
    risks: risks,
    totalPremium: totalPremium
  };
}

// Выбор более дорогого пакета для "Экспресс квартира"
function upgradeExpressPack(neededIncrease) {
  const packs = window.EXPRESS_PACKS;
  if (!packs || packs.length === 0) return null;

  // Сортируем пакеты по цене
  const sortedPacks = [...packs].sort((a, b) => a.noGo - b.noGo);
  
  // Находим пакет, который увеличит премию примерно на neededIncrease
  // Начинаем с минимального пакета (550) и ищем подходящий
  const minPack = sortedPacks[0];
  const targetPremium = minPack.noGo + neededIncrease;
  
  // Находим пакет с ценой ближайшей к целевой
  let bestPack = minPack;
  let bestDiff = Math.abs(minPack.noGo - targetPremium);
  
  for (const pack of sortedPacks) {
    const diff = Math.abs(pack.noGo - targetPremium);
    if (diff < bestDiff && pack.noGo >= minPack.noGo) {
      bestPack = pack;
      bestDiff = diff;
    }
  }

  return {
    premium: bestPack.noGo,
    pack: bestPack
  };
}

// Получение деталей доп. риска для вывода
function getAdditionalRiskDetails(product, data, insuranceAmount, premium, additionalRisks = [], packDetails = null) {
  if (!window.T_BASTION || !window.EXPRESS_PACKS || !window.EXPRESS_GO_PACKS || !window.T_MOYA) {
    return { objects: '', sum: '' };
  }

  switch (product) {
    case 'bastion': {
      // Для Бастиона с увеличенными суммами не показываем основной продукт,
      // только дополнительные риски (отделка + конструктив)
      if (additionalRisks && additionalRisks.length > 0) {
        return { objects: '', sum: '' }; // Не показываем основной продукт
      }

      // Базовая логика - отделка
      const isFlat = data.objectType === 'flat' || data.objectType === null;
      const objectType = isFlat ? 'flat' : 'house';
      const bastionTariff = window.T_BASTION[objectType];

      if (!bastionTariff) return { objects: 'военные риски', sum: '' };

      const finishMin = bastionTariff.finish.min;
      const finishMax = Math.min(bastionTariff.finish.max, insuranceAmount);
      let finishSum;
      if (insuranceAmount < finishMin) {
        finishSum = Math.min(finishMin, finishMax);
      } else if (insuranceAmount > 5000000) {
        const maxReasonable = finishMin * 3;
        finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.05)));
      } else {
        const maxReasonable = finishMin * 3;
        finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.1)));
      }

      const objectName = isFlat ? 'квартира' : 'дом';
      const formattedSum = Math.round(finishSum).toLocaleString('ru-RU');
      return {
        objects: `отделка и инженерное оборудование ${objectName}`,
        sum: `на сумму ${formattedSum} ₽ премия`
      };
    }

    case 'express': {
      const packs = window.EXPRESS_PACKS;
      if (!packs || packs.length === 0) return { objects: 'отделка и движимое имущество', sum: '' };

      // Если есть packDetails, используем его, иначе минимальный пакет
      const selectedPack = packDetails ? packDetails.pack : packs.reduce((min, p) => p.noGo < min.noGo ? p : min, packs[0]);
      const finishSum = selectedPack.finish.toLocaleString('ru-RU');
      const movableSum = selectedPack.movable ? selectedPack.movable.toLocaleString('ru-RU') : 'не страхуется';
      return {
        objects: 'отделка и инженерное оборудование, движимое имущество',
        sum: `отделка ${finishSum} ₽, движимое ${movableSum} ₽ премия`
      };
    }

    case 'express_go': {
      const packs = window.EXPRESS_GO_PACKS;
      if (!packs || packs.length === 0) return { objects: 'гражданская ответственность', sum: '' };

      const minPack = packs.reduce((min, p) => p.price < min.price ? p : min, packs[0]);
      const sum = minPack.sum.toLocaleString('ru-RU');
      return {
        objects: 'гражданская ответственность',
        sum: `на сумму ${sum} ₽ премия`
      };
    }

    case 'moyakvartira': {
      const moyaTariff = window.T_MOYA;
      if (!moyaTariff) return { objects: 'отделка и инженерное оборудование', sum: '' };

      let finishSum;
      if (insuranceAmount > 5000000) {
        finishSum = 200000;
      } else {
        finishSum = Math.min(500000, Math.max(200000, insuranceAmount * 0.08));
      }
      
      const formattedSum = Math.round(finishSum).toLocaleString('ru-RU');
      return {
        objects: 'отделка и инженерное оборудование',
        sum: `на сумму ${formattedSum} ₽ премия`
      };
    }

    default:
      return { objects: '', sum: '' };
  }
}

// Расчет доп. риска для продуктов IFL
function calculateIFLAdditionalRisk(product, data, insuranceAmount) {
  if (!window.T_BASTION || !window.EXPRESS_PACKS || !window.EXPRESS_GO_PACKS || !window.T_MOYA) {
    return null;
  }

  switch (product) {
    case 'bastion': {
      // Бастион - военные риски
      const isFlat = data.objectType === 'flat' || data.objectType === null;
      const objectType = isFlat ? 'flat' : 'house';
      const bastionTariff = window.T_BASTION[objectType];
      
      if (!bastionTariff) return null;

      // Используем отделку для расчета
      const finishMin = bastionTariff.finish.min;
      const finishMax = Math.min(bastionTariff.finish.max, insuranceAmount);
      
      // Если страховая сумма меньше минимума, используем минимум
      // Если страховая сумма больше минимума, используем процент от суммы, но не меньше минимума
      // Для равномерности используем разумный процент, не слишком большой
      let finishSum;
      if (insuranceAmount < finishMin) {
        // Если страховая сумма меньше минимума, используем минимум (если он не превышает максимум)
        finishSum = Math.min(finishMin, finishMax);
      } else if (insuranceAmount > 5000000) {
        // Для больших сумм используем меньший процент (5%), но не больше чем минимум * 3 для равномерности
        const maxReasonable = finishMin * 3; // Максимально разумная сумма для равномерности
        finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.05)));
      } else {
        // Для обычных сумм используем 10% от страховой суммы, но не меньше минимума
        // И не больше чем минимум * 3 для равномерности
        const maxReasonable = finishMin * 3;
        finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.1)));
      }
      
      if (finishSum < finishMin || finishSum > finishMax) return null;

      const premium = Math.round(finishSum * bastionTariff.finish.rate * 100) / 100;
      return {
        productName: 'Бастион',
        riskName: 'военные риски',
        premium: premium
      };
    }

    case 'express': {
      // Экспресс квартира - выбираем пакет с минимальной ценой
      const packs = window.EXPRESS_PACKS;
      if (!packs || packs.length === 0) return null;

      // Выбираем пакет без ГО (noGo) с минимальной ценой
      const minPack = packs.reduce((min, p) => p.noGo < min.noGo ? p : min, packs[0]);
      return {
        productName: 'Экспресс квартира',
        riskName: 'отделка и движимое имущество',
        premium: minPack.noGo
      };
    }

    case 'express_go': {
      // Экспресс ГО - выбираем пакет с минимальной ценой
      const packs = window.EXPRESS_GO_PACKS;
      if (!packs || packs.length === 0) return null;

      const minPack = packs.reduce((min, p) => p.price < min.price ? p : min, packs[0]);
      return {
        productName: 'Экспресс ГО',
        riskName: 'гражданская ответственность',
        premium: minPack.price
      };
    }

    case 'moyakvartira': {
      // Моя квартира - НЕ используем конструктивный элемент (запрещено во 2 варианте)
      // Используем только отделку
      const moyaTariff = window.T_MOYA;
      if (!moyaTariff) return null;

      // Рассчитываем по отделке (используем разумную сумму в пределах диапазона)
      // Для больших страховых сумм используем меньший процент или минимальную сумму
      let finishSum;
      if (insuranceAmount > 5000000) {
        // Для очень больших сумм используем минимальную сумму из первого диапазона
        finishSum = 200000;
      } else {
        // Для обычных сумм используем 5-10% от страховой суммы, но в пределах диапазона
        finishSum = Math.min(500000, Math.max(200000, insuranceAmount * 0.08));
      }
      
      const finishRate = moyaTariff.finish.find(r => finishSum >= r.min && finishSum <= r.max);
      
      if (!finishRate) {
        // Если не попали в диапазон, используем минимальный диапазон
        const minRate = moyaTariff.finish[0];
        finishSum = 200000;
        const premium = Math.round(finishSum * minRate.rate * 100) / 100;
        return {
          productName: 'Моя квартира',
          riskName: 'отделка и инженерное оборудование',
          premium: premium
        };
      }

      const premium = Math.round(finishSum * finishRate.rate * 100) / 100;
      return {
        productName: 'Моя квартира',
        riskName: 'отделка и инженерное оборудование',
        premium: premium
      };
    }

    default:
      return null;
  }
}
