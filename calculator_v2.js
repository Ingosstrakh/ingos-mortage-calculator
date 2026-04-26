// calculator_v2.js

/**
 * Детальная валидация входных данных перед расчетами
 *
 * Проверяет все необходимые поля для корректного расчета страховых премий:
 * - Название банка (проверка поддержки)
 * - Остаток задолженности (обязательное поле)
 * - Типы страхования (жизнь/имущество/титул)
 * - Данные заемщиков (для страхования жизни)
 * - Тип объекта недвижимости (для имущества)
 * - Материал стен (для домов)
 * - Наличие газа (для деревянных домов)
 * - Процентная ставка (для некоторых банков)
 *
 * @param {Object} data - Разобранные данные от parseTextToObject
 * @returns {Array|null} Массив строк с ошибками или null если все OK
 */
function validateParsedData(data) {
  const errors = [];

  // 1. Проверка банка
  if (!data.bank) {
    errors.push("❌ Название банка не найдено. Укажите название банка в запросе (например: 'Сбербанк', 'ВТБ', 'Альфа Банк' и т.д.)");
  } else {
    // Проверяем, поддерживается ли банк в конфигурации
    const bankConfig = window.BANKS[data.bank];
    if (!bankConfig) {
      errors.push(`❌ Банк "${data.bank}" не поддерживается. Поддерживаемые банки: ${Object.keys(window.BANKS).join(', ')}`);
    }
  }

  // 2. Проверка остатка задолженности
  if (!data.osz || data.osz <= 0) {
    errors.push("❌ Остаток задолженности не найден. Укажите остаток долга в рублях (например: 'остаток 2 500 000 ₽' или 'осз 2500000')");
  }

  // 3. Проверка рисков страхования
  const hasRisks = data.risks.life || data.risks.property || data.risks.titul;
  if (!hasRisks) {
    errors.push("❌ Тип страхования не указан. Укажите что нужно застраховать: 'жизнь', 'имущество' или 'титул'");
  }

  // 4. Проверка заемщиков для страхования жизни
  if (data.risks.life) {
    if (!data.borrowers || data.borrowers.length === 0) {
      errors.push("❌ Для страхования жизни нужны данные заемщика. Укажите дату рождения и пол (например: 'муж 15.08.1985' или 'жен 23.04.1990')");
    } else {
      // Проверяем каждый заемщик
      data.borrowers.forEach((borrower, index) => {
        if (!borrower.dob) {
          errors.push(`❌ У заемщика ${index + 1} не указана дата рождения. Формат: 'муж/жен DD.MM.YYYY'`);
        }
        if (!borrower.gender) {
          errors.push(`❌ У заемщика ${index + 1} не указан пол. Укажите 'муж' или 'жен'`);
        }
      });
    }
  }

  // 5. Проверка объекта недвижимости для страхования имущества
  if (data.risks.property) {
    if (!data.objectType) {
      errors.push("❌ Для страхования имущества укажите тип объекта: 'квартира', 'дом', 'таунхаус', 'апартаменты'");
    }
    if (data.objectType === 'дом' && !data.material) {
      errors.push("❌ Для дома укажите материал стен: 'кирпич', 'дерево', 'панель', 'монолит'");
    }
    if (data.objectType === 'дом' && data.material === 'дерево' && data.gas === null) {
      errors.push("❌ Для деревянного дома укажите наличие газа: 'с газом' или 'без газа'");
    }
  }

  // 6. Проверка процентной ставки для некоторых банков
  const bankConfig = data.bank ? window.BANKS[data.bank] : null;
  if (bankConfig && bankConfig.add_percent === null) {
    // Банки, где нужно указывать процентную ставку вручную
    if (!data.markupPercent && data.markupPercent !== 0) {
      const banksNeedingPercent = ['Альфа Банк', 'УБРИР', 'Банк СПБ'];
      if (banksNeedingPercent.includes(data.bank)) {
        errors.push(`❌ Для банка "${data.bank}" нужно указать процент надбавки (например: "${data.bank} 6%" или "ставка 6%")`);
      }
    }
  }


  // Возвращаем ошибки или null если все OK
  return errors.length > 0 ? errors : null;
}

