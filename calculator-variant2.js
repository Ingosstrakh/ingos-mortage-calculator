// calculator-variant2.js - Расчет варианта 2 (повышенные скидки + доп. риски)

/**
 * Расчет варианта 2 с повышенными скидками и дополнительными рисками
 * @param {Object} data - Данные клиента
 * @param {Object} bankConfig - Конфигурация банка
 * @param {number} insuranceAmount - Страховая сумма
 * @param {number} variant1Total - Итоговая сумма варианта 1
 * @returns {Object|null} Результат с output, total, meta
 */
function calculateVariant2(data, bankConfig, insuranceAmount, variant1Total) {
  // Исключение: если только жизнь и скидка НЕ разрешена - не показываем вариант 2
  const isLifeOnly = data.risks.life && !data.risks.property && !data.risks.titul;
  if (isLifeOnly && !bankConfig.allow_discount_life) {
    return null;
  }

  // Проверяем наличие необходимых данных для расчета
  const hasLifeOnlyData = isLifeOnly && window.LICHNIE_VESHCHI_PACKS;
  const hasPropertyData = window.T_MOYA && window.EXPRESS_PACKS && window.EXPRESS_GO_PACKS && window.T_BASTION;
  const hasFullData = hasLifeOnlyData || hasPropertyData;

  // Проверяем, является ли устройство мобильным
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Для мобильных устройств или при проблемах с загрузкой создаем упрощенный вариант
  if (!hasFullData) {
    return calculateSimplifiedVariant2(data, bankConfig, insuranceAmount);
  }

  // Определяем доступные продукты IFL
  const availableProducts = getAvailableProducts(data, bankConfig, isMobile);
  if (!availableProducts || availableProducts.length === 0) {
    return null;
  }

  // Рассчитываем базовые премии варианта 2 с скидками 30%
  const basePremiums = calculateBasePremiums(data, bankConfig, insuranceAmount);
  
  // Рассчитываем доп. риски для каждого доступного продукта
  const productResults = calculateProductResults(availableProducts, data, insuranceAmount, basePremiums);
  
  if (productResults.length === 0) {
    return null;
  }

  // Выбираем лучший продукт
  const bestProductResult = selectBestProduct(productResults, variant1Total, basePremiums.titlePremiumV2);
  
  if (!bestProductResult) {
    return null;
  }

  // Оптимизируем продукт (увеличиваем суммы если нужно)
  const optimizedResult = optimizeProduct(bestProductResult, data, insuranceAmount, variant1Total, basePremiums);

  // Формируем вывод
  const output = formatVariant2Output(data, bankConfig, insuranceAmount, basePremiums, optimizedResult);

  // Проверяем, что вариант 2 действительно дешевле варианта 1
  if (optimizedResult.currentTotal >= variant1Total) {
    return null;
  }

  return {
    output: output,
    total: optimizedResult.currentTotal,
    meta: {
      constructorSupported: optimizedResult.finalProduct && 
        (optimizedResult.finalProduct.product === 'moyakvartira' || optimizedResult.finalProduct.product === 'bastion'),
      product: optimizedResult.finalProduct ? optimizedResult.finalProduct.product : null,
      productName: optimizedResult.finalProduct ? optimizedResult.finalProduct.productName : null,
      insuranceAmount: insuranceAmount,
      variant1Total: variant1Total,
      base: basePremiums,
      additionalRisks: optimizedResult.additionalRisks || [],
      total: optimizedResult.currentTotal
    }
  };
}

// Экспортируем функцию в глобальную область
window.calculateVariant2 = calculateVariant2;
