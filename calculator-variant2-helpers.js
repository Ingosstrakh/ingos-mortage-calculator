// calculator-variant2-helpers.js - Вспомогательные функции для расчета варианта 2

/**
 * Расчет доп. риска для продуктов IFL
 * @param {string} product - Название продукта (bastion, express, express_go, moyakvartira)
 * @param {Object} data - Данные клиента
 * @param {number} insuranceAmount - Страховая сумма
 * @returns {Object|null} Результат расчета с productName, riskName, premium
 */
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
      // Моя квартира - используем только отделку
      const moyaTariff = window.T_MOYA;
      if (!moyaTariff) return null;

      let finishSum;
      if (insuranceAmount > 5000000) {
        finishSum = 200000;
      } else {
        const calculatedSum = Math.max(200000, insuranceAmount * 0.08);
        if (calculatedSum <= 499999) {
          finishSum = Math.min(499999, calculatedSum);
        } else if (calculatedSum <= 999999) {
          finishSum = Math.min(999999, calculatedSum);
        } else {
          finishSum = Math.min(3000000, calculatedSum);
        }
      }
      
      const finishRate = moyaTariff.finish.find(r => finishSum >= r.min && finishSum <= r.max);
      
      if (!finishRate) {
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

/**
 * Продукт "Личные вещи" - мобильная техника, ручная кладь, верхняя одежда, спортинвентарь
 * @param {number} variant - Вариант пакета (1-5)
 * @param {string} riskCombo - Комбинация рисков ('povrezhd'|'tipovye'|'all')
 * @returns {Object|null} Результат с pack, premium, sum
 */
function calculateLichnieVeshchi(variant, riskCombo) {
  const packs = window.LICHNIE_VESHCHI_PACKS;
  if (!packs) return null;
  const pack = packs.find(p => p.id === variant) || packs[0];
  let premium = 0;
  if (riskCombo === 'povrezhd') premium = pack.povrezhd;
  else if (riskCombo === 'tipovye') premium = pack.tipovye;
  else premium = pack.all;
  return { pack, premium, sum: pack.sum };
}

/**
 * Функция для увеличения сумм "Моя квартира" для достижения разницы около 3000
 */
function increaseMoyaKvartiraSumsForDifference(data, insuranceAmount, currentDifference, targetDifference, baseFinishSum, variant1Total, propertyPremiumV2, lifePremiumV2, titlePremiumV2) {
  const moyaTariff = window.T_MOYA;
  if (!moyaTariff) return null;

  const targetTotalPremium = variant1Total - targetDifference - (propertyPremiumV2 + lifePremiumV2 + titlePremiumV2);
  const neededAdditionalPremium = Math.max(0, targetTotalPremium);

  if (neededAdditionalPremium <= 0) {
    return null;
  }

  const risks = [];
  let totalPremium = 0;

  // ШАГ 1: Добавляем отделку "Моя квартира"
  if (moyaTariff.finish && moyaTariff.finish.length > 0) {
    const avgFinishRate = 0.008;
    const targetFinishSum = Math.round(neededAdditionalPremium / avgFinishRate);
    const actualFinishSum = Math.max(50000, Math.min(500000, targetFinishSum));

    const finishRate = moyaTariff.finish.find(r => actualFinishSum >= r.min && actualFinishSum <= r.max)?.rate || 0.0095;
    const finishPremium = Math.round(actualFinishSum * finishRate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'отделка и инженерное оборудование',
      sum: actualFinishSum,
      premium: finishPremium
    });

    totalPremium = finishPremium;

    if (totalPremium >= neededAdditionalPremium) {
      return { risks: risks, totalPremium: totalPremium };
    }
  }

  // ШАГ 2: Добавляем движимое имущество
  if (totalPremium < neededAdditionalPremium && moyaTariff.movable && moyaTariff.movable.length > 0) {
    const remainingNeeded = neededAdditionalPremium - totalPremium;
    const avgMovableRate = 0.004;
    const targetMovableSum = Math.round(remainingNeeded / avgMovableRate);

    const suitableRange = moyaTariff.movable.find(r => targetMovableSum >= r.min && targetMovableSum <= r.max) ||
                         moyaTariff.movable[moyaTariff.movable.length - 1];

    const actualMovableSum = Math.min(suitableRange.max, Math.max(suitableRange.min, targetMovableSum));
    const movablePremium = Math.round(actualMovableSum * suitableRange.rate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'движимое имущество',
      sum: actualMovableSum,
      premium: movablePremium
    });

    totalPremium += movablePremium;

    if (totalPremium >= neededAdditionalPremium) {
      return { risks: risks, totalPremium: totalPremium };
    }
  }

  // ШАГ 3: Добавляем гражданскую ответственность
  if (totalPremium < neededAdditionalPremium && moyaTariff.go && moyaTariff.go.pack && moyaTariff.go.pack.length > 0) {
    const remainingNeeded = neededAdditionalPremium - totalPremium;
    const avgGoRate = 0.002;
    const targetGoSum = Math.round(remainingNeeded / avgGoRate);

    const suitableRange = moyaTariff.go.pack.find(r => targetGoSum >= r.min && targetGoSum <= r.max) ||
                         moyaTariff.go.pack[moyaTariff.go.pack.length - 1];

    const actualGoSum = Math.min(suitableRange.max, Math.max(suitableRange.min, targetGoSum));
    const goPremium = Math.round(actualGoSum * suitableRange.rate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'гражданская ответственность',
      sum: actualGoSum,
      premium: goPremium
    });

    totalPremium += goPremium;
  }

  return totalPremium > 0 ? {
    risks: risks,
    totalPremium: totalPremium
  } : null;
}

