// calculator-variant2-ui.js - UI конструктор для варианта 2

/**
 * Утилиты форматирования
 */
function formatMoneyRuGrouped(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Создание модального окна конструктора варианта 2
 */
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

/**
 * Получение тарифа по сумме
 */
function getMoyaRateBySum(table, sum) {
  if (!table || !Array.isArray(table)) return null;
  const s = Number(sum);
  return table.find(r => s >= r.min && s <= r.max) || null;
}

/**
 * Получение лимитов для "Моя квартира"
 */
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

/**
 * Расчет премий "Моя квартира"
 */
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

/**
 * Ограничение процента скидки
 */
function clampDiscountPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(50, Math.round(n)));
}

/**
 * Расчет базовых премий варианта 2
 */
function computeVariant2BasePremiums(parsedData, bankConfig, insuranceAmount, discountPercentOverride = null) {
  let propertyPremiumV2 = 0;
  let lifePremiumV2 = 0;
  let titlePremiumV2 = 0;

  const MIN_PREMIUM_PROPERTY = 600;
  const MIN_PREMIUM_LIFE = 600;

  // ВАЖНО: только для Сбербанка можно менять скидку (0-50%)
  // Для всех остальных банков скидка фиксированная 30%
  // НО: если банк запрещает скидки (allow_discount_* = false), то скидки не применяются вообще
  const isSberbank = bankConfig && bankConfig.bankName === 'Сбербанк';
  let discountPercent;
  
  if (isSberbank && discountPercentOverride !== null) {
    // Для Сбербанка используем переданную скидку (0-50%)
    discountPercent = clampDiscountPercent(discountPercentOverride);
  } else {
    // Для всех остальных банков фиксированная скидка 30%
    discountPercent = null; // null означает использовать стандартную скидку 30%
  }
  
  const discountMultiplier = discountPercent === null ? 0.7 : (1 - discountPercent / 100);

  // ИМУЩЕСТВО
  if (parsedData.risks.property) {
    const propertyResult = calculatePropertyInsurance(parsedData, bankConfig, insuranceAmount);
    if (propertyResult) {
      if (bankConfig.allow_discount_property) {
        // Скидки разрешены - применяем
        const basePremium = propertyResult.totalWithoutDiscount;
        propertyPremiumV2 = round2(basePremium * discountMultiplier);
        propertyPremiumV2 = Math.max(propertyPremiumV2, MIN_PREMIUM_PROPERTY);
      } else {
        // Скидки запрещены (например, ДомРФ) - используем полную цену
        propertyPremiumV2 = propertyResult.totalWithoutDiscount || propertyResult.total;
      }
    }
  }

  // ЖИЗНЬ
  if (parsedData.risks.life) {
    const lifeResult = calculateLifeInsurance(parsedData, bankConfig, insuranceAmount);
    if (lifeResult) {
      let hasAgeRestrictionForSberbank = false;
      if (bankConfig && bankConfig.bankName === 'Сбербанк' && parsedData.borrowers && parsedData.borrowers.length > 0) {
        hasAgeRestrictionForSberbank = parsedData.borrowers.some(b => b.age >= 55);
      }

      const canApplyV2LifeDiscount = bankConfig.allow_discount_life &&
        !lifeResult.requiresMedicalExam &&
        lifeResult.medicalUnderwritingFactor !== 1.25 &&
        !hasAgeRestrictionForSberbank;

      if (canApplyV2LifeDiscount) {
        if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
          if (discountPercent === null) {
            // Используем стандартную скидку 30% (premiumWithDiscount)
            lifePremiumV2 = round2(lifeResult.borrowers.reduce((sum, b) => sum + (Number(b.premiumWithDiscount ?? b.premium) || 0), 0));
          } else {
            // Для Сбербанка: пересчитываем с кастомной скидкой
            lifePremiumV2 = round2(lifeResult.borrowers.reduce((sum, b) => {
              const basePrem = Number(b.premium) || 0;
              const discounted = round2(basePrem * discountMultiplier);
              return sum + Math.max(discounted, MIN_PREMIUM_LIFE);
            }, 0));
          }
        } else {
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
        // Используем стандартную скидку (уже применена в calculateTitleInsurance)
        titlePremiumV2 = round2(Number(titleResult.total) || 0);
      } else {
        // Для Сбербанка: пересчитываем с кастомной скидкой
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

/**
 * Рендеринг HTML для варианта 2
 */
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

  if (titlePremiumV2 > 0) html += `<br>титул ${formatMoneyRuGrouped(titlePremiumV2)}<br>`;

  return html;
}

/**
 * Открытие конструктора варианта 2
 */
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

  const byObjects = Object.fromEntries((ctx.variant2Meta.additionalRisks || []).map(r => [r.objects, r]));
  const finishDefault = byObjects['отделка и инженерное оборудование']?.sum ?? limits.finish.min;
  const movableDefault = byObjects['движимое имущество']?.sum ?? limits.movable.min;
  const goDefault = byObjects['гражданская ответственность']?.sum ?? limits.go.min;

  const state = ctx.variant2CustomState || {
    insuranceAmount,
    // Только для Сбербанка можно менять скидку (0-50%)
    // Для остальных банков скидка фиксированная 30% (null = использовать стандартную)
    discountPercent: isSberbank ? 30 : null,
    finishEnabled: Boolean(byObjects['отделка и инженерное оборудование']),
    movableEnabled: Boolean(byObjects['движимое имущество']),
    goEnabled: Boolean(byObjects['гражданская ответственность']),
    finishSum: finishDefault,
    movableSum: movableDefault,
    goSum: goDefault
  };
  ctx.variant2CustomState = state;

  const discountSection = modal.querySelector('#variant2-discount-section');
  const discountInput = modal.querySelector('#variant2-discount');
  if (isSberbank) {
    discountSection.style.display = 'grid';
    discountInput.value = String(clampDiscountPercent(state.discountPercent) ?? 30);
  } else {
    discountSection.style.display = 'none';
    state.discountPercent = null;
  }

  modal.querySelector('#variant2-finish-limits').textContent = `лимит: ${limits.finish.min.toLocaleString('ru-RU')} - ${limits.finish.max.toLocaleString('ru-RU')} ₽`;
  modal.querySelector('#variant2-movable-limits').textContent = `лимит: ${limits.movable.min.toLocaleString('ru-RU')} - ${limits.movable.max.toLocaleString('ru-RU')} ₽`;
  modal.querySelector('#variant2-go-limits').textContent = `лимит: ${limits.go.min.toLocaleString('ru-RU')} - ${limits.go.max.toLocaleString('ru-RU')} ₽`;

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
    const prevInsAmount = state.insuranceAmount;
    const prevDiscountPercent = state.discountPercent;
    
    state.insuranceAmount = ins;

    if (isSberbank) {
      // Только для Сбербанка можно менять скидку
      state.discountPercent = clampDiscountPercent(discountInput.value);
      if (state.discountPercent === null) state.discountPercent = 30;
      discountInput.value = String(state.discountPercent);
    } else {
      // Для всех остальных банков скидка фиксированная 30% (null)
      state.discountPercent = null;
    }

    state.finishEnabled = modal.querySelector('#variant2-finish-enabled').checked;
    state.movableEnabled = modal.querySelector('#variant2-movable-enabled').checked;
    state.goEnabled = modal.querySelector('#variant2-go-enabled').checked;
    state.finishSum = Number(modal.querySelector('#variant2-finish-sum').value) || 0;
    state.movableSum = Number(modal.querySelector('#variant2-movable-sum').value) || 0;
    state.goSum = Number(modal.querySelector('#variant2-go-sum').value) || 0;

    // ВАЖНО: пересчитываем базу ТОЛЬКО если изменилась страховая сумма или скидка
    // При изменении только галочек доп. рисков база НЕ должна меняться
    let baseNow;
    const needRecalcBase = (ins !== prevInsAmount) || (state.discountPercent !== prevDiscountPercent);
    
    if (needRecalcBase) {
      // Пересчитываем базу при изменении страховой суммы или скидки
      baseNow = computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, ins, state.discountPercent);
      // Сохраняем новую базу в контекст
      ctx.variant2Meta.base = baseNow;
    } else {
      // Используем сохраненную базу (не пересчитываем)
      baseNow = ctx.variant2Meta.base || computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, ins, state.discountPercent);
    }
    
    const custom = computeMoyaPremiums(ins, state);

    const premByObj = Object.fromEntries(custom.risks.map(r => [r.objects, r.premium]));
    modal.querySelector('#variant2-finish-prem').textContent = state.finishEnabled ? formatMoneyRuGrouped(premByObj['отделка и инженерное оборудование'] || 0) : '0,00';
    modal.querySelector('#variant2-movable-prem').textContent = state.movableEnabled ? formatMoneyRuGrouped(premByObj['движимое имущество'] || 0) : '0,00';
    modal.querySelector('#variant2-go-prem').textContent = state.goEnabled ? formatMoneyRuGrouped(premByObj['гражданская ответственность'] || 0) : '0,00';

    const total = round2(baseNow.propertyPremiumV2 + baseNow.lifePremiumV2 + baseNow.titlePremiumV2 + custom.totalPremium);
    modal.querySelector('#variant2-total').textContent = `${formatMoneyRuGrouped(total)} ₽`;
    modal.querySelector('#variant2-base').textContent = `база (имущество + жизнь + титул): ${formatMoneyRuGrouped(baseNow.propertyPremiumV2 + baseNow.lifePremiumV2 + baseNow.titlePremiumV2)} ₽, доп. риски: ${formatMoneyRuGrouped(custom.totalPremium)} ₽`;

    const diff = round2((ctx.variant1Total || 0) - total);
    if (Number.isFinite(diff) && diff <= 0) {
      setWarning('Внимание: после настройки вариант 2 стал дороже или равен варианту 1');
    } else {
      setWarning(custom.warning || '');
    }

    ctx.variant2Meta = {
      ...ctx.variant2Meta,
      insuranceAmount: ins,
      discountPercent: state.discountPercent,
      base: baseNow,
      additionalRisks: custom.risks,
      total: total
    };
  };

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

      ctx.insuranceAmount = meta.insuranceAmount;
      window.closeVariant2Constructor();
    });
  }

  refresh();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

/**
 * Закрытие конструктора варианта 2
 */
window.closeVariant2Constructor = function closeVariant2Constructor() {
  const modal = document.getElementById('variant2-constructor-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
};

// Экспортируем вспомогательные функции
window.formatMoneyRuGrouped = formatMoneyRuGrouped;
window.round2 = round2;
window.computeVariant2BasePremiums = computeVariant2BasePremiums;
window.computeMoyaPremiums = computeMoyaPremiums;
window.renderVariant2RisksHtml = renderVariant2RisksHtml;
