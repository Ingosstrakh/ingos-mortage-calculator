// calculator_v2.js (обновлённый)

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

  // Вывод результатов варианта 1 (как раньше, без заголовка)
  if (data.risks.property && propertyResult) {
    if (propertyResult.hasDiscount) {
      output += `Имущество ${propertyResult.totalWithoutDiscount.toLocaleString('ru-RU')} Со скидкой ${propertyResult.total.toLocaleString('ru-RU')}<br>`;
    } else {
      output += `Имущество ${propertyResult.total.toLocaleString('ru-RU')}<br>`;
    }
  }

  if (data.risks.life && lifeResult) {
    // Показываем каждого заемщика отдельно
    lifeResult.borrowers.forEach((borrower, index) => {
      const borrowerLabel = data.borrowers.length > 1 ? `заемщик ${index + 1}` : 'заемщик';
      if (lifeResult.hasDiscount) {
        output += `жизнь ${borrowerLabel} ${borrower.premium.toLocaleString('ru-RU')} Со скидкой ${borrower.premiumWithDiscount.toLocaleString('ru-RU')}<br>`;
      } else {
        output += `жизнь ${borrowerLabel} ${borrower.premium.toLocaleString('ru-RU')}<br>`;
      }
    });
  }

  if (data.risks.titul && titleResult) {
    output += `титул ${titleResult.total.toLocaleString('ru-RU')}<br>`;
  }

  // Итого вариант 1
  if (hasAnyDiscount) {
    output += `ИТОГО тариф/ взнос ${totalWithoutDiscount.toLocaleString('ru-RU')} Со скидкой ${totalWithDiscount.toLocaleString('ru-RU')}`;
  } else {
    output += `ИТОГО тариф/ взнос ${totalWithDiscount.toLocaleString('ru-RU')}`;
  }

  // Расчет варианта 2 (если применимо) — с новыми правилами
  const variant2Result = calculateVariant2(data, bankConfig, insuranceAmount, totalWithDiscount);
  if (variant2Result) {
    output += `<br><br><b>2 вариант:</b><br>`;
    output += variant2Result.output;
  }

  return output;
}

// ------------------
// Ниже — функции расчёта рисков и логики выбора дополнительных пакетов
// ------------------

