// calculator-main.js - Главные функции обработки запросов и расчетов

/**
 * Обрабатывает запрос клиента и выполняет расчеты
 * @param {string} clientText - Текст запроса от клиента
 * @returns {string} HTML-результат расчета или сообщение об ошибке
 */
function handleClientRequest(clientText) {
  try {
    // Проверяем, является ли запрос данными рассрочки
    // Если есть слово "рассрочку" или "рассрочка" - это точно рассрочка
    const hasInstallmentWord = /рассрочку|рассрочка/i.test(clientText);
    
    // Дополнительные проверки для надежности
    const hasFullNamePattern = /^[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+/m.test(clientText);
    
    // Если есть слово "рассрочка" И есть ФИО - это точно рассрочка (не требуем обязательного наличия всех полей)
    const isInstallmentRequest = hasInstallmentWord && 
                                 hasFullNamePattern && 
                                 typeof window.parseInstallmentData === 'function';
    
    if (isInstallmentRequest) {
      // Это запрос на расчет рассрочки
      console.log("Обнаружен запрос на расчет рассрочки");
      console.log("hasInstallmentWord:", hasInstallmentWord);
      console.log("hasFullNamePattern:", hasFullNamePattern);
      
      const parsedData = window.parseInstallmentData(clientText);
      console.log("Разобранные данные рассрочки:", parsedData);
      
      if (!parsedData.isValid) {
        return `<div style="color: #dc3545; padding: 15px; border: 1px solid #dc3545; border-radius: 8px; margin: 15px 0; background-color: #f8d7da;">
          <strong>❌ Ошибка парсинга данных рассрочки</strong><br><br>
          ${parsedData.errors.join('<br>')}<br><br>
          <strong>Формат данных:</strong><br>
          ФИО, дата рождения (ДД.ММ.ГГГГ гр)<br>
          Сумма в рассрочку [сумма] р.<br>
          Срок рассрочки до [дата]
        </div>`;
      }
      
      const calculationResult = window.calculateInstallmentPremium(parsedData);
      return formatInstallmentResult(calculationResult);
    }
    
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

/**
 * Выполняет расчеты страхования на основе разобранных данных
 * @param {Object} data - Разобранные данные клиента
 * @returns {string} HTML-результат расчета
 */
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
      // Новые правила для ВТБ после 01.02.2025 включительно
      bankConfig.add_percent = 0; // Надбавка 0%
      bankConfig.allow_discount_property = false; // Скидки запрещены
      bankConfig.allow_discount_life = false;
      bankConfig.allow_discount_title = false;
    }
  }

  // Специальная логика для Альфа Банка: используем отдельный тариф
  if (bankConfig.bankName === "Альфа Банк") {
    // Для Альфа Банка используем специальный тариф на жизнь
    data.lifeTariff = window.LIFE_TARIFF_ALFABANK;
  }

  // Обновляем data.bank для использования в других функциях
  data.bank = normalizedBank;

  let output = `<b>Банк:</b> ${data.bank}<br>`;
  output += `<b>Остаток долга:</b> ${data.osz.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false})} ₽<br><br>`;

  // Расчет страховой суммы с надбавкой
  let insuranceAmount = data.osz;
  if (bankConfig.add_percent && bankConfig.add_percent > 0) {
    // Фиксированная надбавка из конфигурации банка
    const markup = data.osz * (bankConfig.add_percent / 100);
    insuranceAmount = data.osz + markup;
    output += `<b>Надбавка ${bankConfig.add_percent}%:</b> ${markup.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false})} ₽<br>`;
    output += `<b>Страховая сумма:</b> ${insuranceAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false})} ₽<br><br>`;
  } else if (bankConfig.add_percent === null && data.markupPercent) {
    // Клиент сам указывает надбавку (для Альфа Банка и УБРИР)
    const markup = data.osz * (data.markupPercent / 100);
    insuranceAmount = data.osz + markup;
    output += `<b>Надбавка ${data.markupPercent}% (клиент):</b> ${markup.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false})} ₽<br>`;
    output += `<b>Страховая сумма:</b> ${insuranceAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false})} ₽<br><br>`;
  } else if (bankConfig.add_percent === null) {
    // Надбавка не указана клиентом
    output += `<b>Внимание:</b> Для этого банка укажите надбавку в процентах (например: "15% надбавка")<br><br>`;
  } else {
    // add_percent = 0 - надбавки нет, используем остаток как страховую сумму
    output += `<b>Страховая сумма:</b> ${insuranceAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false})} ₽<br><br>`;
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

  // Собираем итоговые суммы (уже с учетом минимальных сумм из функций расчета)
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
    output += `Имущество ${(propertyResult.totalWithoutDiscount || propertyResult.total).toLocaleString('ru-RU', {useGrouping: false})}<br>`;
  }

  if (data.risks.life && lifeResult) {
    // Если требуется медобследование и премия = 0, показываем только сообщение
    if (lifeResult.requiresMedicalExam && lifeResult.total === 0) {
      output += `<span style="color: #dc3545; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span><br>`;
    } else if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
      // ВАЖНО: используем data.borrowers.length, а не lifeResult.borrowers.length
      // чтобы правильно определить, один заемщик или несколько
      const isMultipleBorrowers = data.borrowers && data.borrowers.length > 1;
      
      // Минимальная сумма для жизни: 600 рублей на каждого заемщика
      // Премии уже содержат минимум для каждого заемщика (применено в calculateLifeInsurance)
      
      if (isMultipleBorrowers && lifeResult.borrowers.length > 1) {
        // Несколько заемщиков - показываем каждого с его премией (уже с учетом минимума 600 руб)
        const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
          const isRsxb = bankConfig && bankConfig.bankName === "РСХБ";
          const isAlfa = bankConfig && bankConfig.bankName === "Альфа Банк";
          lifeResult.borrowers.forEach((borrower, index) => {
            const borrowerLabel = `заемщик ${index + 1}`;
            output += `жизнь ${borrowerLabel} ${borrower.premium.toLocaleString('ru-RU', {useGrouping: false})}`;
            
            // Для Совкомбанка добавляем текст "без РИСКА СВО"
            if (isSovcombank) {
              output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
            }
            
            // Для РСХБ и Альфа Банк добавляем фразу про ВУТ
            if (isRsxb || isAlfa) {
              output += ` <span style="color: #64748b; font-size: 0.9em;">(с ВУТ)</span>`;
            }
          
          // Добавляем сообщение о медицинском андеррайтинге/лимитах сразу после премии жизни (только для первого заемщика)
          if (index === 0 && lifeResult.medicalUnderwritingMessage) {
            if (lifeResult.requiresMedicalExam) {
              output += ` <span style="color: #dc3545; font-weight: bold;">⚠️ ${lifeResult.medicalUnderwritingMessage}</span>`;
            } else if (lifeResult.medicalUnderwritingFactor === 1.25) {
              output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
            } else {
              // Сообщение о лимитах по возрасту (не критичное)
              output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
            }
          }
          output += `<br>`;
        });
      } else {
        // Один заемщик - показываем премию заемщика (уже с учетом минимума 600 руб)
        const borrowerLabel = 'заемщик';
        const borrowerPremium = lifeResult.borrowers[0] ? lifeResult.borrowers[0].premium : lifeResult.total;
        const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
        const isRsxb = bankConfig && bankConfig.bankName === "РСХБ";
        const isAlfa = bankConfig && bankConfig.bankName === "Альфа Банк";
        output += `жизнь ${borrowerLabel} ${borrowerPremium.toLocaleString('ru-RU', {useGrouping: false})}`;
        
        // Для Совкомбанка добавляем текст "без РИСКА СВО"
        if (isSovcombank) {
          output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
        }
        
        // Для РСХБ и Альфа Банк добавляем фразу про ВУТ
        if (isRsxb || isAlfa) {
          output += ` <span style="color: #64748b; font-size: 0.9em;">(с ВУТ)</span>`;
        }
        
        // Добавляем сообщение о медицинском андеррайтинге/лимитах
        if (lifeResult.medicalUnderwritingMessage) {
          if (lifeResult.requiresMedicalExam) {
            output += ` <span style="color: #dc3545; font-weight: bold;">⚠️ ${lifeResult.medicalUnderwritingMessage}</span>`;
          } else if (lifeResult.medicalUnderwritingFactor === 1.25) {
            output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
          } else {
            // Сообщение о лимитах по возрасту (не критичное)
            output += ` <span style="color: #f59e0b; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span>`;
          }
        }
        output += `<br>`;
      }
    }
  }

  if (data.risks.titul && titleResult) {
    // Используем totalWithoutDiscount, чтобы в 1 варианте всегда была полная цена
    output += `титул ${(titleResult.totalWithoutDiscount || titleResult.total).toLocaleString('ru-RU', {useGrouping: false})}<br>`;
  }

  output += `ИТОГО тариф/ взнос ${totalWithoutDiscount.toLocaleString('ru-RU', {useGrouping: false})}<br><br>`;

  // Расчет варианта 2 (повышенные скидки + доп. риски)
  console.log('Начинаем расчет варианта 2...');
  try {
    const variant2Result = calculateVariant2(data, bankConfig, insuranceAmount, totalWithoutDiscount);
    console.log('Результат расчета варианта 2:', variant2Result);
    if (variant2Result && variant2Result.output) {
      console.log('Добавляем вариант 2 в вывод');
      output += `<b>Вариант 2 (повышенные скидки + доп. риски):</b><br>`;
      // Wrap variant2 output to allow in-place updates from the constructor
      output += `<div id="variant2-block">${variant2Result.output}</div>`;
      if (variant2Result.meta && variant2Result.meta.constructorSupported) {
        output += `<div style="margin-top: 10px;">
          <button type="button" class="btn-secondary" onclick="window.openVariant2Constructor()">
            <span class="btn-icon">⚙️</span>
            <span>Конструктор варианта 2</span>
          </button>
        </div>`;
      }

      // Save context for the constructor UI
      try {
        window.__LAST_VARIANT2_CONTEXT__ = {
          parsedData: JSON.parse(JSON.stringify(data)),
          bankConfig: JSON.parse(JSON.stringify(bankConfig)),
          variant1Total: totalWithoutDiscount,
          insuranceAmount: insuranceAmount,
          variant2Meta: variant2Result.meta || null,
          variant2CustomState: null
        };
      } catch (e) {
        // Fallback: store by reference
        window.__LAST_VARIANT2_CONTEXT__ = {
          parsedData: data,
          bankConfig: bankConfig,
          variant1Total: totalWithoutDiscount,
          insuranceAmount: insuranceAmount,
          variant2Meta: variant2Result.meta || null,
          variant2CustomState: null
        };
      }
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

// Экспортируем функции в глобальную область
window.handleClientRequest = handleClientRequest;
window.performCalculations = performCalculations;

// Последний контекст варианта 2 для конструктора (UI-настройки доп. рисков)
// Заполняется внутри performCalculations.
window.__LAST_VARIANT2_CONTEXT__ = null;