// Функция форматирования результатов рассрочки
function formatInstallmentResult(calculationResult) {
  if (!calculationResult.success) {
    return `<div style="color: #dc3545; padding: 15px; border: 1px solid #dc3545; border-radius: 8px; margin: 15px 0; background-color: #f8d7da;">
      <strong>❌ Ошибка расчета рассрочки</strong><br><br>
      ${calculationResult.error}
    </div>`;
  }
  
  const data = calculationResult.data;
  let output = `<b>Расчет рассрочки</b><br><br>`;
  
  // Если несколько заемщиков
  if (data.borrowers && data.borrowers.length > 1) {
    output += `<b>Заемщики:</b><br>`;
    data.borrowers.forEach((borrower, index) => {
      output += `${index + 1}. ${borrower.fullName}, ${borrower.age} лет, ${borrower.gender}, доля ${borrower.share}%<br>`;
      output += `   Сумма: ${borrower.installmentAmount.toLocaleString('ru-RU')} ₽`;
      if (borrower.effectiveInstallmentAmount && borrower.effectiveInstallmentAmount !== borrower.installmentAmount) {
        output += ` (эффективная: ${borrower.effectiveInstallmentAmount.toLocaleString('ru-RU')} ₽)`;
      }
      output += `<br>`;
    });
    output += `<b>Общая сумма в рассрочку:</b> ${data.installmentAmount.toLocaleString('ru-RU')} ₽<br>`;
  } else {
    // Один заемщик
    output += `<b>ФИО:</b> ${data.fullName}<br>`;
    output += `<b>Возраст:</b> ${data.age} лет<br>`;
    output += `<b>Пол:</b> ${data.gender}<br>`;
    output += `<b>Сумма в рассрочку:</b> ${data.installmentAmount.toLocaleString('ru-RU')} ₽<br>`;
    
    // Показываем эффективную сумму, если она отличается от исходной (из-за лимитов по возрасту)
    if (data.effectiveInstallmentAmount && data.effectiveInstallmentAmount !== data.installmentAmount) {
      output += `<b>Эффективная сумма (с учетом лимитов):</b> ${data.effectiveInstallmentAmount.toLocaleString('ru-RU')} ₽<br>`;
    }
  }
  
  output += `<b>Срок рассрочки до:</b> ${data.endDate}<br>`;
  output += `<b>Количество месяцев:</b> ${data.monthsUntilEnd}<br>`;
  if (data.monthsUntilEnd < 12) {
    output += `<b>Примечание:</b> Срок менее 12 месяцев, расчет выполнен как за 1 год (12 месяцев)<br>`;
  }
  
  if (!data.borrowers || data.borrowers.length === 1) {
    output += `<b>Тариф:</b> ${data.tariff}%<br>`;
  }
  
  // Добавляем сообщения о медицинском андеррайтинге и лимитах
  if (data.medicalUnderwritingMessage) {
    output += `<br><span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span><br>`;
  }
  
  output += `<br><b>Вариант 1 (без скидки):</b><br>`;
  
  if (data.borrowers && data.borrowers.length > 1) {
    // Несколько заемщиков - показываем каждого отдельно
    data.borrowers.forEach((borrower, index) => {
      const borrowerLabel = data.borrowers.length > 1 ? `заемщик ${index + 1}` : 'заемщик';
      output += `жизнь ${borrowerLabel} ${borrower.variant1.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      if (index === 0 && data.medicalUnderwritingMessage) {
        output += ` <span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span>`;
      }
      output += `<br>`;
    });
    output += `<b>ИТОГО:</b> ${data.variant1.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>`;
  } else {
    // Один заемщик
    output += `жизнь заемщик ${data.variant1.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Добавляем сообщение о медицинском андеррайтинге после премии
    if (data.medicalUnderwritingMessage && !data.requiresMedicalExam) {
      if (data.medicalUnderwritingFactor === 1.25) {
        output += ` <span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span>`;
      } else if (data.medicalUnderwritingMessage.includes('Максимальная страховая сумма')) {
        output += ` <span style="color: #f59e0b; font-weight: bold;">${data.medicalUnderwritingMessage}</span>`;
      }
    }
    output += `<br>`;
  }
  
  output += `<br><b>Вариант 2 (со скидкой 25%):</b><br>`;
  
  if (data.borrowers && data.borrowers.length > 1) {
    // Несколько заемщиков - показываем каждого отдельно
    const hasDiscountRestriction = data.borrowers.some(b => b.requiresMedicalExam || b.medicalUnderwritingFactor === 1.25);
    data.borrowers.forEach((borrower, index) => {
      const borrowerLabel = data.borrowers.length > 1 ? `заемщик ${index + 1}` : 'заемщик';
      output += `жизнь ${borrowerLabel} ${borrower.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      if (borrower.requiresMedicalExam || borrower.medicalUnderwritingFactor === 1.25) {
        output += ` <span style="color: #dc3545; font-weight: bold;">(скидки недоступны)</span>`;
      }
      output += `<br>`;
    });
    output += `<b>ИТОГО:</b> ${data.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (hasDiscountRestriction) {
      output += ` <span style="color: #dc3545; font-weight: bold;">(скидки недоступны из-за мед. андеррайтинга)</span>`;
    }
    output += `<br>`;
  } else {
    // Один заемщик
    if (data.requiresMedicalExam || data.medicalUnderwritingFactor === 1.25) {
      output += `жизнь заемщик ${data.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style="color: #dc3545; font-weight: bold;">(скидки недоступны из-за мед. андеррайтинга)</span><br>`;
    } else {
      output += `жизнь заемщик ${data.variant2.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>`;
    }
  }
  
  return output;
}

// Основная функция для обработки запроса клиента
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
      const parsedData = window.parseInstallmentData(clientText);
      
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
    return "Произошла ошибка при обработке запроса: " + error.message;
  }
}

// Экспортируем функции в глобальную область
window.validateParsedData = validateParsedData;
window.handleClientRequest = handleClientRequest;
window.performCalculations = performCalculations;

// Последний контекст варианта 2 для конструктора (UI-настройки доп. рисков)
// Заполняется внутри performCalculations.
window.__LAST_VARIANT2_CONTEXT__ = null;

function formatMoneyRu(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
}

function formatMoneyRuGrouped(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// ===== Variant 2 Constructor (Moya Kvartira) =====
function ensureVariant2ConstructorModal() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('variant2-constructor-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'variant2-constructor-modal';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.7)',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'z-index:10001',
    'backdrop-filter:blur(4px)'
  ].join(';');

  overlay.innerHTML = `
    <div style="background:#fff; color:#111; width:min(720px, 92vw); max-height:88vh; overflow:auto; border-radius:16px; box-shadow:0 25px 50px rgba(0,0,0,0.35);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:18px 20px; border-bottom:1px solid #e5e7eb;">
        <div>
          <div style="font-weight:700; font-size:16px;">⚙️ Конструктор варианта 2</div>
          <div style="font-size:12px; color:#6b7280; margin-top:2px;">Настройка доп. рисков и пересчет итогов</div>
        </div>
        <button type="button" id="variant2-close-btn" style="border:0; background:#f3f4f6; border-radius:10px; padding:8px 10px; cursor:pointer;">Закрыть</button>
      </div>
      <div style="padding:18px 20px; display:grid; gap:14px;">
        <div id="variant2-discount-section" style="display:none; gap:8px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#f8fafc;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:600;">Скидка (вариант 2)</div>
            <input id="variant2-discount" type="number" min="0" max="50" step="1" style="width:120px; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
          </div>
          <div style="font-size:12px; color:#6b7280;">Для Сбербанка можно выбрать скидку на базовые риски (имущество/жизнь/титул) до 50%.</div>
        </div>

        <div style="display:grid; gap:8px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fafafa;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:600;">Страховая сумма (для пересчета)</div>
            <input id="variant2-ins-amount" type="number" min="0" step="1" style="width:220px; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
          </div>
          <div style="font-size:12px; color:#6b7280;">Это what-if пересчет. Исходный текст клиента не меняется.</div>
        </div>

        <div style="display:grid; gap:10px; padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
          <div style="font-weight:600;">Доп. риски (конструктор)</div>

          <div style="display:grid; gap:10px;">
            <div style="display:grid; grid-template-columns: 24px 1fr 200px 140px; gap:10px; align-items:center;">
              <input id="variant2-finish-enabled" type="checkbox">
              <div>
                <div style="font-weight:600;">Моя квартира: отделка и инженерное оборудование</div>
                <div id="variant2-finish-limits" style="font-size:12px; color:#6b7280;"></div>
              </div>
              <input id="variant2-finish-sum" type="number" min="0" step="1" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
              <div id="variant2-finish-prem" style="font-variant-numeric: tabular-nums; text-align:right;"></div>
            </div>

            <div style="display:grid; grid-template-columns: 24px 1fr 200px 140px; gap:10px; align-items:center;">
              <input id="variant2-movable-enabled" type="checkbox">
              <div>
                <div style="font-weight:600;">Моя квартира: движимое имущество</div>
                <div id="variant2-movable-limits" style="font-size:12px; color:#6b7280;"></div>
              </div>
              <input id="variant2-movable-sum" type="number" min="0" step="1" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
              <div id="variant2-movable-prem" style="font-variant-numeric: tabular-nums; text-align:right;"></div>
            </div>

            <div style="display:grid; grid-template-columns: 24px 1fr 200px 140px; gap:10px; align-items:center;">
              <input id="variant2-go-enabled" type="checkbox">
              <div>
                <div style="font-weight:600;">Моя квартира: гражданская ответственность</div>
                <div id="variant2-go-limits" style="font-size:12px; color:#6b7280;"></div>
              </div>
              <input id="variant2-go-sum" type="number" min="0" step="1" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
              <div id="variant2-go-prem" style="font-variant-numeric: tabular-nums; text-align:right;"></div>
            </div>
          </div>
        </div>

        <div style="display:grid; gap:8px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#f9fafb;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="font-weight:700;">Итого вариант 2</div>
            <div id="variant2-total" style="font-weight:800; font-variant-numeric: tabular-nums;"></div>
          </div>
          <div id="variant2-base" style="font-size:12px; color:#6b7280;"></div>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap; padding-top:4px;">
          <button type="button" id="variant2-reset-btn" style="border:1px solid #d1d5db; background:#fff; border-radius:10px; padding:10px 12px; cursor:pointer;">Сбросить</button>
          <button type="button" id="variant2-apply-btn" style="border:0; background:#2563eb; color:#fff; border-radius:10px; padding:10px 14px; cursor:pointer;">Применить к расчету</button>
        </div>

        <div id="variant2-warning" style="display:none; padding:10px 12px; border-radius:12px; background:#fffbeb; border:1px solid #f59e0b; color:#92400e; font-size:12px;"></div>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      window.closeVariant2Constructor();
    }
  });

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('#variant2-close-btn');
  closeBtn.addEventListener('click', () => window.closeVariant2Constructor());
}

function getMoyaRateBySum(table, sum) {
  if (!table || !Array.isArray(table)) return null;
  const s = Number(sum);
  return table.find(r => s >= r.min && s <= r.max) || null;
}

function getMoyaLimits(insuranceAmount) {
  const ins = Math.max(0, Number(insuranceAmount) || 0);
  const moya = window.T_MOYA;
  if (!moya) return null;

  const finishMin = moya.finish?.[0]?.min ?? 200000;
  const finishMaxCfg = Math.max(...(moya.finish || []).map(r => r.max));
  const finishMax = ins > 0 ? Math.min(finishMaxCfg, ins) : finishMaxCfg;

  const movableMin = moya.movable?.[0]?.min ?? 50000;
  const movableMaxCfg = Math.max(...(moya.movable || []).map(r => r.max));
  const movableMax = ins > 0 ? Math.min(movableMaxCfg, ins) : movableMaxCfg;

  const goMin = moya.go?.pack?.[0]?.min ?? 100000;
  const goMaxCfg = Math.max(...(moya.go?.pack || []).map(r => r.max));
  const goMax = ins > 0 ? Math.min(goMaxCfg, ins) : goMaxCfg;

  return {
    finish: { min: finishMin, max: finishMax },
    movable: { min: movableMin, max: movableMax },
    go: { min: goMin, max: goMax }
  };
}

function computeMoyaPremiums(insuranceAmount, { finishEnabled, finishSum, movableEnabled, movableSum, goEnabled, goSum }) {
  const moya = window.T_MOYA;
  const limits = getMoyaLimits(insuranceAmount);
  if (!moya || !limits) return { risks: [], totalPremium: 0, warning: 'Тарифы IFL (T_MOYA) не загружены' };

  const risks = [];
  let totalPremium = 0;
  let warning = '';

  const addRisk = (objects, sum, premium) => {
    const p = round2(premium);
    risks.push({ name: 'Моя квартира', objects, sum: Math.round(sum), premium: p });
    totalPremium += p;
  };

  if (finishEnabled) {
    const s0 = Number(finishSum) || 0;
    const s = Math.min(limits.finish.max, Math.max(limits.finish.min, s0));
    const rate = getMoyaRateBySum(moya.finish, s)?.rate;
    if (!rate) {
      warning = warning || 'Не найден тариф для отделки (finish) по указанной сумме';
    } else {
      addRisk('отделка и инженерное оборудование', s, s * rate);
    }
  }

  if (movableEnabled) {
    const s0 = Number(movableSum) || 0;
    const s = Math.min(limits.movable.max, Math.max(limits.movable.min, s0));
    const rate = getMoyaRateBySum(moya.movable, s)?.rate;
    if (!rate) {
      warning = warning || 'Не найден тариф для движимого имущества (movable) по указанной сумме';
    } else {
      addRisk('движимое имущество', s, s * rate);
    }
  }

  if (goEnabled) {
    const s0 = Number(goSum) || 0;
    const s = Math.min(limits.go.max, Math.max(limits.go.min, s0));
    const rate = getMoyaRateBySum(moya.go?.pack, s)?.rate;
    if (!rate) {
      warning = warning || 'Не найден тариф для ГО (go.pack) по указанной сумме';
    } else {
      addRisk('гражданская ответственность', s, s * rate);
    }
  }

  return { risks, totalPremium: round2(totalPremium), warning };
}

function clampDiscountPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(50, Math.round(n)));
}

function computeVariant2BasePremiums(parsedData, bankConfig, insuranceAmount, discountPercentOverride = null) {
  let propertyPremiumV2 = 0;
  let lifePremiumV2 = 0;
  let titlePremiumV2 = 0;

  const MIN_PREMIUM_PROPERTY = 600;
  const MIN_PREMIUM_LIFE = 600;

  const discountPercent = clampDiscountPercent(discountPercentOverride);
  const discountMultiplier = discountPercent === null ? 0.7 : (1 - discountPercent / 100);

  if (parsedData.risks.property) {
    const propertyResult = calculatePropertyInsurance(parsedData, bankConfig, insuranceAmount);
    if (propertyResult) {
      if (bankConfig.allow_discount_property) {
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = round2(basePremium * discountMultiplier);
        propertyPremiumV2 = Math.max(propertyPremiumV2, MIN_PREMIUM_PROPERTY);
      } else {
        propertyPremiumV2 = propertyResult.totalWithoutDiscount || propertyResult.total;
      }
    }
  }

  if (parsedData.risks.life) {
    const lifeResult = calculateLifeInsurance(parsedData, bankConfig, insuranceAmount);
    if (lifeResult) {
      // Ограничение как в calculateVariant2: для Сбербанка 55+ скидки запрещены
      let hasAgeRestrictionForSberbank = false;
      if (bankConfig && bankConfig.bankName === 'Сбербанк' && parsedData.borrowers && parsedData.borrowers.length > 0) {
        hasAgeRestrictionForSberbank = parsedData.borrowers.some(b => b.age >= 55);
      }

      // IMPORTANT: for consistency with existing calculateVariant2() logic,
      // do NOT re-apply 30% discount here. We reuse premiums from calculateLifeInsurance().
      // calculateVariant2() uses borrower.premiumWithDiscount (or borrower.premium) when discounts are allowed.
      const canApplyV2LifeDiscount = bankConfig.allow_discount_life &&
        !lifeResult.requiresMedicalExam &&
        lifeResult.medicalUnderwritingFactor !== 1.25 &&
        !hasAgeRestrictionForSberbank;

      if (canApplyV2LifeDiscount) {
        if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
          if (discountPercent === null) {
            // Default behavior: reuse calculateLifeInsurance() discounted premiums
            lifePremiumV2 = round2(lifeResult.borrowers.reduce((sum, b) => sum + (Number(b.premiumWithDiscount ?? b.premium) || 0), 0));
          } else {
            // Override discount percent (Sberbank use-case)
            lifePremiumV2 = round2(lifeResult.borrowers.reduce((sum, b) => {
              const prem = Number(b.premium) || 0;
              const discounted = round2(prem * discountMultiplier);
              return sum + Math.max(discounted, MIN_PREMIUM_LIFE);
            }, 0));
          }
        } else {
          // Fallback: lifeResult.total should already include discount if allowed
          if (discountPercent === null) {
            lifePremiumV2 = round2(Number(lifeResult.total) || 0);
          } else {
            const baseTotal = Number(lifeResult.totalWithoutDiscount || lifeResult.total) || 0;
            const numBorrowers = parsedData.borrowers ? parsedData.borrowers.length : 1;
            lifePremiumV2 = Math.max(round2(baseTotal * discountMultiplier), MIN_PREMIUM_LIFE * numBorrowers);
          }
        }
      } else {
        lifePremiumV2 = round2(Number(lifeResult.total || lifeResult.totalWithoutDiscount) || 0);
      }
    }
  }

  if (parsedData.risks.titul) {
    const withLifeInsurance = parsedData.risks.life || false;
    const titleResult = calculateTitleInsurance(parsedData, bankConfig, insuranceAmount, withLifeInsurance, parsedData.contractDate);
    if (bankConfig.allow_discount_title) {
      if (discountPercent === null) {
        titlePremiumV2 = round2(Number(titleResult.total) || 0);
      } else {
        const baseTitle = Number(titleResult.totalWithoutDiscount || titleResult.total) || 0;
        titlePremiumV2 = Math.max(round2(baseTitle * discountMultiplier), 600);
      }
    } else {
      titlePremiumV2 = round2(Number(titleResult.totalWithoutDiscount || titleResult.total) || 0);
    }
  }

  return {
    propertyPremiumV2: round2(propertyPremiumV2),
    lifePremiumV2: round2(lifePremiumV2),
    titlePremiumV2: round2(titlePremiumV2)
  };
}

function renderVariant2RisksHtml({ propertyPremiumV2, lifePremiumV2, titlePremiumV2 }, risks) {
  const formatKv35 = (premium) => {
    const agentAmount = round2(Number(premium) * 0.35);
    const fmt = agentAmount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return ` кв - 35% = агент получит по ИФЛ (${fmt})`;
  };

  let html = '';
  if (propertyPremiumV2 > 0) html += `имущество ${formatMoneyRuGrouped(propertyPremiumV2)}<br>`;
  if (lifePremiumV2 > 0) html += `жизнь заемщик ${formatMoneyRuGrouped(lifePremiumV2)}<br>`;

  if (Array.isArray(risks)) {
    risks.forEach(r => {
      const prem = Number(r.premium) || 0;
      const premFmt = prem.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      html += `доп риск - ${r.name} (${r.objects}) на сумму ${Math.round(r.sum).toLocaleString('ru-RU')} ₽ премия ${premFmt}${formatKv35(prem)}<br>`;
    });
  }

  // Keep the same ordering as calculateVariant2(): титул is printed after additional risks.
  if (titlePremiumV2 > 0) html += `<br>титул ${formatMoneyRuGrouped(titlePremiumV2)}<br>`;

  return html;
}

window.openVariant2Constructor = function openVariant2Constructor() {
  ensureVariant2ConstructorModal();
  const ctx = window.__LAST_VARIANT2_CONTEXT__;
  const modal = document.getElementById('variant2-constructor-modal');
  if (!modal) return;

  if (!ctx || !ctx.variant2Meta || !ctx.variant2Meta.constructorSupported) {
    alert('Конструктор варианта 2 недоступен для текущего расчета');
    return;
  }

  const insuranceAmount = Number(ctx.insuranceAmount) || 0;
  const isSberbank = ctx.bankConfig && ctx.bankConfig.bankName === 'Сбербанк';
  const limits = getMoyaLimits(insuranceAmount);

  // Default values from meta.additionalRisks
  const byObjects = Object.fromEntries((ctx.variant2Meta.additionalRisks || []).map(r => [r.objects, r]));
  const finishDefault = byObjects['отделка и инженерное оборудование']?.sum ?? limits.finish.min;
  const movableDefault = byObjects['движимое имущество']?.sum ?? limits.movable.min;
  const goDefault = byObjects['гражданская ответственность']?.sum ?? limits.go.min;

  const state = ctx.variant2CustomState || {
    insuranceAmount,
    // Discount override is Sberbank-only feature (0-50). For other banks keep default 30%.
    discountPercent: isSberbank ? 30 : null,
    finishEnabled: Boolean(byObjects['отделка и инженерное оборудование']),
    movableEnabled: Boolean(byObjects['движимое имущество']),
    goEnabled: Boolean(byObjects['гражданская ответственность']),
    finishSum: finishDefault,
    movableSum: movableDefault,
    goSum: goDefault
  };
  ctx.variant2CustomState = state;

  // Discount section visibility + value
  const discountSection = modal.querySelector('#variant2-discount-section');
  const discountInput = modal.querySelector('#variant2-discount');
  if (isSberbank) {
    discountSection.style.display = 'grid';
    discountInput.value = String(clampDiscountPercent(state.discountPercent) ?? 30);
  } else {
    discountSection.style.display = 'none';
    state.discountPercent = null;
  }

  // Set limits texts
  modal.querySelector('#variant2-finish-limits').textContent = `лимит: ${limits.finish.min.toLocaleString('ru-RU')} - ${limits.finish.max.toLocaleString('ru-RU')} ₽`;
  modal.querySelector('#variant2-movable-limits').textContent = `лимит: ${limits.movable.min.toLocaleString('ru-RU')} - ${limits.movable.max.toLocaleString('ru-RU')} ₽`;
  modal.querySelector('#variant2-go-limits').textContent = `лимит: ${limits.go.min.toLocaleString('ru-RU')} - ${limits.go.max.toLocaleString('ru-RU')} ₽`;

  // Populate inputs
  modal.querySelector('#variant2-ins-amount').value = String(Math.round(state.insuranceAmount || insuranceAmount));
  modal.querySelector('#variant2-finish-enabled').checked = !!state.finishEnabled;
  modal.querySelector('#variant2-movable-enabled').checked = !!state.movableEnabled;
  modal.querySelector('#variant2-go-enabled').checked = !!state.goEnabled;
  modal.querySelector('#variant2-finish-sum').value = String(Math.round(state.finishSum || finishDefault));
  modal.querySelector('#variant2-movable-sum').value = String(Math.round(state.movableSum || movableDefault));
  modal.querySelector('#variant2-go-sum').value = String(Math.round(state.goSum || goDefault));

  const warningEl = modal.querySelector('#variant2-warning');
  const setWarning = (msg) => {
    if (!msg) {
      warningEl.style.display = 'none';
      warningEl.textContent = '';
    } else {
      warningEl.style.display = 'block';
      warningEl.textContent = msg;
    }
  };

  const refresh = () => {
    const ins = Number(modal.querySelector('#variant2-ins-amount').value) || 0;
    state.insuranceAmount = ins;

    if (isSberbank) {
      state.discountPercent = clampDiscountPercent(discountInput.value);
      if (state.discountPercent === null) state.discountPercent = 30;
      discountInput.value = String(state.discountPercent);
    } else {
      state.discountPercent = null;
    }

    state.finishEnabled = modal.querySelector('#variant2-finish-enabled').checked;
    state.movableEnabled = modal.querySelector('#variant2-movable-enabled').checked;
    state.goEnabled = modal.querySelector('#variant2-go-enabled').checked;
    state.finishSum = Number(modal.querySelector('#variant2-finish-sum').value) || 0;
    state.movableSum = Number(modal.querySelector('#variant2-movable-sum').value) || 0;
    state.goSum = Number(modal.querySelector('#variant2-go-sum').value) || 0;

    const baseNow = ctx.variant2Meta.base || computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, ins, state.discountPercent);
    const custom = computeMoyaPremiums(ins, state);

    // Update per-risk premiums preview
    const premByObj = Object.fromEntries(custom.risks.map(r => [r.objects, r.premium]));
    modal.querySelector('#variant2-finish-prem').textContent = state.finishEnabled ? formatMoneyRuGrouped(premByObj['отделка и инженерное оборудование'] || 0) : '0,00';
    modal.querySelector('#variant2-movable-prem').textContent = state.movableEnabled ? formatMoneyRuGrouped(premByObj['движимое имущество'] || 0) : '0,00';
    modal.querySelector('#variant2-go-prem').textContent = state.goEnabled ? formatMoneyRuGrouped(premByObj['гражданская ответственность'] || 0) : '0,00';

    const total = round2(baseNow.propertyPremiumV2 + baseNow.lifePremiumV2 + baseNow.titlePremiumV2 + custom.totalPremium);
    modal.querySelector('#variant2-total').textContent = `${formatMoneyRuGrouped(total)} ₽`;
    modal.querySelector('#variant2-base').textContent = `база (имущество + жизнь + титул): ${formatMoneyRuGrouped(baseNow.propertyPremiumV2 + baseNow.lifePremiumV2 + baseNow.titlePremiumV2)} ₽, доп. риски: ${formatMoneyRuGrouped(custom.totalPremium)} ₽`;

    // Warning if variant2 is not cheaper than variant1
    const diff = round2((ctx.variant1Total || 0) - total);
    if (Number.isFinite(diff) && diff <= 0) {
      setWarning('Внимание: после настройки вариант 2 стал дороже или равен варианту 1');
    } else {
      setWarning(custom.warning || '');
    }

    // Stash for apply
    ctx.variant2Meta = {
      ...ctx.variant2Meta,
      insuranceAmount: ins,
      discountPercent: state.discountPercent,
      base: baseNow,
      additionalRisks: custom.risks,
      total: total
    };
  };

  // Wire handlers once
  if (!modal.__wired) {
    modal.__wired = true;
    const ids = [
      '#variant2-discount',
      '#variant2-ins-amount',
      '#variant2-finish-enabled', '#variant2-finish-sum',
      '#variant2-movable-enabled', '#variant2-movable-sum',
      '#variant2-go-enabled', '#variant2-go-sum'
    ];
    ids.forEach(sel => {
      modal.querySelector(sel).addEventListener('input', refresh);
      modal.querySelector(sel).addEventListener('change', refresh);
    });

    modal.querySelector('#variant2-reset-btn').addEventListener('click', () => {
      // Drop custom state and reopen to defaults
      ctx.variant2CustomState = null;
      window.openVariant2Constructor();
    });

    modal.querySelector('#variant2-apply-btn').addEventListener('click', () => {
      const block = document.getElementById('variant2-block');
      if (!block) {
        alert('Не найден блок варианта 2 в результатах');
        return;
      }

      const meta = ctx.variant2Meta;
      const baseNow = meta.base || computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, meta.insuranceAmount, meta.discountPercent);
      const html = renderVariant2RisksHtml(baseNow, meta.additionalRisks || []);
      const total = meta.total || round2(baseNow.propertyPremiumV2 + baseNow.lifePremiumV2 + baseNow.titlePremiumV2 + (meta.additionalRisks || []).reduce((s, r) => s + (Number(r.premium) || 0), 0));

      block.innerHTML = `${html}<br>Итого тариф взнос ${formatMoneyRuGrouped(total)}`;

      // Update context shown in UI
      ctx.insuranceAmount = meta.insuranceAmount;
      window.closeVariant2Constructor();
    });
  }

  // Initial refresh
  refresh();

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeVariant2Constructor = function closeVariant2Constructor() {
  const modal = document.getElementById('variant2-constructor-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
};

// Функция выполнения всех расчетов
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
  try {
    const variant2Result = calculateVariant2(data, bankConfig, insuranceAmount, totalWithoutDiscount);
    if (variant2Result && variant2Result.output) {
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
      // вариант 2 не показываем
    }
  } catch (error) {
    // Не показываем ошибку пользователю, просто пропускаем вариант
  }

  // Расчет варианта 3 (указанная скидка)
  if (data.variant3Discount) {
    try {
      const variant3Result = calculateVariant3(data, bankConfig, insuranceAmount, data.variant3Discount);
      if (variant3Result && variant3Result.output) {
        output += `<b>Вариант 3 (скидка ${data.variant3Discount}%):</b><br>`;
        output += variant3Result.output;
      }
    } catch (error) {
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
      return true;
    }).catch(err => {
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
        return true;
      } else {
        return false;
      }
    } catch (err) {
      return false;
    }
  }
}

// Таблица медицинского андеррайтинга (рост -> возраст -> вес)
// Значения: 1.00 = стандартный риск, 1.25 = +25% к тарифу, "МЕДО" = требуется медобследование
const UNDERWRITING_TABLE = {
  140: {
    "16-29": [1.25, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": [1.25, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": [1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": [1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  150: {
    "16-29": ["МЕДО", 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  160: {
    "16-29": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  170: {
    "16-29": ["МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  180: {
    "16-29": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  190: {
    "16-29": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  }
};

// Функция получения коэффициента медицинского андеррайтинга
function getUnderwritingFactor(age, height, weight) {
  if (!age || !height || !weight) return 1.00;
  
  const ageGroup = age >= 16 && age <= 29 ? "16-29" :
                  age >= 30 && age <= 45 ? "30-45" :
                  age >= 46 && age <= 59 ? "46-59" : "59";

  const heightKeys = Object.keys(UNDERWRITING_TABLE).map(Number).sort((a, b) => a - b);
  const closestHeight = heightKeys.reduce((prev, curr) => 
    Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
  );

  const weightRanges = [39, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140];
  let weightIndex = 0;
  for (let i = 0; i < weightRanges.length; i++) {
    if (weight < weightRanges[i]) {
      weightIndex = i;
      break;
    }
    if (i === weightRanges.length - 1) weightIndex = weightRanges.length;
  }

  if (!UNDERWRITING_TABLE[closestHeight] || !UNDERWRITING_TABLE[closestHeight][ageGroup]) {
    return 1.00;
  }

  return UNDERWRITING_TABLE[closestHeight][ageGroup][weightIndex] || 1.00;
}

// Функция проверки лимитов страховой суммы по возрасту
// Возвращает объект: { maxAmount: максимальная сумма, requiresMedicalExam: требуется ли медобследование, message: сообщение }
function getAgeLimitForLifeInsurance(age) {
  if (!age) {
    return { maxAmount: null, requiresMedicalExam: false, message: '' };
  }
  
  if (age >= 65) {
    return {
      maxAmount: null,
      requiresMedicalExam: true,
      message: '⚠️ Необходимо пройти медобследование (возраст 65+ лет)'
    };
  } else if (age >= 56 && age <= 64) {
    return {
      maxAmount: 15000000, // 15 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 15 000 000 ₽`
    };
  } else if (age >= 50 && age <= 55) {
    return {
      maxAmount: 25000000, // 25 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 25 000 000 ₽`
    };
  } else if (age >= 45 && age <= 49) {
    return {
      maxAmount: 35000000, // 35 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 35 000 000 ₽`
    };
  } else {
    // До 44 лет включительно
    return {
      maxAmount: 45000000, // 45 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 45 000 000 ₽`
    };
  }
}

// Расчет страхования жизни
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
      const ageLimit = getAgeLimitForLifeInsurance(firstBorrower.age);
      
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
      medicalUnderwritingFactor = getUnderwritingFactor(firstBorrower.age, data.height, data.weight);
      
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
    tariffTable = window.LIFE_TARIFF_DOMRF || LIFE_TARIFF_DOMRF;
  } else if (bankConfig && bankConfig.bankName === "РСХБ") {
    tariffTable = window.LIFE_TARIFF_RSHB_LOSS || LIFE_TARIFF_RSHB_LOSS;
  } else if (bankConfig && bankConfig.bankName === "Банк СПБ") {
    tariffTable = window.LIFE_TARIFF_SPB || LIFE_TARIFF_SPB;
  } else if (bankConfig && bankConfig.bankName === "МКБ") {
    tariffTable = window.LIFE_TARIFF_MKB || LIFE_TARIFF_MKB;
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
        tariffTable = window.LIFE_TARIFF_GPB_OLD || LIFE_TARIFF_GPB_OLD;
      } else {
        tariffTable = window.LIFE_TARIFF_GPB_NEW || LIFE_TARIFF_GPB_NEW;
      }
    } else {
      // Если дата не указана, используем старые тарифы по умолчанию
      tariffTable = window.LIFE_TARIFF_GPB_OLD || LIFE_TARIFF_GPB_OLD;
    }
  } else if (bankConfig && bankConfig.bankName === "ВТБ") {
    // Для ВТБ tariffTable будет выбираться внутри цикла по borrower
    tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE; // значение по умолчанию
  } else {
    tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE;
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
          tariffTable = window.LIFE_TARIFF_VTB_NEW || LIFE_TARIFF_VTB_NEW;
        } else {
          // Для 51+ используем базовые тарифы
          tariffTable = window.LIFE_TARIFF_BASE || LIFE_TARIFF_BASE;
        }
      } else {
        // базовые тарифы ВТБ (дата до 01.02.2025)
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

  // Получаем тариф (для ГПБ учитываем дату КД и комбинацию с жизнью)
  const withLifeInsurance = data.risks && data.risks.life || false;
  const tariff = (window.getPropertyTariff || getPropertyTariff)(bankConfig.bankName, objectType, data.contractDate, withLifeInsurance);
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

  // Минимальная сумма премии для имущества: 600 рублей
  const MIN_PREMIUM_PROPERTY = 600;
  const finalPremium = Math.max(discountedPremium, MIN_PREMIUM_PROPERTY);
  const finalPremiumWithoutDiscount = Math.max(premium, MIN_PREMIUM_PROPERTY);

  return {
    total: finalPremium,
    totalWithoutDiscount: finalPremiumWithoutDiscount,
    hasDiscount: discountApplied
  };
}

