// calculator-variant2-constructor.js - Вспомогательные функции для построения варианта 2

/**
 * Упрощенный расчет варианта 2 (без доп. рисков, только скидки 30%)
 */
function calculateSimplifiedVariant2(data, bankConfig, insuranceAmount) {
  console.log('Используем упрощенный вариант - данные не загружены');

  let propertyPremiumV2 = 0;
  let lifePremiumV2 = 0;

  const MIN_PREMIUM_PROPERTY = 600;
  const MIN_PREMIUM_LIFE = 600;
  
  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult && bankConfig.allow_discount_property) {
      const basePremium = propertyResult.totalWithoutDiscount;
      propertyPremiumV2 = Math.round(basePremium * 0.7 * 100) / 100;
      propertyPremiumV2 = Math.max(propertyPremiumV2, MIN_PREMIUM_PROPERTY);
    } else if (propertyResult) {
      propertyPremiumV2 = propertyResult.total || propertyResult.totalWithoutDiscount;
    }
  }

  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    
    let hasAgeRestrictionForSberbank = false;
    if (bankConfig && bankConfig.bankName === "Сбербанк" && data.borrowers && data.borrowers.length > 0) {
      hasAgeRestrictionForSberbank = data.borrowers.some(borrower => borrower.age >= 55);
    }
    
    if (lifeResult && bankConfig.allow_discount_life && !lifeResult.requiresMedicalExam && 
        lifeResult.medicalUnderwritingFactor !== 1.25 && !hasAgeRestrictionForSberbank) {
      const numBorrowers = data.borrowers ? data.borrowers.length : 1;
      let totalWithDiscount = 0;
      
      if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
        lifeResult.borrowers.forEach(borrower => {
          const borrowerPremiumWithDiscount = borrower.premiumWithDiscount || borrower.premium;
          totalWithDiscount += borrowerPremiumWithDiscount;
        });
      } else {
        const basePremium = lifeResult.totalWithoutDiscount;
        totalWithDiscount = Math.round(basePremium * 0.7 * 100) / 100;
      }
      
      lifePremiumV2 = Math.max(totalWithDiscount, MIN_PREMIUM_LIFE * numBorrowers);
    } else if (lifeResult) {
      lifePremiumV2 = lifeResult.total || lifeResult.totalWithoutDiscount;
    }
  }

  const totalV2 = propertyPremiumV2 + lifePremiumV2;

  let output = '';
  if (data.risks.property && propertyPremiumV2 > 0) {
    output += `имущество ${propertyPremiumV2.toLocaleString('ru-RU', {useGrouping: false})}<br>`;
  }
  if (data.risks.life && lifePremiumV2 > 0) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult && lifeResult.borrowers && lifeResult.borrowers.length > 0) {
      const isMultipleBorrowers = data.borrowers && data.borrowers.length > 1;
      const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
      lifeResult.borrowers.forEach((borrower, index) => {
        const borrowerLabel = isMultipleBorrowers ? `заемщик ${index + 1}` : 'заемщик';
        const borrowerPremium = borrower.premiumWithDiscount || borrower.premium;
        output += `жизнь ${borrowerLabel} ${borrowerPremium.toLocaleString('ru-RU', {useGrouping: false})}`;
        if (isSovcombank) {
          output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
        }
        output += `<br>`;
      });
    } else {
      const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
      output += `жизнь ${borrowerLabel} ${lifePremiumV2.toLocaleString('ru-RU', {useGrouping: false})}<br>`;
    }
  }

  output += `<br>Итого тариф взнос ${totalV2.toLocaleString('ru-RU', {useGrouping: false})}`;

  return {
    output: output,
    total: totalV2
  };
}

/**
 * Определяем доступные продукты IFL
 */
function getAvailableProducts(data, bankConfig, isMobile) {
  const isLifeOnly = data.risks.life && !data.risks.property && !data.risks.titul;
  const isFlat = data.objectType === 'flat' || data.objectType === null;
  const isHouse = data.objectType === 'house_brick' || data.objectType === 'house_wood' || 
                  (data.objectType === 'house' && (data.material === 'brick' || data.material === 'wood'));

  let availableProducts = [];

  if (isLifeOnly && bankConfig.allow_discount_life) {
    availableProducts = ['lichnie_veschi'];
  } else if (isFlat) {
    availableProducts = ['moyakvartira', 'express', 'express_go', 'bastion'];
  } else if (isHouse) {
    availableProducts = ['bastion'];
  } else {
    return null;
  }

  if (isMobile && availableProducts.length > 2) {
    availableProducts = availableProducts.slice(0, 2);
  }

  return availableProducts;
}

/**
 * Рассчитываем базовые премии варианта 2 с скидками 30%
 */
