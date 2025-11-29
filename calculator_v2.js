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
      calculations.push(lifeResult);
      totalPremium += lifeResult.total;
    }
  }

  // Расчет страхования имущества
  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult) {
      calculations.push(propertyResult);
      totalPremium += propertyResult.total;
    }
  }

  // Расчет титула
  if (data.risks.titul) {
    const titleResult = calculateTitleInsurance(insuranceAmount);
    calculations.push(titleResult);
    totalPremium += titleResult.total;
  }

  // Формируем вывод
  calculations.forEach(calc => {
    output += calc.output;
  });

  output += `<hr><b>ИТОГО страховая премия:</b> ${totalPremium.toLocaleString('ru-RU')} ₽`;

  return output;
}

// Расчет страхования жизни
function calculateLifeInsurance(data, bankConfig, insuranceAmount) {
  if (!data.borrowers || data.borrowers.length === 0) {
    return null;
  }

  let output = `<b>Страхование жизни:</b><br>`;
  let totalPremium = 0;

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
      output += `&nbsp;&nbsp;Заемщик ${index + 1}: недостаточно данных (возраст/пол)<br>`;
      return;
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
      output += `&nbsp;&nbsp;Заемщик ${index + 1}: тариф для возраста ${borrower.age} не найден<br>`;
      return;
    }

    const shareAmount = insuranceAmount * (borrower.share / 100);
    const premium = shareAmount * (tariff / 100);

    // Применяем скидку 25%, если разрешено банком
    let discountedPremium = premium;
    let discountApplied = false;
    if (bankConfig.allow_discount_life) {
      discountedPremium = premium * 0.75; // 25% скидка = умножить на 0.75
      discountApplied = true;
    }

    // Клиентоориентированный вывод без технических деталей
    if (data.borrowers.length === 1) {
      output += `&nbsp;&nbsp;${discountedPremium.toLocaleString('ru-RU')} ₽<br>`;
    } else {
      output += `&nbsp;&nbsp;Заемщик ${index + 1}: ${discountedPremium.toLocaleString('ru-RU')} ₽<br>`;
    }

    totalPremium += discountedPremium;
  });

  return {
    output: output,
    total: totalPremium
  };
}

// Расчет страхования имущества
function calculatePropertyInsurance(data, bankConfig, insuranceAmount) {
  // Определяем тип объекта
  let objectType = 'flat'; // по умолчанию квартира

  if (data.objectType === 'townhouse') {
    objectType = 'townhouse';
  } else if (data.objectType === 'house') {
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

  let output = `<b>Страхование имущества:</b><br>`;
  output += `&nbsp;&nbsp;${discountedPremium.toLocaleString('ru-RU')} ₽<br><br>`;

  return {
    output: output,
    total: discountedPremium
  };
}

// Расчет страхования титула
function calculateTitleInsurance(insuranceAmount) {
  const tariff = 0.2; // 0.2% для всех банков
  const premium = insuranceAmount * (tariff / 100);

  let output = `<b>Страхование титула:</b><br>`;
  output += `&nbsp;&nbsp;${premium.toLocaleString('ru-RU')} ₽<br><br>`;

  return {
    output: output,
    total: premium
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