// Расчет страхования титула
function calculateTitleInsurance(dataOrAmount, bankConfig, insuranceAmount, withLifeInsurance = false, contractDate = null) {
  // Поддержка старого формата вызова (только insuranceAmount)
  let amount, config;
  if (typeof dataOrAmount === 'number') {
    amount = dataOrAmount;
    config = null;
  } else {
    amount = insuranceAmount;
    config = bankConfig;
  }

  // Специальная логика для ГПБ и ВТБ
  let tariff = 0.2; // базовый тариф 0.2%

  // Логика для Газпромбанка
  if (config && config.bankName === "Газпромбанк" && contractDate) {
    const cutoffDate = new Date('2024-05-02');
    // Конвертируем DD.MM.YYYY в YYYY-MM-DD
    let contractDateObj;
    const parts = contractDate.split('.');
    if (parts.length === 3) {
      const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      contractDateObj = new Date(isoDate);
    } else {
      contractDateObj = new Date(contractDate);
    }
    const useOldTariffs = contractDateObj < cutoffDate;

    if (useOldTariffs) {
      // Старые тарифы ГПБ (до 02.05.2024)
      tariff = withLifeInsurance ? 0.28 : 0.336; // 0.28% с жизнью, 0.336% отдельно
    } else {
      // Новые тарифы ГПБ (после 02.05.2024)
      tariff = withLifeInsurance ? 0.38 : 0.457; // 0.38% с жизнью, 0.457% отдельно
    }
  }

  // Логика для ВТБ (после 01.02.2025)
  else if (config && config.bankName === "ВТБ" && contractDate) {
    const cutoffDate = new Date('2025-02-01T00:00:00');
    let contractDateObj;
    const parts = contractDate.split('.');
    if (parts.length === 3) {
      const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`;
      contractDateObj = new Date(isoDate);
    } else {
      contractDateObj = new Date(contractDate);
    }
    
    // Сравниваем даты без учета времени
    const contractDateOnly = new Date(contractDateObj.getFullYear(), contractDateObj.getMonth(), contractDateObj.getDate());
    const cutoffDateOnly = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), cutoffDate.getDate());
    const useNewTariffs = contractDateOnly >= cutoffDateOnly;

    if (useNewTariffs) {
      // Новые тарифы ВТБ (после 01.02.2025 включительно) - всегда 0.2%
      tariff = 0.2;
    }
    // Для старых дат (до 01.02.2025) используется базовый тариф 0.2%
  }

  const premium = Math.round(amount * (tariff / 100) * 100) / 100;

  // Применяем скидку для второго варианта
  let discountedPremium = premium;
  let discountApplied = false;
  if (config && config.allow_discount_title) {
    let discountMultiplier = 0.7; // стандартная скидка 30%
    if (config.discount_title_percent) {
      discountMultiplier = 1 - (config.discount_title_percent / 100);
    }
    discountedPremium = Math.round(premium * discountMultiplier * 100) / 100;
    discountApplied = true;
  }

  // Минимальная сумма премии для титула: 600 рублей
  const MIN_PREMIUM_TITLE = 600;
  const finalPremium = Math.max(discountedPremium, MIN_PREMIUM_TITLE);
  const finalPremiumWithoutDiscount = Math.max(premium, MIN_PREMIUM_TITLE);

  return {
    total: finalPremium,
    totalWithoutDiscount: finalPremiumWithoutDiscount,
    hasDiscount: discountApplied
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
  // Исключение: если только жизнь и скидка НЕ разрешена - не показываем вариант 2
  const isLifeOnly = data.risks.life && !data.risks.property && !data.risks.titul;
  if (isLifeOnly && !bankConfig.allow_discount_life) {
    return null;
  }

  // Проверяем наличие необходимых данных для расчета
  const hasLifeOnlyData = isLifeOnly && window.LICHNIE_VESHCHI_PACKS;
  const hasPropertyData = window.T_MOYA && window.EXPRESS_PACKS && window.EXPRESS_GO_PACKS && window.T_BASTION;
  const hasFullData = hasLifeOnlyData || hasPropertyData;
  console.log('Полные данные загружены:', hasFullData, '(lifeOnly:', hasLifeOnlyData, ', property:', hasPropertyData, ')');

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
    const MIN_PREMIUM_PROPERTY = 600;
    const MIN_PREMIUM_LIFE = 600;
    
    if (data.risks.property) {
      const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
      if (propertyResult && bankConfig.allow_discount_property) {
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = Math.round(basePremium * 0.7 * 100) / 100;
        // Применяем минимальную сумму
        propertyPremiumV2 = Math.max(propertyPremiumV2, MIN_PREMIUM_PROPERTY);
      } else if (propertyResult) {
        // Если скидки не разрешены, используем базовую премию (уже с учетом минимума из функции)
        propertyPremiumV2 = propertyResult.total || propertyResult.totalWithoutDiscount;
      }
    }

    // Расчет жизни с скидкой 30%
    if (data.risks.life) {
      const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
      
      // Проверяем ограничение по возрасту для Сбербанка (55+ лет - скидки запрещены)
      let hasAgeRestrictionForSberbank = false;
      if (bankConfig && bankConfig.bankName === "Сбербанк" && data.borrowers && data.borrowers.length > 0) {
        hasAgeRestrictionForSberbank = data.borrowers.some(borrower => borrower.age >= 55);
      }
      
      if (lifeResult && bankConfig.allow_discount_life && !lifeResult.requiresMedicalExam && lifeResult.medicalUnderwritingFactor !== 1.25 && !hasAgeRestrictionForSberbank) {
        // Применяем скидку к премиям каждого заемщика отдельно
        const numBorrowers = data.borrowers ? data.borrowers.length : 1;
        let totalWithDiscount = 0;
        
        if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
          // Применяем скидку к каждому заемщику и суммируем
          lifeResult.borrowers.forEach(borrower => {
            const borrowerPremiumWithDiscount = borrower.premiumWithDiscount || borrower.premium;
            totalWithDiscount += borrowerPremiumWithDiscount;
          });
        } else {
          // Fallback: применяем скидку к итоговой сумме
          const basePremium = lifeResult.totalWithoutDiscount;
          totalWithDiscount = Math.round(basePremium * 0.7 * 100) / 100;
        }
        
        // Минимум 600 руб на каждого заемщика
        lifePremiumV2 = Math.max(totalWithDiscount, MIN_PREMIUM_LIFE * numBorrowers);
      } else if (lifeResult) {
        // Если скидки не разрешены или есть мед. андеррайтинг, используем базовую премию (уже с учетом минимума из функции)
        lifePremiumV2 = lifeResult.total || lifeResult.totalWithoutDiscount;
      }
    }

    const totalV2 = propertyPremiumV2 + lifePremiumV2;

    // Формируем упрощенный вывод
    let output = '';
    if (data.risks.property && propertyPremiumV2 > 0) {
      output += `имущество ${propertyPremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}<br>`;
    }
    if (data.risks.life && lifePremiumV2 > 0) {
      // Показываем каждого заемщика отдельно, если есть данные
      const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
      if (lifeResult && lifeResult.borrowers && lifeResult.borrowers.length > 0) {
        const isMultipleBorrowers = data.borrowers && data.borrowers.length > 1;
        const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
        lifeResult.borrowers.forEach((borrower, index) => {
          const borrowerLabel = isMultipleBorrowers ? `заемщик ${index + 1}` : 'заемщик';
          const borrowerPremium = borrower.premiumWithDiscount || borrower.premium;
          output += `жизнь ${borrowerLabel} ${borrowerPremium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
          // Для Совкомбанка добавляем текст "без РИСКА СВО"
          if (isSovcombank) {
            output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
          }
          output += `<br>`;
        });
      } else {
        // Fallback: показываем итоговую сумму
        const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
        output += `жизнь ${borrowerLabel} ${lifePremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}<br>`;
      }
    }

    output += `<br>Итого тариф взнос ${totalV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

    return {
      output: output,
      total: totalV2
    };
  }

  // Определяем доступные продукты IFL (до блоков isMobile)
  let availableProducts = [];
  const isFlat = data.objectType === 'flat' || data.objectType === null;
  const isHouse = data.objectType === 'house_brick' || data.objectType === 'house_wood' || 
                  (data.objectType === 'house' && (data.material === 'brick' || data.material === 'wood'));

  if (isLifeOnly && bankConfig.allow_discount_life) {
    // Только жизнь + скидка разрешена: добавляем "Личные вещи" как доп. риск
    availableProducts = ['lichnie_veschi'];
  } else if (isFlat) {
    // Для квартиры приоритет: "Моя квартира" и "Экспресс квартира", затем остальные
    availableProducts = ['moyakvartira', 'express', 'express_go', 'bastion'];
  } else if (isHouse) {
    // Для дома (кирпич или дерево) - только Бастион
    availableProducts = ['bastion'];
  } else {
    // Для других типов объектов не показываем вариант 2
    return null;
  }

  // Для мобильных устройств ограничиваем количество продуктов
  if (isMobile && availableProducts.length > 2) {
    availableProducts = availableProducts.slice(0, 2);
  }

  // Рассчитываем вариант 2 с скидками 30%
  console.log('=== НАЧАЛО РАСЧЕТА ВАРИАНТА 2 ===');
  console.log('variant1Total =', variant1Total);
  console.log('insuranceAmount =', insuranceAmount);
  let propertyPremiumV2 = 0;
  let lifePremiumV2 = 0;

  // Минимальные суммы для варианта 2
  const MIN_PREMIUM_PROPERTY_V2 = 600;
  const MIN_PREMIUM_LIFE_V2 = 600;
  
  // Расчет имущества с скидкой 30% (где разрешено)
  if (data.risks.property) {
    const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    if (propertyResult) {
      if (bankConfig.allow_discount_property) {
        // Применяем скидку 30% вместо стандартной (10% или другой)
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = Math.round(basePremium * 0.7 * 100) / 100; // 30% скидка
        // Применяем минимальную сумму
        propertyPremiumV2 = Math.max(propertyPremiumV2, MIN_PREMIUM_PROPERTY_V2);
      } else {
        // Если скидки не разрешены, используем базовую премию без скидки (уже с учетом минимума из функции)
        propertyPremiumV2 = propertyResult.totalWithoutDiscount || propertyResult.total;
      }
    }
  }

  // Расчет жизни с скидкой 30% (где разрешено)
  if (data.risks.life) {
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult) {
      // Проверяем ограничение по возрасту для Сбербанка (55+ лет - скидки запрещены)
      let hasAgeRestrictionForSberbank = false;
      if (bankConfig && bankConfig.bankName === "Сбербанк" && data.borrowers && data.borrowers.length > 0) {
        hasAgeRestrictionForSberbank = data.borrowers.some(borrower => borrower.age >= 55);
      }
      
      // Медицинский андеррайтинг: если требуется медобследование или есть надбавка +25%, скидки отключены
      // В calculateLifeInsurance уже применен коэффициент 1.25 и отключены скидки при необходимости
      // Для Сбербанка: если возраст >= 55 лет, скидки также запрещены
      if (bankConfig.allow_discount_life && !lifeResult.requiresMedicalExam && lifeResult.medicalUnderwritingFactor !== 1.25 && !hasAgeRestrictionForSberbank) {
        // Применяем скидку 30% к премиям каждого заемщика отдельно
        const numBorrowers = data.borrowers ? data.borrowers.length : 1;
        let totalWithDiscount = 0;
        
        if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
          // Применяем скидку к каждому заемщику и суммируем
          lifeResult.borrowers.forEach(borrower => {
            const borrowerPremiumWithDiscount = borrower.premiumWithDiscount || borrower.premium;
            totalWithDiscount += borrowerPremiumWithDiscount;
          });
        } else {
          // Fallback: применяем скидку к итоговой сумме
          const basePremium = lifeResult.totalWithoutDiscount;
          totalWithDiscount = Math.round(basePremium * 0.7 * 100) / 100;
        }
        
        // Минимум 600 руб на каждого заемщика
        lifePremiumV2 = Math.max(totalWithDiscount, MIN_PREMIUM_LIFE_V2 * numBorrowers);
      } else {
        // Если скидки не разрешены или есть медицинский андеррайтинг, используем базовую премию без скидки
        // (уже с учетом надбавки +25% если применимо и минимума из функции)
        lifePremiumV2 = lifeResult.total || lifeResult.totalWithoutDiscount;
      }
    }
  }

  // Расчет титула для варианта 2 (со скидкой, если разрешено)
  let titleResult = null;
  let titlePremiumV2 = 0;
  if (data.risks.titul) {
    const withLifeInsurance = data.risks.life || false;
    titleResult = calculateTitleInsurance(data, bankConfig, insuranceAmount, withLifeInsurance, data.contractDate);
    // В варианте 2 титул уже со скидкой (если разрешено), так как calculateTitleInsurance применяет скидку автоматически
    titlePremiumV2 = titleResult.total; // total уже содержит скидку, если allow_discount_title = true
  }

  // Рассчитываем доп. риски для каждого доступного продукта
  // ВАЖНО: учитываем титул в базовой сумме для правильного расчета разницы
  const productResults = [];
  const baseVariant2Total = propertyPremiumV2 + lifePremiumV2 + titlePremiumV2;
  console.log('Базовый вариант 2 (property + life + title):', baseVariant2Total);

  for (const product of availableProducts) {
    if (product === 'lichnie_veschi') {
      // Личные вещи: перебираем все пакеты (5 вариантов × 3 набора рисков) для выбора лучшего
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
        console.log('Продукт', product, '- дополнительная премия:', additionalRisk.premium, '- итого (без титула):', totalV2);
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

  // Если нет подходящих продуктов, не показываем вариант 2
  if (productResults.length === 0) {
    return null;
  }

  // Сортируем продукты с приоритетом: "Моя квартира", "Экспресс квартира", "Личные вещи" (для life-only)
  const priorityProducts = productResults.filter(p => 
    p.product === 'moyakvartira' || p.product === 'express' || p.product === 'lichnie_veschi');
  const otherProducts = productResults.filter(p => 
    p.product !== 'moyakvartira' && p.product !== 'express' && p.product !== 'lichnie_veschi');

  // Сортируем приоритетные по сумме
  priorityProducts.sort((a, b) => a.total - b.total);
  // Сортируем остальные по сумме
  otherProducts.sort((a, b) => a.total - b.total);

  // Выбираем лучший продукт
  let bestProduct = null;
  let bestDifference = null;
  const targetDifference = 2200; // Целевая разница

  console.log('Поиск лучшего продукта среди', productResults.length, 'вариантов:');
  productResults.forEach(p => {
    console.log(`- ${p.product}: total=${p.total}, difference=${variant1Total - p.total}`);
  });

  // Сначала проверяем приоритетные продукты
  // ВАЖНО: при расчете разницы учитываем титул (product.total не включает титул)
  for (const product of priorityProducts) {
    const productTotalWithTitle = product.total + titlePremiumV2;
    const difference = variant1Total - productTotalWithTitle;
    if (difference >= 200) {
      // Если разница в допустимом диапазоне (до 2200), выбираем самый ДОРОГОЙ
      if (difference <= 2200) {
        if (!bestProduct || productTotalWithTitle > (bestProduct.total + titlePremiumV2)) {
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
      const productTotalWithTitle = product.total + titlePremiumV2;
      const difference = variant1Total - productTotalWithTitle;
      if (difference >= 200) {
        // Если разница в допустимом диапазоне (до 2200), выбираем самый дешевый среди остальных
        if (difference <= 2200) {
          if (!bestProduct || productTotalWithTitle < (bestProduct.total + titlePremiumV2)) {
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

  // Если разница больше 3000, увеличиваем страховые суммы для достижения разницы около 3000
  console.log('Выбран лучший продукт:', bestProduct ? `${bestProduct.product} (total: ${bestProduct.total})` : 'null');
  console.log('bestDifference:', bestDifference);

  let finalProduct = bestProduct;
  let additionalRisks = [];
  // bestProduct.total НЕ включает титул, титул добавим в конце
  let currentTotal = bestProduct.total + titlePremiumV2;
  let currentDifference = variant1Total - currentTotal;

  console.log('До увеличения сумм:');
  console.log('- currentTotal (bestProduct.total):', currentTotal);
  console.log('- currentDifference (variant1Total - currentTotal):', currentDifference);

  // Целевая разница: около 3000 рублей
  const targetDifferenceLarge = 3000;

  // Если разница больше 3000, увеличиваем суммы подобъектов
  if (currentDifference > targetDifferenceLarge) {
    // Добавляем дополнительные риски в зависимости от продукта
    if (bestProduct.product === 'moyakvartira') {
      // Для "Моя квартира" увеличиваем суммы отделки, движимого имущества и ГО
      const moyaTariff = window.T_MOYA;
      let baseFinishSum = 200000; // По умолчанию минимум
      if (moyaTariff) {
        if (insuranceAmount > 5000000) {
          baseFinishSum = 200000;
        } else {
          baseFinishSum = Math.min(500000, Math.max(200000, insuranceAmount * 0.08));
        }
      }

      // Увеличиваем суммы для достижения разницы около 3000
      const additionalRisksResult = increaseMoyaKvartiraSumsForDifference(data, insuranceAmount, currentDifference, targetDifferenceLarge, baseFinishSum, variant1Total, propertyPremiumV2, lifePremiumV2, titlePremiumV2);
      if (additionalRisksResult && additionalRisksResult.risks.length > 0) {
        additionalRisks = additionalRisksResult.risks;
        // ВАЖНО: учитываем титул в currentTotal
        currentTotal = propertyPremiumV2 + lifePremiumV2 + titlePremiumV2 + additionalRisksResult.totalPremium;
        currentDifference = variant1Total - currentTotal;

        // Обновляем финальный продукт с увеличенными суммами
        finalProduct = {
          product: 'moyakvartira',
          productName: 'Моя квартира',
          riskName: 'отделка и инженерное оборудование',
          premium: additionalRisksResult.totalPremium,
          total: currentTotal,
          increasedRisks: additionalRisks,
          useIncreasedRisksOnly: true // Флаг, что показывать только increasedRisks
        };

        console.log('После увеличения сумм:');
        console.log('- additionalRisksResult.totalPremium:', additionalRisksResult.totalPremium);
        console.log('- новый currentTotal:', currentTotal);
        console.log('- новая currentDifference:', variant1Total - currentTotal);
      }
    } else if (bestProduct.product === 'bastion') {
          // Для Бастиона увеличиваем сумму конструктива
      const bastionResult = increaseBastionSumsForDifference(data, insuranceAmount, currentDifference, targetDifferenceLarge, propertyPremiumV2, lifePremiumV2, titlePremiumV2, variant1Total);
      if (bastionResult) {
        finalProduct = bastionResult.finalProduct;
        additionalRisks = bastionResult.additionalRisks;
        currentTotal = bastionResult.currentTotal;
        currentDifference = bastionResult.currentDifference;

        // Для Бастиона добавляем отделку как дополнительный риск
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

          // Добавляем отделку как дополнительный риск
          additionalRisks.push({
            name: 'Бастион',
            objects: `отделка и инженерное оборудование ${isFlat ? 'квартира' : 'дом'}`,
            sum: finishSum,
            premium: finishPremium
          });

          // Обновляем итоговую сумму
          currentTotal += finishPremium;
          finalProduct.total = currentTotal;
        }
      }
    } else if (bestProduct.product === 'express') {
      // Для "Экспресс квартира" выбираем пакет с большей суммой
      const expressResult = increaseExpressSumsForDifference(currentDifference, targetDifferenceLarge, propertyPremiumV2, lifePremiumV2, titlePremiumV2, variant1Total);
      if (expressResult) {
        finalProduct = expressResult.finalProduct;
        currentTotal = expressResult.currentTotal;
        currentDifference = expressResult.currentDifference;
      }
    }
  }

  // Расчет титула уже выполнен выше, используем titleResult и titlePremiumV2

  // Формируем вывод варианта 2
  let output = '';
  if (data.risks.property) {
    // Форматируем с 2 знаками после запятой
    const formattedProperty = propertyPremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `имущество ${formattedProperty}<br>`;
  }
  if (data.risks.life) {
    // Добавляем сообщение о медицинском андеррайтинге/лимитах во 2 варианте (только для жизни)
    const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
    if (lifeResult && lifeResult.requiresMedicalExam && lifeResult.total === 0) {
      // Если требуется медобследование и премия = 0, показываем только сообщение
      output += `<span style="color: #dc3545; font-weight: bold;">${lifeResult.medicalUnderwritingMessage}</span><br>`;
    } else if (lifeResult && lifeResult.borrowers && lifeResult.borrowers.length > 0) {
      // Показываем каждого заемщика отдельно
      const isMultipleBorrowers = data.borrowers && data.borrowers.length > 1;
      
      const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
      lifeResult.borrowers.forEach((borrower, index) => {
        const borrowerLabel = isMultipleBorrowers ? `заемщик ${index + 1}` : 'заемщик';
        // Используем премию со скидкой, если есть, иначе обычную (уже с учетом минимума)
        const borrowerPremium = borrower.premiumWithDiscount || borrower.premium;
        const formattedLife = borrowerPremium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        output += `жизнь ${borrowerLabel} ${formattedLife}`;
        
        // Для Совкомбанка добавляем текст "без РИСКА СВО"
        if (isSovcombank) {
          output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
        }
        
        // Добавляем сообщение о медицинском андеррайтинге/лимитах (только для первого заемщика)
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
      // Fallback: показываем итоговую сумму
      const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';
      const formattedLife = lifePremiumV2.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const isSovcombank = bankConfig && bankConfig.bankName === "Совкомбанк";
      output += `жизнь ${borrowerLabel} ${formattedLife}`;
      
      // Для Совкомбанка добавляем текст "без РИСКА СВО"
      if (isSovcombank) {
        output += ` <span style="color: #64748b; font-size: 0.9em;">(без РИСКА СВО)</span>`;
      }
      
      if (lifeResult && lifeResult.medicalUnderwritingMessage) {
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

  const formatKv = (premium, percent = 35) => {
    const agentAmount = Math.round(premium * (percent / 100) * 100) / 100;
    const fmt = agentAmount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return ` кв - ${percent}% = агент получит по ИФЛ (${fmt})`;
  };
  const formatKv35 = (premium) => formatKv(premium, 35);
  const formatKv50 = (premium) => formatKv(premium, 50);

  // Если используем только увеличенные риски (без основного продукта) или Бастион с дополнительными рисками
  if (finalProduct.useIncreasedRisksOnly && additionalRisks.length > 0) {
    additionalRisks.forEach(risk => {
      const formattedRiskPremium = risk.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      output += `доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${formattedRiskPremium}${formatKv35(risk.premium)}<br>`;
    });
  } else if (finalProduct.product === 'bastion' && additionalRisks.length > 0) {
    // Для Бастиона с дополнительными рисками показываем только дополнительные риски
    additionalRisks.forEach(risk => {
      const formattedRiskPremium = risk.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      output += `доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${formattedRiskPremium}${formatKv35(risk.premium)}<br>`;
    });
  } else {
    // Стандартная логика с основным продуктом (Личные вещи — кв 50%, остальные — 35%)
    const formatKvForProduct = finalProduct.product === 'lichnie_veschi' ? formatKv50 : formatKv35;
    const riskDetails = getAdditionalRiskDetails(finalProduct.product, data, insuranceAmount, finalProduct.premium, additionalRisks, finalProduct.packDetails);

    // Форматируем доп. риск с деталями
    const formattedRisk = finalProduct.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (riskDetails.sum) {
      output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${riskDetails.sum} ${formattedRisk}${formatKvForProduct(finalProduct.premium)}`;
    } else {
      output += `доп риск - ${finalProduct.productName} (${riskDetails.objects}) ${formattedRisk}${formatKvForProduct(finalProduct.premium)}`;
    }

    // Добавляем дополнительные риски, если есть
    if (additionalRisks.length > 0) {
      additionalRisks.forEach(risk => {
        const formattedRiskPremium = risk.premium.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        output += `<br>доп риск - ${risk.name} (${risk.objects}) на сумму ${risk.sum.toLocaleString('ru-RU')} ₽ премия ${formattedRiskPremium}${formatKv35(risk.premium)}`;
      });
    }
  }
  
  // Добавляем перенос строки перед итого, если есть дополнительные риски
  if (additionalRisks.length === 0) {
    output += '<br>';
  }
  
  // Добавляем титул в output, если он есть
  // ВАЖНО: currentTotal уже включает титул (добавлен в строке 891)
  if (titleResult) {
    const formattedTitle = titleResult.total.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `<br>титул ${formattedTitle}`;
  }

  // Проверяем, что вариант 2 действительно дешевле варианта 1
  console.log('Финальная проверка:');
  console.log('- currentTotal (property + life + доп.риски + титул):', currentTotal);
  console.log('- variant1Total (property + life + титул без скидки):', variant1Total);
  console.log('- difference:', variant1Total - currentTotal);

  if (currentTotal >= variant1Total) {
    console.log('Вариант 2 получился дороже или равен варианту 1, не показываем:', currentTotal, '>=', variant1Total);
    return null;
  }

  // Форматируем итого
  const formattedTotal = currentTotal.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  output += `<br>Итого тариф взнос ${formattedTotal}`;

  return {
    output: output,
    total: currentTotal,
    meta: {
      constructorSupported: finalProduct && (finalProduct.product === 'moyakvartira' || finalProduct.product === 'bastion'),
      product: finalProduct ? finalProduct.product : null,
      productName: finalProduct ? finalProduct.productName : null,
      insuranceAmount: insuranceAmount,
      variant1Total: variant1Total,
      base: {
        propertyPremiumV2: propertyPremiumV2,
        lifePremiumV2: lifePremiumV2,
        titlePremiumV2: titlePremiumV2
      },
      additionalRisks: additionalRisks || [],
      total: currentTotal
    }
  };
}