function calculateBasePremiums(data, bankConfig, insuranceAmount) {
  const MIN_PREMIUM_PROPERTY_V2 = 600;
  const MIN_PREMIUM_LIFE_V2 = 600;
  
  let propertyPremiumV2 = 0;
  let lifePremiumV2 = 0;
  let titlePremiumV2 = 0;

  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult) {
      if (bankConfig.allow_discount_property) {
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = Math.round(basePremium * 0.7 * 100) / 100;
        propertyPremiumV2 = Math.max(propertyPremiumV2, MIN_PREMIUM_PROPERTY_V2);
      } else {
        propertyPremiumV2 = propertyResult.totalWithoutDiscount || propertyResult.total;
      }
    }
  }

  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult) {
      let hasAgeRestrictionForSberbank = false;
      if (bankConfig && bankConfig.bankName === "Сбербанк" && data.borrowers && data.borrowers.length > 0) {
        hasAgeRestrictionForSberbank = data.borrowers.some(borrower => borrower.age >= 55);
      }
      
      if (bankConfig.allow_discount_life && !lifeResult.requiresMedicalExam && 
          lifeResult.medicalUnderwritingFactor !== 1.25 && !hasAgeRestrictionForSberbank) {
        const numBorrowers = data.borrowers ? data.borrowers.length : 1;
        let totalWithDiscount = 0;
        
        if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
          lifeResult.borrowers.forEach(borrower => {
            const borrowerPremiumWithDiscount = borrower.premiumWithDiscount || borrower.premium;
            totalWithDiscount += borrowerPremiumWithDiscount;
          });
        } else {
          const basePremium = lifeResult.totalWithoutDiscount;
          totalWithDiscount = Math.round(basePremium * 0.7 * 100) / 100;
        }
        
        lifePremiumV2 = Math.max(totalWithDiscount, MIN_PREMIUM_LIFE_V2 * numBorrowers);
      } else {
        lifePremiumV2 = lifeResult.total || lifeResult.totalWithoutDiscount;
      }
    }
  }

  if (data.risks.titul) {
    const withLifeInsurance = data.risks.life || false;
    const titleResult = calculateTitleInsurance(data, bankConfig, insuranceAmount, withLifeInsurance, data.contractDate);
    titlePremiumV2 = titleResult.total;
  }

  return {
    propertyPremiumV2,
    lifePremiumV2,
    titlePremiumV2
  };
}

/**
 * Рассчитываем доп. риски для каждого доступного продукта
 */
