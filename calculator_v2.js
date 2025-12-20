// calculator_v2.js

// Основная функция для обработки запроса клиента
function handleClientRequest(clientText) {
  try {
    // Парсим текст с помощью parseTextToObject
    const parsedData = parseTextToObject(clientText);

    console.log("Разобранные данные:", parsedData);

    // === РАСШИРЕННАЯ ПРОВЕРКА ВХОДНЫХ ДАННЫХ ===
    const missing = [];

    // Банк
    if (!parsedData.bank) {
      missing.push("банк (например: Сбербанк, ВТБ, Дом.РФ)");
    }

    // Остаток долга
    if (!parsedData.osz) {
      missing.push('ОСЗ — остаток ссудной задолженности (например: "осз 3 200 000")');
    }

    // Риски
    const hasRisks =
      parsedData.risks &&
      (parsedData.risks.life || parsedData.risks.property || parsedData.risks.titul);

    if (!hasRisks) {
      missing.push("тип страхования (жизнь / имущество / титул)");
    }

    // Заемщики
    if (!parsedData.borrowers || parsedData.borrowers.length === 0) {
      missing.push('данные заемщика: пол и дата рождения (например: "муж 15.08.1985")');
    } else {
      parsedData.borrowers.forEach((b, idx) => {
        const num = idx + 1;
        if (!b.gender) {
          missing.push(`пол заемщика ${num} (муж / жен / мужчина / женщина)`);
        }
        if (!b.birthDate && !b.age) {
          missing.push(`дата рождения заемщика ${num} (формат ДД.ММ.ГГГГ)`);
        }
      });
    }

    // Объект – только если есть имущественный риск
    if (
      parsedData.risks &&
      parsedData.risks.property &&
      !parsedData.objectType
    ) {
      missing.push(
        "тип объекта (квартира / дом / таунхаус) и материал (кирпич / дерево / газобетон и т.п.)"
      );
    }

    // Если чего‑то не хватает – возвращаем конкретный список и выходим
    if (missing.length > 0) {
      return (
        "❌ Ошибка: не хватает данных для расчета.\n\n" +
        "Проверьте и добавьте:\n" +
        missing.map((m, i) => `${i + 1}. ${m}`).join("\n")
      );
    }

    // === ДАЛЬШЕ ВАША ИСХОДНАЯ ЛОГИКА БЕЗ ИЗМЕНЕНИЙ ===

    // Выполняем расчеты
    const result = performCalculations(parsedData);

    // Автоматически копируем только варианты расчета в буфер обмена
    if (result && (result.includes('Вариант 1') || result.includes('Вариант 2'))) {
      // Извлекаем только части с вариантами расчета
      let textForClipboard = '';

      // Разбиваем результат на строки
      const lines = result.split('');

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

// Функция выполнения всех расчетов
function performCalculations(data) {
  const bankConfig = window.BANKS[data.bank];

  if (!bankConfig) {
    return `Банк "${data.bank}" не найден в конфигурации.`;
  }

  let output = `Банк: ${data.bank}`;
  output += `\nОстаток долга: ${data.osz.toLocaleString('ru-RU')} ₽`;

  // Расчет страховой суммы с надбавкой
  let insuranceAmount = data.osz;

  if (bankConfig.add_percent && bankConfig.add_percent > 0) {
    // Фиксированная надбавка из конфигурации банка
    const markup = data.osz * (bankConfig.add_percent / 100);
    insuranceAmount = data.osz + markup;
    output += `\nНадбавка ${bankConfig.add_percent}%: ${markup.toLocaleString('ru-RU')} ₽`;
    output += `\nСтраховая сумма: ${insuranceAmount.toLocaleString('ru-RU')} ₽`;
  } else if (bankConfig.add_percent === null && data.markupPercent) {
    // Клиент сам указывает надбавку (для Альфа Банка и УБРИР)
    const markup = data.osz * (data.markupPercent / 100);
    insuranceAmount = data.osz + markup;
    output += `\nНадбавка ${data.markupPercent}% (клиент): ${markup.toLocaleString('ru-RU')} ₽`;
    output += `\nСтраховая сумма: ${insuranceAmount.toLocaleString('ru-RU')} ₽`;
  } else if (bankConfig.add_percent === null) {
    // Надбавка не указана клиентом
    output += `\nВнимание: Для этого банка укажите надбавку в процентах (например: "15% надбавка")`;
  } else {
    // add_percent = 0 - надбавки нет, используем остаток как страховую сумму
    output += `\nСтраховая сумма: ${insuranceAmount.toLocaleString('ru-RU')} ₽`;
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
    const titleResult = calculateTitleInsurance(insuranceAmount);
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
  output += `\n\nВариант 1:`;

  if (data.risks.property && propertyResult) {
    output += `\nИмущество ${(propertyResult.totalWithoutDiscount || propertyResult.total).toLocaleString('ru-RU')}`;
  }

  if (data.risks.life && lifeResult) {
    lifeResult.borrowers.forEach((borrower, index) => {
      const borrowerLabel = data.borrowers.length > 1 ? `заемщик ${index + 1}` : 'заемщик';
      output += `\nЖизнь ${borrowerLabel} ${borrower.premium.toLocaleString('ru-RU')}`;
    });
  }

  if (data.risks.titul && titleResult) {
    output += `\nТитул ${titleResult.total.toLocaleString('ru-RU')}`;
  }

  output += `\nИТОГО тариф/ взнос ${totalWithoutDiscount.toLocaleString('ru-RU')}`;

  // Расчет варианта 2 (повышенные скидки + доп. риски)
  console.log('Начинаем расчет варианта 2...');

  try {
    const variant2Result = calculateVariant2(data, bankConfig, insuranceAmount, totalWithoutDiscount);
    console.log('Результат расчета варианта 2:', variant2Result);

    if (variant2Result && variant2Result.output) {
      console.log('Добавляем вариант 2 в вывод');
      output += `\n\nВариант 2 (повышенные скидки + доп. риски):`;
      output += `\n${variant2Result.output}`;
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
        output += `\n\nВариант 3 (скидка ${data.variant3Discount}%):`;
        output += `\n${variant3Result.output}`;
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

  if (data.bank === "Дом.РФ") {
    tariffTable = window.LIFE_TARIFF_DOMRF || LIFE_TARIFF_DOMRF;
  } else if (data.bank === "РСХБ") {
    tariffTable = window.LIFE_TARIFF_RSHB_LOSS || LIFE_TARIFF_RSHB_LOSS;
  } else if (data.bank === "Банк СПБ") {
    tariffTable = window.LIFE_TARIFF_SPB || LIFE_TARIFF_SPB;
  } else if (data.bank === "МКБ") {
    tariffTable = window.LIFE_TARIFF_MKB || LIFE_TARIFF_MKB;
  } else {
    tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE;
  }

  data.borrowers.forEach((borrower) => {
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

    const premiumWithDiscount = hasDiscount
      ? Math.round(premium * discountMultiplier * 100) / 100
      : premium;

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

  // Получаем тариф
  const tariff = (window.getPropertyTariff || getPropertyTariff)(data.bank, objectType);

  if (!tariff) {
    return {
      output: `Страхование имущества: тариф для типа объекта не найден`,
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
function calculateTitleInsurance(insuranceAmount) {
  const tariff = 0.2; // 0.2% для всех банков
  const premium = Math.round(insuranceAmount * (tariff / 100) * 100) / 100;
  return {
    total: premium,
    totalWithoutDiscount: premium,
    hasDiscount: false
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
      output += `\nИмущество ${propertyPremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    }

    if (data.risks.life && lifePremiumV2 > 0) {
      const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
      output += `\nЖизнь ${borrowerLabel} ${lifePremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    }

    output += `\nИтого тариф взнос ${totalV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

    return {
      output: output,
      total: totalV2
    };
  }

  // Ниже сохраняется твоя исходная полная логика calculateVariant2
  // (предполагается, что весь оставшийся код функции уже есть в файле
  // и здесь он продолжается без изменений – выбор продуктов IFL, подбор разницы и т.п.)
  // ...
}
