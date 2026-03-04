// calculator-insurance-life.js
// Модуль расчета страхования жизни

/**
 * Расчет страхования жизни
 * @param {Object} data - Данные запроса
 * @param {Object} bankConfig - Конфигурация банка
 * @param {number} insuranceAmount - Страховая сумма
 * @returns {Object|null} Результат расчета или null
 */
function calculateLifeInsurance(data, bankConfig, insuranceAmount) {
  if (!data.borrowers || data.borrowers.length === 0) {
    return null;
  }

  // Проверяем лимиты по возрасту для первого заемщика
  let ageLimitMessage = '';
  let ageLimitRequiresMedicalExam = false;
  let effectiveInsuranceAmount = insuranceAmount;
  
  if (data.borrowers && data.borrowers.length > 0) {
    const firstBorrower = data.borrowers[0];
    if (firstBorrower.age) {
      const ageLimit = (window.getAgeLimitForLifeInsurance || getAgeLimitForLifeInsurance)(firstBorrower.age);
      
      if (ageLimit.requiresMedicalExam) {
        // Возраст 65+ - требуется медобследование
        ageLimitRequiresMedicalExam = true;
        ageLimitMessage = ageLimit.message;
      } else if (ageLimit.maxAmount && insuranceAmount > ageLimit.maxAmount) {
        // Страховая сумма превышает лимит для данного возраста
        effectiveInsuranceAmount = ageLimit.maxAmount;
        // Показываем сообщение только если оно не пустое (для всех возрастов, включая до 44 лет)
        if (ageLimit.message) {
          ageLimitMessage = ageLimit.message;
        }
      }
    }
  }

  // Проверяем медицинский андеррайтинг для первого заемщика (рост/вес)
  let medicalUnderwritingFactor = 1.00;
  let requiresMedicalExam = false;
  let medicalUnderwritingMessage = '';
  
  if (data.height && data.weight && data.borrowers && data.borrowers.length > 0) {
    const firstBorrower = data.borrowers[0];
    if (firstBorrower.age) {
      medicalUnderwritingFactor = (window.getUnderwritingFactor || getUnderwritingFactor)(firstBorrower.age, data.height, data.weight);
      
      if (medicalUnderwritingFactor === "МЕДО") {
        requiresMedicalExam = true;
        medicalUnderwritingMessage = '⚠️ Необходимо пройти медобследование';
      } else if (medicalUnderwritingFactor === 1.25) {
        medicalUnderwritingMessage = '⚠️ Применена надбавка +25% к тарифу жизни (мед. андеррайтинг)';
      }
    }
  }

  // Объединяем требования медобследования (от возраста или от роста/веса)
  const finalRequiresMedicalExam = requiresMedicalExam || ageLimitRequiresMedicalExam;
  
  // Объединяем сообщения
  let combinedMessage = '';
  if (ageLimitMessage) {
    combinedMessage = ageLimitMessage;
  }
  if (medicalUnderwritingMessage) {
    if (combinedMessage) {
      combinedMessage += '; ' + medicalUnderwritingMessage;
    } else {
      combinedMessage = medicalUnderwritingMessage;
    }
  }

  // Если возраст 65+ и требуется медобследование, возвращаем только сообщение без расчета премии
  if (ageLimitRequiresMedicalExam) {
    return {
      total: 0,
      totalWithoutDiscount: 0,
      hasDiscount: false,
      borrowers: [],
      medicalUnderwritingFactor: medicalUnderwritingFactor,
      requiresMedicalExam: true,
      medicalUnderwritingMessage: combinedMessage,
      effectiveInsuranceAmount: 0,
      originalInsuranceAmount: insuranceAmount
    };
  }

  // Запрещаем скидки по жизни для ВСЕХ банков, если хотя бы одному заемщику >= 55 лет
  let hasAge55PlusRestriction = false;
  if (data.borrowers && data.borrowers.length > 0) {
    hasAge55PlusRestriction = data.borrowers.some(borrower => borrower.age >= 55);
  }

  // Если требуется медобследование или есть надбавка +25%, или возраст >= 55, отключаем скидки
  const hasDiscount = bankConfig.allow_discount_life !== false && 
                      !finalRequiresMedicalExam && 
                      medicalUnderwritingFactor !== 1.25 &&
                      !hasAge55PlusRestriction;

  let totalPremium = 0;
  let totalPremiumWithDiscount = 0;
  const borrowerPremiums = [];

  // Определяем тарифы в зависимости от банка
  let tariffTable;
  
  // Если для банка уже определен специальный тариф (например, для Альфа-Банка), используем его
  if (data.lifeTariff) {
    tariffTable = data.lifeTariff;
  } else if (bankConfig && bankConfig.bankName === "Дом.РФ") {
    tariffTable = window.LIFE_TARIFF_DOMRF;
  } else if (bankConfig && bankConfig.bankName === "РСХБ") {
    tariffTable = window.LIFE_TARIFF_RSHB_LOSS;
  } else if (bankConfig && bankConfig.bankName === "Банк СПБ") {
    tariffTable = window.LIFE_TARIFF_SPB;
  } else if (bankConfig && bankConfig.bankName === "МКБ") {
    tariffTable = window.LIFE_TARIFF_MKB;
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
        tariffTable = window.LIFE_TARIFF_GPB_OLD;
      } else {
        tariffTable = window.LIFE_TARIFF_GPB_NEW;
      }
    } else {
      // Если дата не указана, используем старые тарифы по умолчанию
      tariffTable = window.LIFE_TARIFF_GPB_OLD;
    }
  } else if (bankConfig && bankConfig.bankName === "ВТБ") {
    // Для ВТБ tariffTable будет выбираться внутри цикла по borrower
    tariffTable = window.LIFE_TARIFF_BASE; // значение по умолчанию
  } else {
    tariffTable = window.LIFE_TARIFF_BASE;
  }

  data.borrowers.forEach((borrower, index) => {
    if (!borrower.age || !borrower.gender) {
      return null;
    }

    // Для ВТБ выбираем тарифы в зависимости от возраста и даты КД
    if (bankConfig && bankConfig.bankName === "ВТБ" && data.contractDate) {
      const cutoffDate = new Date('2025-02-01T00:00:00');
      const parts = data.contractDate.split('.');
      let contractDateObj;
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`;
        contractDateObj = new Date(isoDate);
      } else {
        contractDateObj = new Date(data.contractDate);
      }

      // Сравниваем даты без учета времени
      const contractDateOnly = new Date(contractDateObj.getFullYear(), contractDateObj.getMonth(), contractDateObj.getDate());
      const cutoffDateOnly = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), cutoffDate.getDate());

      if (contractDateOnly >= cutoffDateOnly) {
        // Новые тарифы ВТБ (после 01.02.2025 включительно)
        if (borrower.age <= 50) {
          tariffTable = window.LIFE_TARIFF_VTB_NEW;
        } else {
          // Для 51+ используем базовые тарифы
          tariffTable = window.LIFE_TARIFF_BASE;
        }
      }
      // Для старых дат (до 01.02.2025) используем базовые тарифы (уже установлено по умолчанию)
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

    // Используем эффективную страховую сумму (с учетом лимитов по возрасту)
    const shareAmount = effectiveInsuranceAmount * (borrower.share / 100);
    let premium = Math.round(shareAmount * (tariff / 100) * 100) / 100;
    
    // Применяем коэффициент медицинского андеррайтинга (только для первого заемщика)
    if (index === 0 && medicalUnderwritingFactor === 1.25) {
      premium = Math.round(premium * 1.25 * 100) / 100;
    }
    
    // Применяем скидку: стандартная 30% (0.7) или кастомная из конфигурации банка
    // Скидки отключены если требуется медобследование или есть надбавка +25%
    let discountMultiplier = 0.7; // стандартная скидка 30%
    if (hasDiscount && bankConfig.discount_life_percent) {
      discountMultiplier = 1 - (bankConfig.discount_life_percent / 100);
    }
    let premiumWithDiscount = hasDiscount ? Math.round(premium * discountMultiplier * 100) / 100 : premium;

    // Минимальная сумма премии для жизни: 600 рублей на каждого заемщика
    const MIN_PREMIUM_LIFE = 600;
    premium = Math.max(premium, MIN_PREMIUM_LIFE);
    premiumWithDiscount = Math.max(premiumWithDiscount, MIN_PREMIUM_LIFE);

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

  // Итоговые суммы уже с учетом минимума для каждого заемщика
  const finalTotalPremium = totalPremium;
  const finalTotalPremiumWithDiscount = hasDiscount ? totalPremiumWithDiscount : finalTotalPremium;

  return {
    total: hasDiscount ? finalTotalPremiumWithDiscount : finalTotalPremium,
    totalWithoutDiscount: finalTotalPremium,
    hasDiscount: hasDiscount,
    borrowers: borrowerPremiums,
    medicalUnderwritingFactor: medicalUnderwritingFactor,
    requiresMedicalExam: finalRequiresMedicalExam,
    medicalUnderwritingMessage: combinedMessage,
    effectiveInsuranceAmount: effectiveInsuranceAmount,
    originalInsuranceAmount: insuranceAmount
  };
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateLifeInsurance };
} else {
  window.calculateLifeInsurance = calculateLifeInsurance;
}