// Функция для расчета варианта 3 с указанной скидкой
function calculateVariant3(data, bankConfig, insuranceAmount, discountPercent) {
  console.log('calculateVariant3: скидка =', discountPercent + '%');

  const discountRate = discountPercent / 100;
  let output = '';

  // Расчет имущества с указанной скидкой
  if (data.risks.property) {
    const propertyPremium = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    const propertyPremiumV3 = propertyPremium * (1 - discountRate);
    const borrowerLabel = data.borrowers.length > 1 ? 'заемщики' : 'заемщик';

    // Форматируем с 2 знаками после запятой
    const formattedProperty = propertyPremiumV3.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    output += `имущество ${formattedProperty}<br>`;
  }

  // Расчет жизни с указанной скидкой
  if (data.risks.life) {
    for (const borrower of data.borrowers) {
      const lifePremium = calculateLifeInsurance(data, bankConfig, borrower, insuranceAmount);
      const lifePremiumV3 = lifePremium * (1 - discountRate);
      const borrowerLabel = data.borrowers.length > 1 ? `${borrower.name}` : 'заемщик';

      // Форматируем с 2 знаками после запятой
      const formattedLife = lifePremiumV3.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      output += `жизнь ${borrowerLabel} ${formattedLife}<br>`;
    }
  }


  // Итоговый расчет
  let totalV3 = 0;

  if (data.risks.property) {
    const propertyPremium = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    totalV3 += propertyPremium * (1 - discountRate);
  }

  if (data.risks.life) {
    for (const borrower of data.borrowers) {
      const lifePremium = calculateLifeInsurance(data, bankConfig, borrower, insuranceAmount);
      totalV3 += lifePremium * (1 - discountRate);
    }
  }

  if (titleResult) {
    totalV3 += titleResult.total;
  }

  const formattedTotal = totalV3.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  output += `ИТОГО тариф/ взнос ${formattedTotal}<br><br>`;

  return {
    output: output,
    total: totalV3
  };
}