// Расчет страхования жизни (без изменений)
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

  data.borrowers.forEach((borrower, index) => {
    if (!borrower.age || !borrower.gender) {
      return null;
    }

    let tariff;
    if (data.bank === "РСХБ") {
      const ageIndex = Math.max(0, Math.min(borrower.age - 18, tariffTable[borrower.gender].length - 1));
      tariff = tariffTable[borrower.gender][ageIndex];
    } else {
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

// Расчет страхования имущества (без изменений)
function calculatePropertyInsurance(data, bankConfig, insuranceAmount) {
  let objectType = 'flat';

  if (data.objectType === 'townhouse') {
    objectType = 'townhouse';
  } else if (data.objectType === 'house_brick') {
    objectType = 'house_brick';
  } else if (data.objectType === 'house_wood') {
    objectType = 'house_wood';
  } else if (data.objectType === 'house') {
    if (data.material === 'wood') {
      objectType = 'house_wood';
    } else {
      objectType = 'house_brick';
    }
  }

  const tariff = (window.getPropertyTariff || getPropertyTariff)(data.bank, objectType);
  if (!tariff) {
    return {
      output: `<b>Страхование имущества:</b> тариф для типа объекта не найден<br><br>`,
      total: 0
    };
  }

  const premium = Math.round(insuranceAmount * (tariff / 100) * 100) / 100;

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

// Расчет титула — базовый тариф оставляем 0.2% (как раньше)
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

// --- Обновлённая логика расчёта варианта 2 согласно требованиям пользователя ---
function calculateVariant2(data, bankConfig, insuranceAmount, variant1Total) {
  // Исключение: если только жизнь - не показываем вариант 2
  if (data.risks.life && !data.risks.property) {
    return null;
  }

  // Определяем доступные продукты IFL
  let availableProducts = [];
  const isFlat = data.objectType === 'flat' || data.objectType === null;
  const isHouse = data.objectType === 'house_brick' || data.objectType === 'house_wood' || 
                  (data.objectType === 'house' && (data.material === 'brick' || data.material === 'wood'));

  if (isFlat) {
    availableProducts = ['moyakvartira', 'express', 'express_go', 'bastion'];
  } else if (isHouse) {
    availableProducts = ['bastion'];
  } else {
    return null;
  }

  // Рассчитываем вариант 2 с фиксированной скидкой 30% для life/property и Титула тоже
  let propertyPremiumV2 = 0;
  let lifePremiumV2 = 0;
  let titlePremiumV2 = 0;

  // Имущество
  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult) {
      if (bankConfig.allow_discount_property) {
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = Math.round(basePremium * 0.7 * 100) / 100; // 30% скидка
      } else {
        propertyPremiumV2 = propertyResult.totalWithoutDiscount || propertyResult.total;
      }
    }
  }

  // Жизнь
  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult) {
      if (bankConfig.allow_discount_life) {
        const basePremium = lifeResult.totalWithoutDiscount;
        lifePremiumV2 = Math.round(basePremium * 0.7 * 100) / 100; // 30% скидка
      } else {
        lifePremiumV2 = lifeResult.totalWithoutDiscount || lifeResult.total;
      }
    }
  }

  // Титул — применять скидку 30% в варианте 2, если титул запрошен
  if (data.risks.titul) {
    const titleBase = calculateTitleInsurance(insuranceAmount).totalWithoutDiscount;
    titlePremiumV2 = Math.round(titleBase * 0.7 * 100) / 100; // 30% скидка
  }

  // Рассчитываем доп. риски для каждого доступного продукта
  const productResults = [];
  for (const product of availableProducts) {
    const additionalRisk = calculateIFLAdditionalRisk(product, data, insuranceAmount);
    if (additionalRisk) {
      const totalV2 = (propertyPremiumV2 || 0) + (lifePremiumV2 || 0) + (titlePremiumV2 || 0) + additionalRisk.premium;
      productResults.push({
        product: product,
        productName: additionalRisk.productName,
        riskName: additionalRisk.riskName,
        premium: additionalRisk.premium,
        total: totalV2,
        details: additionalRisk
      });
    }
  }

  if (productResults.length === 0) return null;

  // Теперь — логика выбора продукта по жестким диапазонам разницы:
  // difference = variant1Total - product.total (положительное — вариант1 дороже)

  const chosenCandidates = {
    express: [],
    moya: [],
    platinum: []
  };

  for (const p of productResults) {
    const diff = Math.round((variant1Total - p.total) * 100) / 100;
    if (diff >= 500 && diff <= 1500) {
      if (p.product === 'express' || p.product === 'express_go') chosenCandidates.express.push({p, diff});
    } else if (diff >= 1501 && diff <= 3500) {
      if (p.product === 'moyakvartira') chosenCandidates.moya.push({p, diff});
    } else if (diff > 3500) {
      // Под большие разницы применяем platinum/спецпредложения (берём express, но апгрейдим)
      chosenCandidates.platinum.push({p, diff});
    }
  }

  let selected = null;

  // Приоритет: если есть express-кандидат с требуемой разницей — выбираем самый дешевый среди них
  if (chosenCandidates.express.length > 0) {
    chosenCandidates.express.sort((a, b) => a.p.total - b.p.total);
    selected = chosenCandidates.express[0].p;
  } else if (chosenCandidates.moya.length > 0) {
    // Выбираем 'Моя квартира' ближайший по требованию
    chosenCandidates.moya.sort((a, b) => Math.abs(a.diff - 2500) - Math.abs(b.diff - 2500));
    selected = chosenCandidates.moya[0].p;
  } else if (chosenCandidates.platinum.length > 0) {
    // Берём первый и апгрейдим его до platinum
    chosenCandidates.platinum.sort((a, b) => b.diff - a.diff); // берём самый большой diff
    selected = chosenCandidates.platinum[0].p;
  } else {
    // Если ничего явно не попало в диапазоны — попытаемся выбрать продукт, дающий разницу в пределах 600-1200
    // Ищем продукт, у которого variant1Total - p.total в ближайшем расстоянии к целевому интервалу
    const targetMin = 600;
    const targetMax = 1200;
    let bestScore = Infinity;
    for (const p of productResults) {
      const diff = Math.abs(variant1Total - p.total);
      // Оцениваем штраф насколько далеко от [600,1200]
      let penalty = 0;
      if (variant1Total - p.total < targetMin) penalty = targetMin - (variant1Total - p.total);
      else if (variant1Total - p.total > targetMax) penalty = (variant1Total - p.total) - targetMax;
      if (penalty < bestScore) {
        bestScore = penalty;
        selected = p;
      }
    }
  }

  if (!selected) return null;

  // Теперь добиваем итоговую сумму выбранного продукта дополнительными рисками/апгрейдами
  // чтобы привести разницу в интервал ~600-1200 (если возможно).
  let finalProduct = {...selected};
  let currentTotal = finalProduct.total;
  let currentDiff = Math.round((variant1Total - currentTotal) * 100) / 100;

  const targetMin = 600;
  const targetMax = 1200;
  const targetMiddle = (targetMin + targetMax) / 2; // 900

  // Если текущая разница больше targetMax, нужно увеличить finalProduct.total (добавить премии)
  if (currentDiff > targetMax) {
    let neededIncrease = Math.round((currentDiff - targetMiddle) * 100) / 100; // на сколько увеличить премию

    // Варианты действий в зависимости от продукта
    if (finalProduct.product === 'moyakvartira') {
      const baseFinishSum = determineMoyaBaseFinish(insuranceAmount);
      const addResult = addAdditionalRisksForMoyaKvartira(data, insuranceAmount, neededIncrease, baseFinishSum);
      if (addResult && addResult.risks && addResult.risks.length > 0) {
        // увеличиваем текущTotal
        currentTotal += addResult.totalPremium;
        currentDiff = Math.round((variant1Total - currentTotal) * 100) / 100;
        finalProduct.additionalRisks = addResult.risks;
        finalProduct.total = currentTotal;
      }
    } else if (finalProduct.product === 'express') {
      // апгрейдим пакет Экспресс
      const upgraded = upgradeExpressPackToMatch(neededIncrease);
      if (upgraded) {
        currentTotal = (propertyPremiumV2 || 0) + (lifePremiumV2 || 0) + (titlePremiumV2 || 0) + upgraded.premium;
        currentDiff = Math.round((variant1Total - currentTotal) * 100) / 100;
        finalProduct.premium = upgraded.premium;
        finalProduct.packDetails = upgraded;
        finalProduct.total = currentTotal;
      }
    } else {
      // Для других продуктов — пробуем добавить любые доступные доп.риски
      const addResult = addGenericAdditionalRisks(data, insuranceAmount, neededIncrease);
      if (addResult) {
        currentTotal += addResult.totalPremium;
        currentDiff = Math.round((variant1Total - currentTotal) * 100) / 100;
        finalProduct.additionalRisks = addResult.risks;
        finalProduct.total = currentTotal;
      }
    }
  }

  // Если разница получилась меньше targetMin (т.е. variant2 почти равен или дороже) — можно снизить добавленные доп.риски
  // Но по требованию пользователя, основной сценарий — увеличивать вариант 2, поэтому если variant2 уже близок — оставляем

  // Формируем вывод варианта 2
  let output = '';
  if (data.risks.property) {
    const formattedProperty = (propertyPremiumV2 || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `имущество ${formattedProperty}<br>`;
  }
  if (data.risks.life) {
    const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
    const formattedLife = (lifePremiumV2 || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `жизнь ${borrowerLabel} ${formattedLife}<br>`;
  }
  if (data.risks.titul) {
    const formattedTitle = (titlePremiumV2 || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `титул ${formattedTitle}<br>`;
  }

  // Детали доп. риска
  const riskDetails = getAdditionalRiskDetails(finalProduct.product, data, insuranceAmount, finalProduct.premium, finalProduct.additionalRisks || [], finalProduct.packDetails || null);

  const formattedRisk = (finalProduct.premium || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (riskDetails.sum) {
    output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${riskDetails.sum} ${formattedRisk}`;
  } else {
    output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${formattedRisk}`;
  }

  if (finalProduct.additionalRisks && finalProduct.additionalRisks.length > 0) {
    finalProduct.additionalRisks.forEach(risk => {
      const formattedRiskPremium = risk.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      output += `<br>доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${formattedRiskPremium}`;
    });
  }

  // Итог
  const formattedTotal = (finalProduct.total || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  output += `<br>Итого тариф взнос ${formattedTotal}`;

  return {
    output: output,
    total: finalProduct.total || 0
  };
}

// Вспомогательная: выбирает разумную базовую сумму отделки для Моя квартира
function determineMoyaBaseFinish(insuranceAmount) {
  if (insuranceAmount > 5000000) return 200000;
  return Math.min(500000, Math.max(200000, Math.round(insuranceAmount * 0.08)));
}

// Переработанный addAdditionalRisksForMoyaKvartira: пытается точно добавить премии до neededIncrease
function addAdditionalRisksForMoyaKvartira(data, insuranceAmount, neededIncrease, baseFinishSum = 200000) {
  const moyaTariff = window.T_MOYA;
  if (!moyaTariff) return null;

  const risks = [];
  let totalPremium = 0;
  let remainingIncrease = Math.max(0, neededIncrease);

  // Сначала пробуем добавить движимое имущество, затем ГО
  // Перебираем разумные суммы и выбираем те, чей премиум максимально приближает нас к neededIncrease,
  // при этом стараясь не удаляться от baseFinishSum слишком сильно.

  // Возможные множители относительно baseFinishSum
  const multipliers = [1, 1.25, 1.5, 1.75, 2, 2.5];
  for (const m of multipliers) {
    if (remainingIncrease <= 0) break;
    const testSum = Math.round(baseFinishSum * m);
    if (testSum < 50000) continue;
    const movableRate = moyaTariff.movable ? moyaTariff.movable.find(r => testSum >= r.min && testSum <= r.max) : null;
    if (!movableRate) continue;
    const movablePremium = Math.round(testSum * movableRate.rate * 100) / 100;
    // Берём только те, что добавляют, но не значительно превосходят remainingIncrease
    if (movablePremium <= remainingIncrease + 1500) {
      risks.push({ name: 'Моя квартира', objects: 'движимое имущество', sum: testSum, premium: movablePremium });
      totalPremium += movablePremium;
      remainingIncrease -= movablePremium;
    }
  }

  // Если ещё нужно — пробуем ГО
  if (remainingIncrease > 0) {
    const goMin = 100000;
    const goMax = Math.min(500000, baseFinishSum * 1.5);
    const step = 50000;
    let candidateGO = null;
    let bestDiff = Infinity;
    for (let s = goMin; s <= goMax; s += step) {
      const goRate = moyaTariff.go && moyaTariff.go.pack ? moyaTariff.go.pack.find(r => s >= r.min && s <= r.max) : null;
      if (!goRate) continue;
      const goPremium = Math.round(s * goRate.rate * 100) / 100;
      const diff = Math.abs(goPremium - remainingIncrease);
      if (goPremium <= remainingIncrease + 1200 && diff < bestDiff) {
        candidateGO = { sum: s, premium: goPremium };
        bestDiff = diff;
      }
    }
    if (candidateGO) {
      risks.push({ name: 'Моя квартира', objects: 'гражданская ответственность', sum: candidateGO.sum, premium: candidateGO.premium });
      totalPremium += candidateGO.premium;
      remainingIncrease -= candidateGO.premium;
    }
  }

  if (risks.length === 0) return null;
  return { risks: risks, totalPremium: Math.round(totalPremium * 100) / 100 };
}

// Апгрейд пакета Экспресс — новая версия: ищем пакет, который прибавит нужную премию, либо берем минимальный доступный
function upgradeExpressPackToMatch(neededIncrease) {
  const packs = window.EXPRESS_PACKS;
  if (!packs || packs.length === 0) return null;

  // Сортируем по цене
  const sorted = [...packs].sort((a,b)=>a.noGo - b.noGo);
  const min = sorted[0];
  const target = min.noGo + neededIncrease;

  // Ищем пакет с ценой ближайшей к target, не меньше min
  let best = min;
  let bestDiff = Math.abs(min.noGo - target);
  for (const p of sorted) {
    const d = Math.abs(p.noGo - target);
    if (d < bestDiff) { best = p; bestDiff = d; }
  }

  // Если разница мала — вернём пакет
  return { premium: best.noGo, pack: best };
}

// Generic addition — пробуем добавить любые мелкие риски (fallback)
function addGenericAdditionalRisks(data, insuranceAmount, neededIncrease) {
  // Ищем возможный T_MOYA или EXPRESS_PACKS
  const risks = [];
  let total = 0;
  // Попробуем взять маленький пакет express_go
  if (window.EXPRESS_GO_PACKS && window.EXPRESS_GO_PACKS.length>0) {
    const minPack = window.EXPRESS_GO_PACKS.reduce((min,p)=>p.price<min.price?p:min, window.EXPRESS_GO_PACKS[0]);
    if (minPack.price <= neededIncrease + 1000) {
      risks.push({ name: 'Экспресс ГО', objects: 'гражданская ответственность', sum: minPack.sum, premium: minPack.price });
      total += minPack.price;
    }
  }
  if (total === 0) return null;
  return { risks: risks, totalPremium: Math.round(total*100)/100 };
}

// calculateIFLAdditionalRisk — оставляем большинство логики, но даём возможность вернуть разные пакеты
function calculateIFLAdditionalRisk(product, data, insuranceAmount) {
  if (!window.T_BASTION || !window.EXPRESS_PACKS || !window.EXPRESS_GO_PACKS || !window.T_MOYA) {
    return null;
  }

  switch (product) {
    case 'bastion': {
      const isFlat = data.objectType === 'flat' || data.objectType === null;
      const objectType = isFlat ? 'flat' : 'house';
      const bastionTariff = window.T_BASTION[objectType];
      if (!bastionTariff) return null;
      const finishMin = bastionTariff.finish.min;
      const finishMax = Math.min(bastionTariff.finish.max, insuranceAmount);
      let finishSum;
      if (insuranceAmount < finishMin) finishSum = Math.min(finishMin, finishMax);
      else if (insuranceAmount > 5000000) {
        const maxReasonable = finishMin * 3;
        finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.05)));
      } else {
        const maxReasonable = finishMin * 3;
        finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.1)));
      }
      if (finishSum < finishMin || finishSum > finishMax) return null;
      const premium = Math.round(finishSum * bastionTariff.finish.rate * 100) / 100;
      return { productName: 'Бастион', riskName: 'военные риски', premium: premium };
    }

    case 'express': {
      const packs = window.EXPRESS_PACKS;
      if (!packs || packs.length === 0) return null;
      // выбираем минимальный пакет по noGo
      const minPack = packs.reduce((min, p) => p.noGo < min.noGo ? p : min, packs[0]);
      return { productName: 'Экспресс квартира', riskName: 'отделка и движимое имущество', premium: minPack.noGo };
    }

    case 'express_go': {
      const packs = window.EXPRESS_GO_PACKS;
      if (!packs || packs.length === 0) return null;
      const minPack = packs.reduce((min, p) => p.price < min.price ? p : min, packs[0]);
      return { productName: 'Экспресс ГО', riskName: 'гражданская ответственность', premium: minPack.price };
    }

    case 'moyakvartira': {
      const moyaTariff = window.T_MOYA;
      if (!moyaTariff) return null;
      let finishSum = determineMoyaBaseFinish(insuranceAmount);
      const finishRate = moyaTariff.finish.find(r => finishSum >= r.min && finishSum <= r.max);
      if (!finishRate) {
        const minRate = moyaTariff.finish[0];
        finishSum = 200000;
        const premium = Math.round(finishSum * minRate.rate * 100) / 100;
        return { productName: 'Моя квартира', riskName: 'отделка и инженерное оборудование', premium: premium };
      }
      const premium = Math.round(finishSum * finishRate.rate * 100) / 100;
      return { productName: 'Моя квартира', riskName: 'отделка и инженерное оборудование', premium: premium };
    }

    default:
      return null;
  }
}

