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

  // Расчет варианта 2 (если применимо)
  const variant2Result = calculateVariant2(data, bankConfig, insuranceAmount, totalWithDiscount);
  if (variant2Result) {
    output += `<br><br><b>2 вариант:</b><br>`;
    output += variant2Result.output;
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
    
    // Применяем скидку: стандартная 25% (0.75) или кастомная из конфигурации банка
    let discountMultiplier = 0.75; // стандартная скидка 25%
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

  // Получаем тариф
  const tariff = (window.getPropertyTariff || getPropertyTariff)(data.bank, objectType);
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
  
  for (const product of availableProducts) {
    const additionalRisk = calculateIFLAdditionalRisk(product, data, insuranceAmount);
    if (additionalRisk) {
      const totalV2 = propertyPremiumV2 + lifePremiumV2 + additionalRisk.premium;
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
  
  // Получаем детали доп. риска
  const riskDetails = getAdditionalRiskDetails(bestProduct.product, data, insuranceAmount, bestProduct.premium);
  
  // Форматируем доп. риск с деталями
  const formattedRisk = bestProduct.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (riskDetails.sum) {
    output += `доп риск - ${bestProduct.productName} (${riskDetails.objects}) ${riskDetails.sum} ${formattedRisk}<br>`;
  } else {
    output += `доп риск - ${bestProduct.productName} (${riskDetails.objects}) ${formattedRisk}<br>`;
  }
  
  // Форматируем итого
  const formattedTotal = bestProduct.total.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  output += `Итого тариф взнос ${formattedTotal}`;

  return {
    output: output,
    total: bestProduct.total
  };
}

// Получение деталей доп. риска для вывода
function getAdditionalRiskDetails(product, data, insuranceAmount, premium) {
  if (!window.T_BASTION || !window.EXPRESS_PACKS || !window.EXPRESS_GO_PACKS || !window.T_MOYA) {
    return { objects: '', sum: '' };
  }

  switch (product) {
    case 'bastion': {
      const isFlat = data.objectType === 'flat' || data.objectType === null;
      const objectType = isFlat ? 'flat' : 'house';
      const bastionTariff = window.T_BASTION[objectType];
      
      if (!bastionTariff) return { objects: 'военные риски', sum: '' };

      const finishMin = bastionTariff.finish.min;
      const finishMax = Math.min(bastionTariff.finish.max, insuranceAmount);
      // Используем ту же логику, что и в calculateIFLAdditionalRisk
      let finishSum;
      if (insuranceAmount > 5000000) {
        finishSum = Math.min(finishMax, Math.max(finishMin, insuranceAmount * 0.05));
      } else {
        finishSum = Math.min(finishMax, Math.max(finishMin, insuranceAmount * 0.1));
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

      const minPack = packs.reduce((min, p) => p.noGo < min.noGo ? p : min, packs[0]);
      const finishSum = minPack.finish.toLocaleString('ru-RU');
      const movableSum = minPack.movable ? minPack.movable.toLocaleString('ru-RU') : 'не страхуется';
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
      // Используем разумную сумму для расчета (5-10% от страховой суммы, но в пределах диапазона)
      // Для больших сумм используем меньший процент
      let finishSum;
      if (insuranceAmount > 5000000) {
        finishSum = Math.min(finishMax, Math.max(finishMin, insuranceAmount * 0.05));
      } else {
        finishSum = Math.min(finishMax, Math.max(finishMin, insuranceAmount * 0.1));
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