// Функция для увеличения сумм "Моя квартира" для достижения разницы около 3000
function increaseMoyaKvartiraSumsForDifference(data, insuranceAmount, currentDifference, targetDifference, baseFinishSum, variant1Total, propertyPremiumV2, lifePremiumV2, titlePremiumV2) {
  const moyaTariff = window.T_MOYA;
  if (!moyaTariff) return null;

  // Текущая разница между вариантом 1 и базовым вариантом 2 с выбранным продуктом
  // Нам нужно добавить дополнительные риски, чтобы итоговая премия стала variant1Total - targetDifference
  // ВАЖНО: учитываем титул в базовой сумме варианта 2

  const targetTotalPremium = variant1Total - targetDifference - (propertyPremiumV2 + lifePremiumV2 + titlePremiumV2);
  const neededAdditionalPremium = Math.max(0, targetTotalPremium);

  console.log('increaseMoyaKvartiraSumsForDifference:');
  console.log('- variant1Total:', variant1Total);
  console.log('- базовый вариант 2 (property + life + title):', propertyPremiumV2 + lifePremiumV2 + titlePremiumV2);
  console.log('- targetDifference:', targetDifference);
  console.log('- targetTotalPremium (variant1Total - targetDifference - baseV2):', targetTotalPremium);
  console.log('- neededAdditionalPremium:', neededAdditionalPremium);
  console.log('- currentDifference (из вызова):', currentDifference);

  if (neededAdditionalPremium <= 0) {
    return null; // Ничего не нужно добавлять
  }

  const risks = [];
  let totalPremium = 0;

  // ШАГ 1: Добавляем отделку "Моя квартира" с рассчитанной суммой
  if (moyaTariff.finish && moyaTariff.finish.length > 0) {
    // Используем среднюю ставку для расчета нужной суммы
    const avgFinishRate = 0.008; // Примерная ставка
    const targetFinishSum = Math.round(neededAdditionalPremium / avgFinishRate);
    const actualFinishSum = Math.max(50000, Math.min(500000, targetFinishSum));

    // Находим правильную ставку для рассчитанной суммы
    const finishRate = moyaTariff.finish.find(r => actualFinishSum >= r.min && actualFinishSum <= r.max)?.rate || 0.0095;
    const finishPremium = Math.round(actualFinishSum * finishRate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'отделка и инженерное оборудование',
      sum: actualFinishSum,
      premium: finishPremium
    });

    totalPremium = finishPremium;
    console.log('Добавлена отделка:', actualFinishSum, '->', finishPremium, '(итого:', totalPremium, ', нужно:', neededAdditionalPremium + ')');

    // Если достаточно, возвращаем
    if (totalPremium >= neededAdditionalPremium) {
      return { risks: risks, totalPremium: totalPremium };
    }
  }

  // ШАГ 2: Добавляем движимое имущество (если нужно)
  if (totalPremium < neededAdditionalPremium && moyaTariff.movable && moyaTariff.movable.length > 0) {
    const remainingNeeded = neededAdditionalPremium - totalPremium;

    // Рассчитываем сумму движимого имущества
    const avgMovableRate = 0.004; // Примерная ставка для движимого
    const targetMovableSum = Math.round(remainingNeeded / avgMovableRate);

    // Находим подходящий диапазон
    const suitableRange = moyaTariff.movable.find(r => targetMovableSum >= r.min && targetMovableSum <= r.max) ||
                         moyaTariff.movable[moyaTariff.movable.length - 1]; // Максимальный диапазон

    const actualMovableSum = Math.min(suitableRange.max, Math.max(suitableRange.min, targetMovableSum));
    const movablePremium = Math.round(actualMovableSum * suitableRange.rate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'движимое имущество',
      sum: actualMovableSum,
      premium: movablePremium
    });

    totalPremium += movablePremium;
    console.log('Добавлено движимое:', actualMovableSum, '->', movablePremium, '(итого:', totalPremium, ', нужно:', neededAdditionalPremium + ')');

    // Если достаточно, возвращаем
    if (totalPremium >= neededAdditionalPremium) {
      return { risks: risks, totalPremium: totalPremium };
    }
  }

  // ШАГ 3: Добавляем гражданскую ответственность (если нужно)
  if (totalPremium < neededAdditionalPremium && moyaTariff.go && moyaTariff.go.pack && moyaTariff.go.pack.length > 0) {
    const remainingNeeded = neededAdditionalPremium - totalPremium;

    // Рассчитываем сумму ГО
    const avgGoRate = 0.002; // Примерная ставка для ГО
    const targetGoSum = Math.round(remainingNeeded / avgGoRate);

    // Находим подходящий диапазон
    const suitableRange = moyaTariff.go.pack.find(r => targetGoSum >= r.min && targetGoSum <= r.max) ||
                         moyaTariff.go.pack[moyaTariff.go.pack.length - 1]; // Максимальный диапазон

    const actualGoSum = Math.min(suitableRange.max, Math.max(suitableRange.min, targetGoSum));
    const goPremium = Math.round(actualGoSum * suitableRange.rate * 100) / 100;

    risks.push({
      name: 'Моя квартира',
      objects: 'гражданская ответственность',
      sum: actualGoSum,
      premium: goPremium
    });

    totalPremium += goPremium;
    console.log('Добавлено ГО:', actualGoSum, '->', goPremium, '(итого:', totalPremium, ', нужно:', neededAdditionalPremium + ')');
  }


  console.log('Финальный результат: totalPremium =', totalPremium, 'из neededAdditionalPremium =', neededAdditionalPremium);
  console.log('Возвращаемые риски:', risks.map(r => `${r.name} ${r.objects}: ${r.sum} -> ${r.premium}`).join(', '));

  return totalPremium > 0 ? {
    risks: risks,
    totalPremium: totalPremium
  } : null;
}