// getAdditionalRiskDetails — оставляем, но можно показать специфичные тексты
function getAdditionalRiskDetails(product, data, insuranceAmount, premium, additionalRisks = [], packDetails = null) {
  if (!window.T_BASTION || !window.EXPRESS_PACKS || !window.EXPRESS_GO_PACKS || !window.T_MOYA) {
    return { objects: '', sum: '' };
  }

  switch (product) {
    case 'bastion': {
      const isFlat = data.objectType === 'flat' || data.objectType === null;
      const objectType = isFlat ? 'flat' : 'house';
      const bastionTariff = window.T_BASTION[objectType];
      if (!bastionTariff) return { objects: 'военные риски', sum: '' };
      let finishSum;
      if (insuranceAmount > 5000000) finishSum = 200000;
      else finishSum = Math.min(bastionTariff.finish.max, Math.max(bastionTariff.finish.min, insuranceAmount * 0.1));
      const objectName = isFlat ? 'квартира' : 'дом';
      const formattedSum = Math.round(finishSum).toLocaleString('ru-RU');
      return { objects: `отделка и инженерное оборудование ${objectName}`, sum: `на сумму ${formattedSum} ₽ премия` };
    }
    case 'express': {
      const packs = window.EXPRESS_PACKS;
      if (!packs || packs.length === 0) return { objects: 'отделка и движимое имущество', sum: '' };
      const selectedPack = packDetails ? packDetails.pack : packs.reduce((min, p) => p.noGo < min.noGo ? p : min, packs[0]);
      const finishSum = selectedPack.finish.toLocaleString('ru-RU');
      const movableSum = selectedPack.movable ? selectedPack.movable.toLocaleString('ru-RU') : 'не страхуется';
      return { objects: 'отделка и инженерное оборудование, движимое имущество', sum: `отделка ${finishSum} ₽, движимое ${movableSum} ₽ премия` };
    }
    case 'express_go': {
      const packs = window.EXPRESS_GO_PACKS;
      if (!packs || packs.length === 0) return { objects: 'гражданская ответственность', sum: '' };
      const minPack = packs.reduce((min, p) => p.price < min.price ? p : min, packs[0]);
      const sum = minPack.sum.toLocaleString('ru-RU');
      return { objects: 'гражданская ответственность', sum: `на сумму ${sum} ₽ премия` };
    }
    case 'moyakvartira': {
      const moyaTariff = window.T_MOYA;
      if (!moyaTariff) return { objects: 'отделка и инженерное оборудование', sum: '' };
      let finishSum;
      if (insuranceAmount > 5000000) finishSum = 200000;
      else finishSum = Math.min(500000, Math.max(200000, insuranceAmount * 0.08));
      const formattedSum = Math.round(finishSum).toLocaleString('ru-RU');
      return { objects: 'отделка и инженерное оборудование', sum: `на сумму ${formattedSum} ₽ премия` };
    }
    default:
      return { objects: '', sum: '' };
  }
}

// Конец файла