function calculateProductResults(availableProducts, data, insuranceAmount, basePremiums) {
  const productResults = [];
  const { propertyPremiumV2, lifePremiumV2 } = basePremiums;

  for (const product of availableProducts) {
    if (product === 'lichnie_veschi') {
      const packs = window.LICHNIE_VESHCHI_PACKS;
      if (!packs) continue;
      const riskCombos = [
        { key: 'povrezhd', label: 'ПДТЛ + Повреждения' },
        { key: 'tipovye', label: 'ПДТЛ + Типовые' },
        { key: 'all', label: 'все риски' }
      ];
      for (const pack of packs) {
        for (const combo of riskCombos) {
          const premium = pack[combo.key];
          const totalV2 = propertyPremiumV2 + lifePremiumV2 + premium;
          productResults.push({
            product: 'lichnie_veschi',
            productName: 'Личные вещи',
            riskName: combo.label,
            premium: premium,
            total: totalV2,
            packDetails: { pack, riskCombo: combo.key }
          });
        }
      }
    } else {
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
  }

  return productResults;
}

/**
 * Выбираем лучший продукт
 */
function selectBestProduct(productResults, variant1Total, titlePremiumV2) {
  const priorityProducts = productResults.filter(p => 
    p.product === 'moyakvartira' || p.product === 'express' || p.product === 'lichnie_veschi');
  const otherProducts = productResults.filter(p => 
    p.product !== 'moyakvartira' && p.product !== 'express' && p.product !== 'lichnie_veschi');

  priorityProducts.sort((a, b) => a.total - b.total);
  otherProducts.sort((a, b) => a.total - b.total);

  let bestProduct = null;
  let bestDifference = null;
  const targetDifference = 2200;

  for (const product of priorityProducts) {
    const productTotalWithTitle = product.total + titlePremiumV2;
    const difference = variant1Total - productTotalWithTitle;
    if (difference >= 200) {
      if (difference <= 2200) {
        if (!bestProduct || productTotalWithTitle > (bestProduct.total + titlePremiumV2)) {
          bestProduct = product;
          bestDifference = difference;
        }
      } else {
        if (!bestProduct || Math.abs(difference - targetDifference) < Math.abs(bestDifference - targetDifference)) {
          bestProduct = product;
          bestDifference = difference;
        }
      }
    }
  }

  if (!bestProduct) {
    for (const product of otherProducts) {
      const productTotalWithTitle = product.total + titlePremiumV2;
      const difference = variant1Total - productTotalWithTitle;
      if (difference >= 200) {
        if (difference <= 2200) {
          if (!bestProduct || productTotalWithTitle < (bestProduct.total + titlePremiumV2)) {
            bestProduct = product;
            bestDifference = difference;
          }
        } else {
          if (!bestProduct || Math.abs(difference - targetDifference) < Math.abs(bestDifference - targetDifference)) {
            bestProduct = product;
            bestDifference = difference;
          }
        }
      }
    }
  }

  if (!bestProduct || bestDifference < 200) {
    return null;
  }

  return {
    bestProduct,
    bestDifference
  };
}

/**
 * Оптимизируем продукт (увеличиваем суммы если нужно)
 */
function optimizeProduct(bestProductResult, data, insuranceAmount, variant1Total, basePremiums) {
  const { bestProduct, bestDifference } = bestProductResult;
  const { propertyPremiumV2, lifePremiumV2, titlePremiumV2 } = basePremiums;

  let finalProduct = bestProduct;
  let additionalRisks = [];
  let currentTotal = bestProduct.total + titlePremiumV2;
  let currentDifference = variant1Total - currentTotal;

  const targetDifferenceLarge = 3000;

  if (currentDifference > targetDifferenceLarge) {
    if (bestProduct.product === 'moyakvartira') {
      const moyaTariff = window.T_MOYA;
      let baseFinishSum = 200000;
      if (moyaTariff) {
        if (insuranceAmount > 5000000) {
          baseFinishSum = 200000;
        } else {
          baseFinishSum = Math.min(500000, Math.max(200000, insuranceAmount * 0.08));
        }
      }

      const additionalRisksResult = increaseMoyaKvartiraSumsForDifference(
        data, insuranceAmount, currentDifference, targetDifferenceLarge, 
        baseFinishSum, variant1Total, propertyPremiumV2, lifePremiumV2, titlePremiumV2
      );
      
      if (additionalRisksResult && additionalRisksResult.risks.length > 0) {
        additionalRisks = additionalRisksResult.risks;
        currentTotal = propertyPremiumV2 + lifePremiumV2 + titlePremiumV2 + additionalRisksResult.totalPremium;
        currentDifference = variant1Total - currentTotal;

        finalProduct = {
          product: 'moyakvartira',
          productName: 'Моя квартира',
          riskName: 'отделка и инженерное оборудование',
          premium: additionalRisksResult.totalPremium,
          total: currentTotal,
          increasedRisks: additionalRisks,
          useIncreasedRisksOnly: true
        };
      }
    } else if (bestProduct.product === 'bastion') {
      const bastionResult = increaseBastionSumsForDifference(
        data, insuranceAmount, currentDifference, targetDifferenceLarge, 
        propertyPremiumV2, lifePremiumV2, titlePremiumV2, variant1Total
      );
      
      if (bastionResult) {
        finalProduct = bastionResult.finalProduct;
        additionalRisks = bastionResult.additionalRisks;
        currentTotal = bastionResult.currentTotal;
        currentDifference = bastionResult.currentDifference;

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

          additionalRisks.push({
            name: 'Бастион',
            objects: `отделка и инженерное оборудование ${isFlat ? 'квартира' : 'дом'}`,
            sum: finishSum,
            premium: finishPremium
          });

          currentTotal += finishPremium;
          finalProduct.total = currentTotal;
        }
      }
    } else if (bestProduct.product === 'express') {
      const expressResult = increaseExpressSumsForDifference(
        currentDifference, targetDifferenceLarge, propertyPremiumV2, lifePremiumV2, titlePremiumV2, variant1Total
      );
      if (expressResult) {
        finalProduct = expressResult.finalProduct;
        currentTotal = expressResult.currentTotal;
        currentDifference = expressResult.currentDifference;
      }
    }
  }

  return {
    finalProduct,
    additionalRisks,
    currentTotal,
    currentDifference
  };
}

/**
 * Формируем вывод варианта 2
 */
