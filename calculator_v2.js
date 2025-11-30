// calculator_v2.js

// Основная функция для обработки запроса клиента
function handleClientRequest(clientText) {
  try {
    // Парсим текст с помощью parseTextToObject
    const parsedData = parseTextToObject(clientText);

    console.log("Разобранные данные:", parsedData);

    // Проверяем наличие основных данных
    if (!parsedData.bank) {
      return "Не удалось определить банк. Пожалуйста, укажите банк в запросе.";
    }

    if (!parsedData.osz) {
      return "Не удалось определить сумму кредита (остаток). Пожалуйста, укажите остаток долга.";
    }

    // Проверяем, есть ли риски для расчета
    const hasRisks = parsedData.risks.life || parsedData.risks.property || parsedData.risks.titul;
    if (!hasRisks) {
      return "Не удалось определить тип страхования. Укажите 'жизнь', 'имущество' или 'титул'.";
    }

    // Выполняем расчеты
    const result = performCalculations(parsedData);

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

  let output = `<b>Банк:</b> ${data.bank}<br>`;
  output += `<b>Остаток долга:</b> ${data.osz.toLocaleString('ru-RU')} ₽<br><br>`;

  // Расчет страховой суммы с надбавкой
  let insuranceAmount = data.osz;
  if (bankConfig.add_percent && bankConfig.add_percent > 0) {
    const markup = data.osz * (bankConfig.add_percent / 100);
    insuranceAmount = data.osz + markup;
    output += `<b>Надбавка ${bankConfig.add_percent}%:</b> ${markup.toLocaleString('ru-RU')} ₽<br>`;
    output += `<b>Страховая сумма:</b> ${insuranceAmount.toLocaleString('ru-RU')} ₽<br><br>`;
  } else if (bankConfig.add_percent === null) {
    output += `<b>Внимание:</b> Для этого банка надбавка вводится вручную клиентом<br><br>`;
  } else {
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

  // Вывод результатов
  if (data.risks.property && propertyResult) {
    if (propertyResult.hasDiscount) {
      output += `Имущество ${propertyResult.totalWithoutDiscount.toLocaleString('ru-RU')} Со скидкой ${propertyResult.total.toLocaleString('ru-RU')}<br>`;
    } else {
      output += `Имущество ${propertyResult.total.toLocaleString('ru-RU')}<br>`;
    }
  }

  if (data.risks.life && lifeResult) {
    if (lifeResult.hasDiscount) {
      output += `жизнь заемщик ${lifeResult.totalWithoutDiscount.toLocaleString('ru-RU')} Со скидкой ${lifeResult.total.toLocaleString('ru-RU')}<br>`;
    } else {
      output += `жизнь заемщик ${lifeResult.total.toLocaleString('ru-RU')}<br>`;
    }
  }

  if (data.risks.titul && titleResult) {
    output += `титул ${titleResult.total.toLocaleString('ru-RU')}<br>`;
  }

  // Итого
  if (hasAnyDiscount) {
    output += `ИТОГО тариф/ взнос ${totalWithoutDiscount.toLocaleString('ru-RU')} Со скидкой ${totalWithDiscount.toLocaleString('ru-RU')}`;
  } else {
    output += `ИТОГО тариф/ взнос ${totalWithDiscount.toLocaleString('ru-RU')}`;
  }

  return output;
}

// Расчет страхования жизни
function calculateLifeInsurance(data, bankConfig, insuranceAmount) {
  if (!data.borrowers || data.borrowers.length === 0) {
    return null;
  }

  let totalPremium = 0;
  let totalPremiumWithDiscount = 0;
  let hasDiscount = bankConfig.allow_discount_life;

  // Определяем тарифы в зависимости от банка
  let tariffTable;
  if (data.bank === "Дом.РФ") {
    tariffTable = window.LIFE_TARIFF_DOMRF || LIFE_TARIFF_DOMRF;
  } else if (data.bank === "РСХБ") {
    tariffTable = window.LIFE_TARIFF_RSHB_LOSS || LIFE_TARIFF_RSHB_LOSS;
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
    const premium = shareAmount * (tariff / 100);

    totalPremium += premium;

    if (hasDiscount) {
      totalPremiumWithDiscount += premium * 0.75; // 25% скидка
    }
  });

  return {
    total: hasDiscount ? totalPremiumWithDiscount : totalPremium,
    totalWithoutDiscount: totalPremium,
    hasDiscount: hasDiscount
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
      output: `<b>Страхование имущества:</b> тариф для типа объекта не найден<br><br>`,
      total: 0
    };
  }

  const premium = insuranceAmount * (tariff / 100);

  // Применяем скидку 10%, если разрешено банком
  let discountedPremium = premium;
  let discountApplied = false;
  if (bankConfig.allow_discount_property) {
    discountedPremium = premium * 0.9; // 10% скидка = умножить на 0.9
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
  const premium = insuranceAmount * (tariff / 100);

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