/**
 * Функция для увеличения сумм Бастиона для достижения разницы около 3000
 */
function increaseBastionSumsForDifference(data, insuranceAmount, currentDifference, targetDifference, propertyPremiumV2, lifePremiumV2, titlePremiumV2, variant1Total) {
  const bastionTariff = window.T_BASTION;
  if (!bastionTariff) return null;

  const isFlat = data.objectType === 'flat' || data.objectType === null;
  const objectType = isFlat ? 'flat' : 'house';

  if (!bastionTariff[objectType]) return null;

  const neededPremium = currentDifference - targetDifference;
  const constructMax = bastionTariff[objectType].cons.max;
  const constructMin = bastionTariff[objectType].cons.min;
  const constructRate = bastionTariff[objectType].cons.rate;

  const baseConstructPremium = Math.round(constructMin * constructRate * 100) / 100;
  const additionalNeeded = Math.max(0, neededPremium - baseConstructPremium);

  let constructSum = constructMin;
  if (additionalNeeded > 0) {
    const additionalSum = Math.round(additionalNeeded / constructRate);
    constructSum = Math.min(constructMax, constructMin + additionalSum);
  }

  const constructPremium = Math.round(constructSum * constructRate * 100) / 100;
  const totalV2 = propertyPremiumV2 + lifePremiumV2 + titlePremiumV2 + constructPremium;
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

// Экспортируем функции в глобальную область
window.calculateIFLAdditionalRisk = calculateIFLAdditionalRisk;
window.calculateLichnieVeshchi = calculateLichnieVeshchi;
window.increaseMoyaKvartiraSumsForDifference = increaseMoyaKvartiraSumsForDifference;
window.increaseBastionSumsForDifference = increaseBastionSumsForDifference;

/**
 * Функция для увеличения сумм "Экспресс квартира" для достижения разницы около 3000
 */
function increaseExpressSumsForDifference(currentDifference, targetDifference, propertyPremiumV2, lifePremiumV2, titlePremiumV2, variant1Total) {
  const packs = window.EXPRESS_PACKS;
  if (!packs) return null;

  const neededPremium = currentDifference - targetDifference;
  const targetTotalV2 = variant1Total - targetDifference;
  const targetPremium = targetTotalV2 - propertyPremiumV2 - lifePremiumV2 - titlePremiumV2;

  let bestPack = null;
  let bestDiff = Infinity;

  for (const pack of packs) {
    if (pack.noGo <= targetPremium * 1.5) {
      const diff = Math.abs(pack.noGo - targetPremium);
      if (diff < bestDiff) {
        bestPack = pack;
        bestDiff = diff;
      }
    }
  }

  if (!bestPack) {
    bestPack = packs.reduce((max, p) => p.noGo > max.noGo ? p : max, packs[0]);
  }

  const totalV2 = propertyPremiumV2 + lifePremiumV2 + titlePremiumV2 + bestPack.noGo;
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

/**
 * Получение деталей доп. риска для вывода
 */
function getAdditionalRiskDetails(product, data, insuranceAmount, premium, additionalRisks = [], packDetails = null) {
  if (product !== 'lichnie_veschi' && (!window.T_BASTION || !window.EXPRESS_PACKS || !window.EXPRESS_GO_PACKS || !window.T_MOYA)) {
    return { objects: '', sum: '' };
  }

  switch (product) {
    case 'bastion': {
      if (additionalRisks && additionalRisks.length > 0) {
        return { objects: '', sum: '' };
      }

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

    case 'lichnie_veschi': {
      const pack = packDetails?.pack;
      if (!pack) return { objects: 'мобильная техника, ручная кладь, верхняя одежда, спортинвентарь', sum: '' };
      const formattedSum = pack.sum.toLocaleString('ru-RU');
      return {
        objects: 'мобильная техника, ручная кладь, верхняя одежда, спортинвентарь',
        sum: `на сумму ${formattedSum} ₽ премия`
      };
    }

    case 'moyakvartira': {
      const moyaTariff = window.T_MOYA;
      if (!moyaTariff) return { objects: 'отделка и инженерное оборудование', sum: '' };

      let finishSum;
      if (insuranceAmount > 5000000) {
        finishSum = 200000;
      } else {
        const calculatedSum = Math.max(200000, insuranceAmount * 0.08);
        if (calculatedSum <= 499999) {
          finishSum = Math.min(499999, calculatedSum);
        } else if (calculatedSum <= 999999) {
          finishSum = Math.min(999999, calculatedSum);
        } else {
          finishSum = Math.min(3000000, calculatedSum);
        }
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

// Экспортируем дополнительные функции
window.increaseExpressSumsForDifference = increaseExpressSumsForDifference;
window.getAdditionalRiskDetails = getAdditionalRiskDetails;