function formatVariant2Output(data, bankConfig, insuranceAmount, basePremiums, optimizedResult) {
  const { propertyPremiumV2, lifePremiumV2, titlePremiumV2 } = basePremiums;
  const { finalProduct, additionalRisks, currentTotal } = optimizedResult;

  let output = '';

  if (data.risks.property) {
    output += `имущество ${propertyPremiumV2.toLocaleString('ru-RU', {useGrouping: false})}<br>`;
  }

  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult && lifeResult.requiresMedicalExam && lifeResult.total === 0) {
      output += `<span style="color: #dc3545; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span><br>`;
    } else if (lifeResult && lifeResult.borrowers && lifeResult.borrowers.length > 0) {
      const isMultipleBorrowers = data.borrowers && data.borrowers.length > 1;
      const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
      
      lifeResult.borrowers.forEach((borrower, index) => {
        const borrowerLabel = isMultipleBorrowers ? `заемщик ${index + 1}` : 'заемщик';
        const borrowerPremium = borrower.premiumWithDiscount || borrower.premium;
        output += `жизнь ${borrowerLabel} ${borrowerPremium.toLocaleString('ru-RU', {useGrouping: false})}`;
        
        if (isSovcombank) {
          output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
        }
        
        if (index === 0 && lifeResult.medicalUnderwritingMessage) {
          if (lifeResult.requiresMedicalExam) {
            output += ` <span style="color: #dc3545; font-weight: bold;">⚠️ ${lifeResult.medicalUnderwritingMessage}</span>`;
          } else if (lifeResult.medicalUnderwritingFactor === 1.25) {
            output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
          } else {
            output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
          }
        }
        output += `<br>`;
      });
    } else {
      const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
      const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
      output += `жизнь ${borrowerLabel} ${lifePremiumV2.toLocaleString('ru-RU', {useGrouping: false})}`;
      
      if (isSovcombank) {
        output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
      }
      
      if (lifeResult && lifeResult.medicalUnderwritingMessage) {
        if (lifeResult.requiresMedicalExam) {
          output += ` <span style="color: #dc3545; font-weight: bold;">⚠️ ${lifeResult.medicalUnderwritingMessage}</span>`;
        } else if (lifeResult.medicalUnderwritingFactor === 1.25) {
          output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
        } else {
          output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
        }
      }
      output += `<br>`;
    }
  }

  const formatKv = (premium, percent = 35) => {
    const agentAmount = Math.round(premium * (percent / 100) * 100) / 100;
    return ` кв - ${percent}% = агент получит по ИФЛ (${agentAmount.toLocaleString('ru-RU', {useGrouping: false})})`;
  };
  const formatKv35 = (premium) => formatKv(premium, 35);
  const formatKv50 = (premium) => formatKv(premium, 50);

  if (finalProduct.useIncreasedRisksOnly && additionalRisks.length > 0) {
    additionalRisks.forEach(risk => {
      output += `доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${risk.premium.toLocaleString('ru-RU', {useGrouping: false})}${formatKv35(risk.premium)}<br>`;
    });
  } else if (finalProduct.product === 'bastion' && additionalRisks.length > 0) {
    additionalRisks.forEach(risk => {
      output += `доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${risk.premium.toLocaleString('ru-RU', {useGrouping: false})}${formatKv35(risk.premium)}<br>`;
    });
  } else {
    const formatKvForProduct = finalProduct.product === 'lichnie_veschi' ? formatKv50 : formatKv35;
    const riskDetails = getAdditionalRiskDetails(finalProduct.product, data, insuranceAmount, finalProduct.premium, additionalRisks, finalProduct.packDetails);

    if (riskDetails.sum) {
      output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${riskDetails.sum} ${finalProduct.premium.toLocaleString('ru-RU', {useGrouping: false})}${formatKvForProduct(finalProduct.premium)}`;
    } else {
      output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${finalProduct.premium.toLocaleString('ru-RU', {useGrouping: false})}${formatKvForProduct(finalProduct.premium)}`;
    }

    if (additionalRisks.length > 0) {
      additionalRisks.forEach(risk => {
        output += `<br>доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${risk.premium.toLocaleString('ru-RU', {useGrouping: false})}${formatKv35(risk.premium)}`;
      });
    }
  }
  
  if (additionalRisks.length === 0) {
    output += '<br>';
  }
  
  if (data.risks.titul && titlePremiumV2 > 0) {
    output += `<br>титул ${titlePremiumV2.toLocaleString('ru-RU', {useGrouping: false})}`;
  }

  output += `<br>Итого тариф взнос ${currentTotal.toLocaleString('ru-RU', {useGrouping: false})}`;

  return output;
}

// Экспортируем функции в глобальную область
window.calculateSimplifiedVariant2 = calculateSimplifiedVariant2;
window.getAvailableProducts = getAvailableProducts;
window.calculateBasePremiums = calculateBasePremiums;
window.calculateProductResults = calculateProductResults;
window.selectBestProduct = selectBestProduct;
window.optimizeProduct = optimizeProduct;
window.formatVariant2Output = formatVariant2Output;