// Функция для увеличения сумм Бастиона для достижения разницы около 3000
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

  // Рассчитываем нужную сумму конструктива
  const baseConstructPremium = Math.round(constructMin * constructRate * 100) / 100;
  const additionalNeeded = Math.max(0, neededPremium - baseConstructPremium);

  let constructSum = constructMin;
  if (additionalNeeded > 0) {
    // Увеличиваем сумму конструктива
    const additionalSum = Math.round(additionalNeeded / constructRate);
    constructSum = Math.min(constructMax, constructMin + additionalSum);
  }

  const constructPremium = Math.round(constructSum * constructRate * 100) / 100;
  // ВАЖНО: учитываем титул в итоговой сумме
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

// Функция для увеличения сумм "Экспресс квартира" для достижения разницы около 3000
function increaseExpressSumsForDifference(currentDifference, targetDifference, propertyPremiumV2, lifePremiumV2, titlePremiumV2, variant1Total) {
  const packs = window.EXPRESS_PACKS;
  if (!packs) return null;

  const neededPremium = currentDifference - targetDifference;
  const targetTotalV2 = variant1Total - targetDifference;
  // ВАЖНО: учитываем титул в расчете целевой премии
  const targetPremium = targetTotalV2 - propertyPremiumV2 - lifePremiumV2 - titlePremiumV2;

  // Находим пакет с максимальной премией, но не превышающий нужную
  let bestPack = null;
  let bestDiff = Infinity;

  for (const pack of packs) {
    if (pack.noGo <= targetPremium * 1.5) { // Не превышаем в 1.5 раза
      const diff = Math.abs(pack.noGo - targetPremium);
      if (diff < bestDiff) {
        bestPack = pack;
        bestDiff = diff;
      }
    }
  }

  if (!bestPack) {
    // Если не нашли подходящий, берем самый дорогой
    bestPack = packs.reduce((max, p) => p.noGo > max.noGo ? p : max, packs[0]);
  }

  // ВАЖНО: учитываем титул в итоговой сумме
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
// Добавление дополнительных рисков для "Моя квартира" для уменьшения разницы
function addAdditionalRisksForMoyaKvartira(data, insuranceAmount, neededIncrease, baseFinishSum = 200000) {
  const moyaTariff = window.T_MOYA;
  if (!moyaTariff) return null;

  const risks = [];
  let totalPremium = 0;
  let remainingIncrease = neededIncrease;

  // baseFinishSum передается из вызывающей функции - это сумма отделки, которая уже используется

  // Для равномерности: движимое имущество должно быть примерно такого же порядка, как отделка
  // Максимальная разница не должна превышать 2x от базовой суммы для равномерности
  const maxReasonableMovable = baseFinishSum * 2.5; // Максимум 500 000 для равномерности

  if (remainingIncrease > 300) {
    // Пробуем суммы для движимого имущества, близкие к сумме отделки
    // Генерируем больше вариантов в разумном диапазоне
    const testSums = [];
    for (let multiplier = 1; multiplier <= 2.5; multiplier += 0.25) {
      const testSum = Math.round(baseFinishSum * multiplier);
      if (testSum >= 50000 && testSum <= Math.min(2000000, maxReasonableMovable)) {
        testSums.push(testSum);
      }
    }
    
    let bestMovable = null;
    let bestScore = Infinity;
    
    for (const testSum of testSums) {
      const movableRate = moyaTariff.movable.find(r => testSum >= r.min && testSum <= r.max);
      if (movableRate) {
        const movablePremium = Math.round(testSum * movableRate.rate * 100) / 100;
        const diff = Math.abs(movablePremium - remainingIncrease);
        
        // Оценка равномерности: штраф за отклонение от базовой суммы
        // Чем ближе к базовой сумме, тем лучше
        const uniformityPenalty = Math.abs(testSum - baseFinishSum) / baseFinishSum * 2000;
        // Оценка точности: насколько близка премия к нужной
        const accuracyScore = diff;
        // Комбинированная оценка: приоритет равномерности, но учитываем нужную премию
        const combinedScore = accuracyScore + uniformityPenalty;
        
        if (combinedScore < bestScore && movablePremium <= remainingIncrease + 2000) {
          bestMovable = {
            sum: Math.round(testSum),
            premium: movablePremium
          };
          bestScore = combinedScore;
        }
      }
    }
    
    if (bestMovable) {
      risks.push({
        name: 'Моя квартира',
        objects: 'движимое имущество',
        sum: bestMovable.sum,
        premium: bestMovable.premium
      });
      totalPremium += bestMovable.premium;
      remainingIncrease -= bestMovable.premium;
    }
  }

  // Пытаемся добавить ГО, если еще нужно
  // ГО тоже должна быть разумной суммы, не слишком большой
  // Для равномерности ГО должна быть примерно равна или меньше отделки
  if (remainingIncrease > 200) {
    // Для ГО используем суммы в диапазоне 100 000 - не больше чем отделка * 1.5
    const maxReasonableGO = Math.min(500000, baseFinishSum * 1.5);
    const testSums = [];
    for (let sum = 100000; sum <= maxReasonableGO; sum += 50000) {
      testSums.push(sum);
    }
    // Добавляем также суммы близкие к базовой
    if (baseFinishSum >= 100000 && baseFinishSum <= 500000) {
      testSums.push(baseFinishSum);
      testSums.push(Math.round(baseFinishSum * 0.8));
      testSums.push(Math.round(baseFinishSum * 1.2));
    }
    
    // Убираем дубликаты и сортируем
    const uniqueSums = [...new Set(testSums)].sort((a, b) => a - b);
    
    let bestGO = null;
    let bestScore = Infinity;
    
    for (const testSum of uniqueSums) {
      if (testSum < 100000 || testSum > 500000) continue; // Проверяем диапазон
      
      const goRate = moyaTariff.go.pack.find(r => testSum >= r.min && testSum <= r.max);
      if (goRate) {
        const goPremium = Math.round(testSum * goRate.rate * 100) / 100;
        const diff = Math.abs(goPremium - remainingIncrease);
        
        // Оценка равномерности: предпочитаем суммы близкие к базовой или меньше
        const uniformityPenalty = testSum > baseFinishSum ? (testSum - baseFinishSum) / baseFinishSum * 1500 : 0;
        // Оценка точности
        const accuracyScore = diff;
        // Комбинированная оценка
        const combinedScore = accuracyScore + uniformityPenalty;
        
        if (combinedScore < bestScore && goPremium <= remainingIncrease + 1000) {
          bestGO = {
            sum: Math.round(testSum),
            premium: goPremium
          };
          bestScore = combinedScore;
        }
      }
    }
    
    if (bestGO) {
      risks.push({
        name: 'Моя квартира',
        objects: 'гражданская ответственность',
        sum: bestGO.sum,
        premium: bestGO.premium
      });
      totalPremium += bestGO.premium;
    }
  }

  if (risks.length === 0) return null;

  return {
    risks: risks,
    totalPremium: totalPremium
  };
}

// Выбор более дорогого пакета для "Экспресс квартира"
function upgradeExpressPack(neededIncrease) {
  const packs = window.EXPRESS_PACKS;
  if (!packs || packs.length === 0) return null;

  // Сортируем пакеты по цене
  const sortedPacks = [...packs].sort((a, b) => a.noGo - b.noGo);
  
  // Находим пакет, который увеличит премию примерно на neededIncrease
  // Начинаем с минимального пакета (550) и ищем подходящий
  const minPack = sortedPacks[0];
  const targetPremium = minPack.noGo + neededIncrease;
  
  // Находим пакет с ценой ближайшей к целевой
  let bestPack = minPack;
  let bestDiff = Math.abs(minPack.noGo - targetPremium);
  
  for (const pack of sortedPacks) {
    const diff = Math.abs(pack.noGo - targetPremium);
    if (diff < bestDiff && pack.noGo >= minPack.noGo) {
      bestPack = pack;
      bestDiff = diff;
    }
  }

  return {
    premium: bestPack.noGo,
    pack: bestPack
  };
}

// Получение деталей доп. риска для вывода
function getAdditionalRiskDetails(product, data, insuranceAmount, premium, additionalRisks = [], packDetails = null) {
  // Личные вещи не требует T_BASTION и др.
  if (product !== 'lichnie_veschi' && (!window.T_BASTION || !window.EXPRESS_PACKS || !window.EXPRESS_GO_PACKS || !window.T_MOYA)) {
    return { objects: '', sum: '' };
  }

  switch (product) {
    case 'bastion': {
      // Для Бастиона с увеличенными суммами не показываем основной продукт,
      // только дополнительные риски (отделка + конструктив)
      if (additionalRisks && additionalRisks.length > 0) {
        return { objects: '', sum: '' }; // Не показываем основной продукт
      }

      // Базовая логика - отделка
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

      // Если есть packDetails, используем его, иначе минимальный пакет
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
        // Исправлено: теперь поддерживаем суммы до 999999 (включительно) для второго диапазона
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
      
      // Если страховая сумма меньше минимума, используем минимум
      // Если страховая сумма больше минимума, используем процент от суммы, но не меньше минимума
      // Для равномерности используем разумный процент, не слишком большой
      let finishSum;
      if (insuranceAmount < finishMin) {
        // Если страховая сумма меньше минимума, используем минимум (если он не превышает максимум)
        finishSum = Math.min(finishMin, finishMax);
      } else if (insuranceAmount > 5000000) {
        // Для больших сумм используем меньший процент (5%), но не больше чем минимум * 3 для равномерности
        const maxReasonable = finishMin * 3; // Максимально разумная сумма для равномерности
        finishSum = Math.min(finishMax, Math.min(maxReasonable, Math.max(finishMin, insuranceAmount * 0.05)));
      } else {
        // Для обычных сумм используем 10% от страховой суммы, но не меньше минимума
        // И не больше чем минимум * 3 для равномерности
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
        // Исправлено: теперь поддерживаем суммы до 999999 (включительно) для второго диапазона
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

// Продукт "Личные вещи" - мобильная техника, ручная кладь, верхняя одежда, спортинвентарь
// variant: 1-5, riskCombo: 'povrezhd'|'tipovye'|'all'
function calculateLichnieVeshchi(variant, riskCombo) {
  const packs = window.LICHNIE_VESHCHI_PACKS;
  if (!packs) return null;
  const pack = packs.find(p => p.id === variant) || packs[0];
  let premium = 0;
  if (riskCombo === 'povrezhd') premium = pack.povrezhd;
  else if (riskCombo === 'tipovye') premium = pack.tipovye;
  else premium = pack.all; // 'all' по умолчанию
  return { pack, premium, sum: pack.sum };
}
window.calculateLichnieVeshchi = calculateLichnieVeshchi;
