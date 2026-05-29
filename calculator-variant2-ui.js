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
          <div style="font-weight:700; font-size:16px;">Конструктор варианта 2</div>
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
          <div style="font-size:12px; color:#6b7280;">Сбербанк: 30-50%, остальные банки: 0-30%.</div>
        </div>

        <div style="display:grid; gap:8px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fafafa;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:600;">Страховая сумма (для пересчета)</div>
            <input id="variant2-ins-amount" type="number" min="0" step="1" style="width:220px; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
          </div>
          <div style="font-size:12px; color:#6b7280;">Это what-if пересчет. Исходный текст клиента не меняется.</div>
        </div>

        <div id="variant2-lichnie-veschi-section" style="display:none; gap:10px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fafafa;">
          <div style="font-weight:600;">Доп. продукт: Личные вещи</div>

          <div style="display:grid; gap:10px;">
            <div style="display:grid; grid-template-columns: 1fr 220px; gap:10px; align-items:center;">
              <div style="font-weight:600;">Вариант</div>
              <select id="variant2-lv-pack" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;"></select>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 220px; gap:10px; align-items:center;">
              <div style="font-weight:600;">Набор рисков</div>
              <select id="variant2-lv-risk" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
                <option value="povrezhd">ПДТЛ + Повреждения по неосторожности</option>
                <option value="tipovye">ПДТЛ + Типовые риски</option>
                <option value="all">ПДТЛ + Повреждения + Типовые (все риски)</option>
              </select>
            </div>

            <div style="display:grid; gap:6px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; background:#fff;">
              <div style="display:flex; justify-content:space-between; gap:10px;">
                <span style="color:#6b7280;">Страховая сумма:</span>
                <span id="variant2-lv-sum" style="font-weight:600;"></span>
              </div>
              <div style="display:flex; justify-content:space-between; gap:10px;">
                <span style="color:#6b7280;">ПДТЛ + Повреждения:</span>
                <span id="variant2-lv-povrezhd"></span>
              </div>
              <div style="display:flex; justify-content:space-between; gap:10px;">
                <span style="color:#6b7280;">ПДТЛ + Типовые:</span>
                <span id="variant2-lv-tipovye"></span>
              </div>
              <div style="display:flex; justify-content:space-between; gap:10px;">
                <span style="color:#6b7280;">Все риски:</span>
                <span id="variant2-lv-all"></span>
              </div>
            </div>

            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
              <div id="variant2-lv-desc" style="font-size:12px; color:#6b7280;"></div>
              <div id="variant2-lv-prem" style="font-weight:700; font-variant-numeric:tabular-nums;"></div>
            </div>
          </div>
        </div>

        <div id="variant2-extra-risks-section" style="display:grid; gap:10px; padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
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
          <button type="button" id="variant2-clear-btn" style="border:1px solid #dc3545; background:#fff; color:#dc3545; border-radius:10px; padding:10px 12px; cursor:pointer;">Очистить предыдущие</button>
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

  const container = document.getElementById('variant2-constructor-modal-container') || document.body;
  container.appendChild(overlay);

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
 * Получение лимитов для "Моя квартира", "Бастион" или "Дом без забот"
 */
function getMoyaLimits(insuranceAmount, isHouse = false, isDombez = false) {
  const ins = Math.max(0, Number(insuranceAmount) || 0);

  if (isHouse && isDombez) {
    const dombez = window.T_DOMBEZ;
    if (!dombez) return null;

    const finishMin = dombez.finish?.stone?.[0]?.min ?? 200000;
    const finishMaxCfg = Math.max(...(dombez.finish?.stone || []).map(r => r.max));
    const finishMax = ins > 0 ? Math.min(finishMaxCfg, ins) : finishMaxCfg;

    const movableMin = dombez.movable?.[0]?.min ?? 100000;
    const movableMaxCfg = Math.max(...(dombez.movable || []).map(r => r.max));
    const movableMax = ins > 0 ? Math.min(movableMaxCfg, ins) : movableMaxCfg;

    const goMin = dombez.liability?.[0]?.min ?? 100000;
    const goMaxCfg = Math.max(...(dombez.liability || []).map(r => r.max));
    const goMax = ins > 0 ? Math.min(goMaxCfg, ins) : goMaxCfg;

    return {
      finish: { min: finishMin, max: finishMax },
      movable: { min: movableMin, max: movableMax },
      go: { min: goMin, max: goMax }
    };
  }

  if (isHouse) {
    const bastion = window.T_BASTION;
    if (!bastion || !bastion.house) return null;

    const finishMin = bastion.house.finish.min;
    const finishMax = ins > 0 ? Math.min(bastion.house.finish.max, ins) : bastion.house.finish.max;

    const consMin = bastion.house.cons.min;
    const consMax = ins > 0 ? Math.min(bastion.house.cons.max, ins) : bastion.house.cons.max;

    return {
      finish: { min: finishMin, max: finishMax },
      movable: { min: consMin, max: consMax },
      go: { min: 0, max: 0 }
    };
  }

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
 * Расчет премий "Моя квартира", "Бастион" или "Дом без забот"
 */
function computeMoyaPremiums(insuranceAmount, { finishEnabled, finishSum, movableEnabled, movableSum, goEnabled, goSum, material }, isHouse = false, isDombez = false) {
  const limits = getMoyaLimits(insuranceAmount, isHouse, isDombez);
  if (!limits) return { risks: [], totalPremium: 0, warning: 'Тарифы не загружены' };

  const risks = [];
  let totalPremium = 0;
  let warning = '';

  const addRisk = (name, objects, sum, premium) => {
    const p = round2(premium);
    risks.push({ name, objects, sum: Math.round(sum), premium: p });
    totalPremium += p;
  };

  if (isHouse && isDombez) {
    const dombez = window.T_DOMBEZ;
    if (!dombez) {
      return { risks: [], totalPremium: 0, warning: 'Тарифы Дом без забот не загружены' };
    }

    const mat = (material === 'wood') ? 'wood' : 'stone';

    if (finishEnabled) {
      const s0 = Number(finishSum) || 0;
      const s = Math.min(limits.finish.max, Math.max(limits.finish.min, s0));
      const rate = getMoyaRateBySum(dombez.finish?.[mat], s)?.rate;
      if (!rate) {
        warning = warning || 'Не найден тариф для отделки по указанной сумме';
      } else {
        addRisk('Дом без забот', 'отделка и инженерное оборудование', s, s * rate);
      }
    }

    if (movableEnabled) {
      const s0 = Number(movableSum) || 0;
      const s = Math.min(limits.movable.max, Math.max(limits.movable.min, s0));
      const rate = getMoyaRateBySum(dombez.movable, s)?.rate;
      if (!rate) {
        warning = warning || 'Не найден тариф для движимого имущества по указанной сумме';
      } else {
        addRisk('Дом без забот', 'движимое имущество', s, s * rate);
      }
    }

    if (goEnabled) {
      const s0 = Number(goSum) || 0;
      const s = Math.min(limits.go.max, Math.max(limits.go.min, s0));
      const rate = getMoyaRateBySum(dombez.liability, s)?.rate;
      if (!rate) {
        warning = warning || 'Не найден тариф для ГО по указанной сумме';
      } else {
        addRisk('Дом без забот', 'гражданская ответственность', s, s * rate);
      }
    }
  } else if (isHouse) {
    const bastion = window.T_BASTION;
    if (!bastion || !bastion.house) {
      return { risks: [], totalPremium: 0, warning: 'Тарифы Бастион не загружены' };
    }

    if (finishEnabled) {
      const s0 = Number(finishSum) || 0;
      const s = Math.min(limits.finish.max, Math.max(limits.finish.min, s0));
      const rate = bastion.house.finish.rate;
      addRisk('Бастион', 'отделка и инженерное оборудование', s, s * rate);
    }

    if (movableEnabled) {
      const s0 = Number(movableSum) || 0;
      const s = Math.min(limits.movable.max, Math.max(limits.movable.min, s0));
      const rate = bastion.house.cons.rate;
      addRisk('Бастион', 'конструктивные элементы', s, s * rate);
    }

    if (goEnabled) {
      warning = 'ГО не поддерживается для продукта Бастион (дома)';
    }
  } else {
    const moya = window.T_MOYA;
    if (!moya) {
      return { risks: [], totalPremium: 0, warning: 'Тарифы IFL (T_MOYA) не загружены' };
    }

    if (finishEnabled) {
      const s0 = Number(finishSum) || 0;
      const s = Math.min(limits.finish.max, Math.max(limits.finish.min, s0));
      const rate = getMoyaRateBySum(moya.finish, s)?.rate;
      if (!rate) {
        warning = warning || 'Не найден тариф для отделки (finish) по указанной сумме';
      } else {
        addRisk('Моя квартира', 'отделка и инженерное оборудование', s, s * rate);
      }
    }

    if (movableEnabled) {
      const s0 = Number(movableSum) || 0;
      const s = Math.min(limits.movable.max, Math.max(limits.movable.min, s0));
      const rate = getMoyaRateBySum(moya.movable, s)?.rate;
      if (!rate) {
        warning = warning || 'Не найден тариф для движимого имущества (movable) по указанной сумме';
      } else {
        addRisk('Моя квартира', 'движимое имущество', s, s * rate);
      }
    }

    if (goEnabled) {
      const s0 = Number(goSum) || 0;
      const s = Math.min(limits.go.max, Math.max(limits.go.min, s0));
      const rate = getMoyaRateBySum(moya.go?.pack, s)?.rate;
      if (!rate) {
        warning = warning || 'Не найден тариф для ГО (go.pack) по указанной сумме';
      } else {
        addRisk('Моя квартира', 'гражданская ответственность', s, s * rate);
      }
    }
  }

  return { risks, totalPremium: round2(totalPremium), warning };
  }

/**
 * Ограничение процента скидки
 */
function clampDiscountPercent(p, isSberbank = false) {
  const n = Number(p);
  if (!Number.isFinite(n)) return null;
  const max = isSberbank ? 50 : 30;
  return Math.max(0, Math.min(max, Math.round(n)));
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

  const isSberbank = bankConfig && bankConfig.bankName === 'Сбербанк';
  let discountPercent = clampDiscountPercent(discountPercentOverride, isSberbank);
  if (discountPercent === null) discountPercent = 30;

  const discountMultiplier = 1 - discountPercent / 100;
  const hasAgeRestriction = parsedData.borrowers && parsedData.borrowers.length > 0
    ? parsedData.borrowers.some(b => Number(b.age) >= 55)
    : false;

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
      if (
        bankConfig.allow_discount_life &&
        !lifeResult.requiresMedicalExam &&
        lifeResult.medicalUnderwritingFactor !== 1.25 &&
        !hasAgeRestriction
      ) {
        const numBorrowers = parsedData.borrowers ? parsedData.borrowers.length : 1;
        let totalWithDiscount = 0;

        if (lifeResult.borrowers && lifeResult.borrowers.length > 0) {
          lifeResult.borrowers.forEach(borrower => {
            const basePrem = Number(borrower.premium) || 0;
            totalWithDiscount += Math.max(round2(basePrem * discountMultiplier), MIN_PREMIUM_LIFE);
          });
        } else {
          const basePremium = lifeResult.totalWithoutDiscount;
          totalWithDiscount = round2(basePremium * discountMultiplier);
        }

        lifePremiumV2 = Math.max(totalWithDiscount, MIN_PREMIUM_LIFE * numBorrowers);
      } else {
        lifePremiumV2 = lifeResult.total || lifeResult.totalWithoutDiscount;
      }
    }
  }

  if (parsedData.risks.titul) {
    const withLifeInsurance = parsedData.risks.life || false;
    const titleResult = calculateTitleInsurance(
      parsedData,
      bankConfig,
      insuranceAmount,
      withLifeInsurance,
      parsedData.contractDate
    );

    if (bankConfig.allow_discount_title) {
      const baseTitle = Number(titleResult.totalWithoutDiscount || titleResult.total) || 0;
      titlePremiumV2 = Math.max(round2(baseTitle * discountMultiplier), 600);
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
  const formatKv = (premium, percent) => {
    const agentAmount = round2(Number(premium) * (percent / 100));
    const fmt = agentAmount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return ` кв - ${percent}% = агент получит по ИФЛ (${fmt})`;
  };

  const formatKv35 = premium => formatKv(premium, 35);
  const formatKv50 = premium => formatKv(premium, 50);

  let html = '';
  if (propertyPremiumV2 > 0) html += `имущество ${formatMoneyRuGrouped(propertyPremiumV2)}<br>`;
  if (lifePremiumV2 > 0) html += `жизнь заемщик ${formatMoneyRuGrouped(lifePremiumV2)}<br>`;

  if (Array.isArray(risks)) {
    risks.forEach(r => {
      const prem = Number(r.premium) || 0;
      const premFmt = prem.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const isLichnieVeshchi = String(r.name || '').toLowerCase().includes('личн');
      const kvText = isLichnieVeshchi ? formatKv50(prem) : formatKv35(prem);

      if (Number(r.sum) > 0) {
        html += `доп риск - ${r.name} (${r.objects}) на сумму ${Math.round(r.sum).toLocaleString('ru-RU')} ₽ премия ${premFmt}${kvText}<br>`;
      } else {
        html += `доп риск - ${r.name} (${r.objects}) ${premFmt}${kvText}<br>`;
      }
    });
  }

  if (titlePremiumV2 > 0) html += `<br>титул ${formatMoneyRuGrouped(titlePremiumV2)}<br>`;

  return html;
}

/**
 * Открытие конструктора варианта 2
 */
window.openVariant2Constructor = function openVariant2Constructor(forceContext = null) {
  ensureVariant2ConstructorModal();

  const sourceContext = forceContext || window.__LAST_VARIANT2_CONTEXT__;
  if (!sourceContext) return;

  const ctx = JSON.parse(JSON.stringify(sourceContext));
  const modal = document.getElementById('variant2-constructor-modal');
  if (!modal) return;

  if (!ctx || !ctx.variant2Meta || !ctx.variant2Meta.constructorSupported) {
    return;
  }

  const insuranceAmount = Number(ctx.insuranceAmount) || 0;
  const isSberbank = ctx.bankConfig && ctx.bankConfig.bankName === 'Сбербанк';

  const availableProducts = typeof window.getAvailableProducts === 'function'
    ? window.getAvailableProducts(ctx.parsedData, ctx.bankConfig, false)
    : [];

  const selectedProductFromMeta = ctx.variant2Meta?.selectedProduct || ctx.variant2Meta?.product || null;
  const isLichnieVeshchiMode =
    selectedProductFromMeta === 'lichnie_veschi' ||
    (!selectedProductFromMeta && Array.isArray(availableProducts) && availableProducts.length === 1 && availableProducts[0] === 'lichnie_veschi');

  const savedBankName = ctx.variant2CustomState?.bankName;
  const currentBankName = ctx.bankConfig?.bankName;
  if (savedBankName && savedBankName !== currentBankName) {
    ctx.variant2CustomState = null;
    if (ctx.variant2Meta) {
      ctx.variant2Meta.base = null;
    }
  }

  const isHouse = ctx.parsedData.objectType === 'house_brick' ||
                  ctx.parsedData.objectType === 'house_wood' ||
                  ctx.parsedData.objectType === 'house';
  const isDombez = isHouse && Number(ctx.parsedData.yearBuilt) >= 2020;

  const limits = (!isLichnieVeshchiMode && ctx.parsedData?.risks?.property)
    ? getMoyaLimits(insuranceAmount, isHouse, isDombez)
    : null;

  const byObjects = Object.fromEntries((ctx.variant2Meta.additionalRisks || []).map(r => [r.objects, r]));
  const finishDefault = byObjects['отделка и инженерное оборудование']?.sum ?? (limits?.finish?.min || 0);
  const movableDefault = byObjects['движимое имущество']?.sum ?? (limits?.movable?.min || 0);
  const goDefault = byObjects['гражданская ответственность']?.sum ?? (limits?.go?.min || 0);

  const material = (ctx.parsedData.material === 'wood' || ctx.parsedData.objectType === 'house_wood') ? 'wood' : 'stone';

  const defaultLvSelection = typeof window.getDefaultLichnieVeshchiSelection === 'function'
    ? window.getDefaultLichnieVeshchiSelection()
    : null;

  const existingPackId = ctx.variant2Meta?.packDetails?.pack?.id;
  const existingRiskKey = ctx.variant2Meta?.packDetails?.riskCombo;

  const state = ctx.variant2CustomState || {
    bankName: currentBankName,
    insuranceAmount,
    discountPercent: 30,
    material,
    finishEnabled: Boolean(byObjects['отделка и инженерное оборудование']),
    movableEnabled: Boolean(byObjects['движимое имущество']),
    goEnabled: Boolean(byObjects['гражданская ответственность']),
    finishSum: finishDefault,
    movableSum: movableDefault,
    goSum: goDefault,
    lvPackId: existingPackId ?? (defaultLvSelection ? defaultLvSelection.packId : ''),
    lvRiskKey: existingRiskKey ?? (defaultLvSelection ? defaultLvSelection.riskKey : 'all')
  };

  state.bankName = currentBankName;
  state.material = material;
  state.discountPercent = clampDiscountPercent(state.discountPercent, isSberbank) ?? 30;

  ctx.variant2CustomState = state;

  if (!ctx.variant2Meta.base) {
    ctx.variant2Meta.base = computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, insuranceAmount, state.discountPercent);
  }

  const discountSection = modal.querySelector('#variant2-discount-section');
  const discountInput = modal.querySelector('#variant2-discount');
  discountSection.style.display = 'grid';
  discountInput.min = isSberbank ? '30' : '0';
  discountInput.max = isSberbank ? '50' : '30';
  discountInput.value = String(state.discountPercent);

  const extraRisksSection = modal.querySelector('#variant2-extra-risks-section');
  const lichnieVeshchiSection = modal.querySelector('#variant2-lichnie-veschi-section');

  if (isLichnieVeshchiMode) {
    extraRisksSection.style.display = 'none';
    lichnieVeshchiSection.style.display = 'grid';
  } else {
    extraRisksSection.style.display = 'grid';
    lichnieVeshchiSection.style.display = 'none';
  }

  const productName = isHouse ? (isDombez ? 'Дом без забот' : 'Бастион') : 'Моя квартира';
  const movableLabel = isHouse ? (isDombez ? 'движимое имущество' : 'конструктивные элементы') : 'движимое имущество';

  const finishTitleEl = modal.querySelector('#variant2-finish-enabled').nextElementSibling.querySelector('div');
  const movableTitleEl = modal.querySelector('#variant2-movable-enabled').nextElementSibling.querySelector('div');
  const goTitleEl = modal.querySelector('#variant2-go-enabled').nextElementSibling.querySelector('div');

  finishTitleEl.textContent = `${productName}: отделка и инженерное оборудование`;
  movableTitleEl.textContent = `${productName}: ${movableLabel}`;
  goTitleEl.textContent = `${productName}: гражданская ответственность`;

  const goRow = modal.querySelector('#variant2-go-enabled').closest('div[style*="grid-template-columns"]');
  if (!isLichnieVeshchiMode && isHouse && !isDombez) {
    goRow.style.display = 'none';
  } else if (!isLichnieVeshchiMode) {
    goRow.style.display = 'grid';
  }

  if (limits) {
    modal.querySelector('#variant2-finish-limits').textContent = `лимит: ${limits.finish.min.toLocaleString('ru-RU')} - ${limits.finish.max.toLocaleString('ru-RU')} ₽`;
    modal.querySelector('#variant2-movable-limits').textContent = `лимит: ${limits.movable.min.toLocaleString('ru-RU')} - ${limits.movable.max.toLocaleString('ru-RU')} ₽`;
    modal.querySelector('#variant2-go-limits').textContent = `лимит: ${limits.go.min.toLocaleString('ru-RU')} - ${limits.go.max.toLocaleString('ru-RU')} ₽`;
  } else {
    modal.querySelector('#variant2-finish-limits').textContent = '';
    modal.querySelector('#variant2-movable-limits').textContent = '';
    modal.querySelector('#variant2-go-limits').textContent = '';
  }

  modal.querySelector('#variant2-ins-amount').value = String(Math.round(state.insuranceAmount || insuranceAmount));
  modal.querySelector('#variant2-finish-enabled').checked = !!state.finishEnabled;
  modal.querySelector('#variant2-movable-enabled').checked = !!state.movableEnabled;
  modal.querySelector('#variant2-go-enabled').checked = !!state.goEnabled;
  modal.querySelector('#variant2-finish-sum').value = String(Math.round(state.finishSum || finishDefault));
  modal.querySelector('#variant2-movable-sum').value = String(Math.round(state.movableSum || movableDefault));
  modal.querySelector('#variant2-go-sum').value = String(Math.round(state.goSum || goDefault));

  const lvPackSelect = modal.querySelector('#variant2-lv-pack');
  const lvRiskSelect = modal.querySelector('#variant2-lv-risk');
  const lvPacks = Array.isArray(window.LICHNIE_VESHCHI_PACKS) ? window.LICHNIE_VESHCHI_PACKS : [];

  lvPackSelect.innerHTML = lvPacks.map((pack, index) => {
    const value = String(pack.id ?? index);
    return `<option value="${value}">Вариант ${value}</option>`;
  }).join('');

  if (state.lvPackId !== '' && lvPackSelect.querySelector(`option[value="${String(state.lvPackId)}"]`)) {
    lvPackSelect.value = String(state.lvPackId);
  } else if (lvPacks[0]) {
    lvPackSelect.value = String(lvPacks[0].id ?? 0);
    state.lvPackId = lvPackSelect.value;
  }

  lvRiskSelect.value = state.lvRiskKey || 'all';

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

  const getLvPackById = (packId) => {
    return lvPacks.find(v => String(v.id) === String(packId)) || null;
  };

  const refresh = () => {
    const currentCtx = window.__CURRENT_CONSTRUCTOR_CTX__;
    if (!currentCtx) return;

    const currentIsSberbank = currentCtx.bankConfig && currentCtx.bankConfig.bankName === 'Сбербанк';
    const currentIsHouse = currentCtx.parsedData.objectType === 'house_brick' ||
                           currentCtx.parsedData.objectType === 'house_wood' ||
                           currentCtx.parsedData.objectType === 'house';
    const currentIsDombez = currentIsHouse && Number(currentCtx.parsedData.yearBuilt) >= 2020;

    const currentAvailableProducts = typeof window.getAvailableProducts === 'function'
      ? window.getAvailableProducts(currentCtx.parsedData, currentCtx.bankConfig, false)
      : [];

    const currentSelectedProduct = currentCtx.variant2Meta?.selectedProduct || currentCtx.variant2Meta?.product || null;
    const currentIsLichnieVeshchiMode =
      currentSelectedProduct === 'lichnie_veschi' ||
      (!currentSelectedProduct && Array.isArray(currentAvailableProducts) && currentAvailableProducts.length === 1 && currentAvailableProducts[0] === 'lichnie_veschi');

    const ins = Number(modal.querySelector('#variant2-ins-amount').value) || 0;
    const prevInsAmount = state.insuranceAmount;
    const prevDiscountPercent = state.discountPercent;

    state.insuranceAmount = ins;

    const discountInputElement = modal.querySelector('#variant2-discount');
    const inputValue = discountInputElement.value;
    let newDiscountPercent = clampDiscountPercent(inputValue, currentIsSberbank);
    if (newDiscountPercent === null) newDiscountPercent = 30;
    discountInputElement.value = String(newDiscountPercent);
    state.discountPercent = newDiscountPercent;

    state.finishEnabled = modal.querySelector('#variant2-finish-enabled').checked;
    state.movableEnabled = modal.querySelector('#variant2-movable-enabled').checked;
    state.goEnabled = modal.querySelector('#variant2-go-enabled').checked;
    state.finishSum = Number(modal.querySelector('#variant2-finish-sum').value) || 0;
    state.movableSum = Number(modal.querySelector('#variant2-movable-sum').value) || 0;
    state.goSum = Number(modal.querySelector('#variant2-go-sum').value) || 0;
    state.lvPackId = modal.querySelector('#variant2-lv-pack')?.value || '';
    state.lvRiskKey = modal.querySelector('#variant2-lv-risk')?.value || 'all';

    let baseNow;

    const insChanged = Math.abs(ins - (prevInsAmount || ins)) > 0.01;
    const discountChanged = prevDiscountPercent !== newDiscountPercent;
    const needRecalcBase = insChanged || discountChanged;

    if (needRecalcBase) {
      baseNow = computeVariant2BasePremiums(currentCtx.parsedData, currentCtx.bankConfig, ins, state.discountPercent);
      currentCtx.variant2Meta.base = baseNow;
    } else {
      baseNow = currentCtx.variant2Meta.base || computeVariant2BasePremiums(currentCtx.parsedData, currentCtx.bankConfig, ins, state.discountPercent);
    }

    let custom;
    if (currentIsLichnieVeshchiMode) {
      const lv = typeof window.calculateLichnieVeshchiBySelection === 'function'
        ? window.calculateLichnieVeshchiBySelection(state.lvPackId, state.lvRiskKey)
        : null;

      if (!lv) {
        custom = { risks: [], totalPremium: 0, warning: 'Не удалось рассчитать продукт "Личные вещи"' };
      } else {
        custom = {
          risks: [{
            name: 'Личные вещи',
            objects: lv.riskName,
            sum: Number(lv.packDetails?.pack?.sum || 0),
            premium: Number(lv.premium || 0),
            packDetails: lv.packDetails
          }],
          totalPremium: round2(Number(lv.premium || 0)),
          warning: ''
        };
      }
    } else {
      custom = computeMoyaPremiums(ins, state, currentIsHouse, currentIsDombez);
    }

    if (currentIsLichnieVeshchiMode) {
      const pack = getLvPackById(state.lvPackId);
      modal.querySelector('#variant2-lv-sum').textContent = pack ? `${Number(pack.sum || 0).toLocaleString('ru-RU')} ₽` : '—';
      modal.querySelector('#variant2-lv-povrezhd').textContent = pack ? `${Number(pack.povrezhd || 0).toLocaleString('ru-RU')} ₽` : '—';
      modal.querySelector('#variant2-lv-tipovye').textContent = pack ? `${Number(pack.tipovye || 0).toLocaleString('ru-RU')} ₽` : '—';
      modal.querySelector('#variant2-lv-all').textContent = pack ? `${Number(pack.all || 0).toLocaleString('ru-RU')} ₽` : '—';

      const risk = custom.risks[0] || null;
      modal.querySelector('#variant2-lv-desc').textContent = risk ? risk.objects : '';
      modal.querySelector('#variant2-lv-prem').textContent = `${formatMoneyRuGrouped(custom.totalPremium || 0)} ₽`;
    } else {
      modal.querySelector('#variant2-lv-sum').textContent = '';
      modal.querySelector('#variant2-lv-povrezhd').textContent = '';
      modal.querySelector('#variant2-lv-tipovye').textContent = '';
      modal.querySelector('#variant2-lv-all').textContent = '';
      modal.querySelector('#variant2-lv-desc').textContent = '';
      modal.querySelector('#variant2-lv-prem').textContent = '';

      const premByObj = Object.fromEntries(custom.risks.map(r => [r.objects, r.premium]));
      modal.querySelector('#variant2-finish-prem').textContent = state.finishEnabled ? formatMoneyRuGrouped(premByObj['отделка и инженерное оборудование'] || 0) : '0,00';
      const movableKey = (currentIsHouse && !currentIsDombez)
        ? 'конструктивные элементы'
        : 'движимое имущество';

      modal.querySelector('#variant2-movable-prem').textContent =
        state.movableEnabled ? formatMoneyRuGrouped(premByObj[movableKey] || 0) : '0,00';

      modal.querySelector('#variant2-go-prem').textContent =
        state.goEnabled ? formatMoneyRuGrouped(premByObj['гражданская ответственность'] || 0) : '0,00';
    }

    const total = round2(
      baseNow.propertyPremiumV2 +
      baseNow.lifePremiumV2 +
      baseNow.titlePremiumV2 +
      custom.totalPremium
    );

    modal.querySelector('#variant2-total').textContent = `${formatMoneyRuGrouped(total)} ₽`;
    modal.querySelector('#variant2-base').textContent =
      `база (имущество + жизнь + титул): ${formatMoneyRuGrouped(baseNow.propertyPremiumV2 + baseNow.lifePremiumV2 + baseNow.titlePremiumV2)} ₽, доп. риски: ${formatMoneyRuGrouped(custom.totalPremium)} ₽`;

    const diff = round2((currentCtx.variant1Total || 0) - total);
    if (Number.isFinite(diff) && diff <= 0) {
      setWarning('Внимание: после настройки вариант 2 стал дороже или равен варианту 1');
    } else {
      setWarning(custom.warning || '');
    }

    currentCtx.variant2Meta = {
      ...currentCtx.variant2Meta,
      constructorSupported: true,
     selectedProduct: currentIsLichnieVeshchiMode
  ? 'lichnie_veschi'
  : (currentSelectedProduct || null),
      insuranceAmount: ins,
      discountPercent: state.discountPercent,
      base: baseNow,
      additionalRisks: custom.risks,
      total: total,
      packDetails: currentIsLichnieVeshchiMode
        ? {
            pack: getLvPackById(state.lvPackId),
            riskCombo: state.lvRiskKey
          }
        : null
    };
  };

  window.__CURRENT_CONSTRUCTOR_CTX__ = ctx;

  if (modal.__wired) {
    const idsToClone = [
      '#variant2-discount',
      '#variant2-ins-amount',
      '#variant2-finish-enabled',
      '#variant2-finish-sum',
      '#variant2-movable-enabled',
      '#variant2-movable-sum',
      '#variant2-go-enabled',
      '#variant2-go-sum',
      '#variant2-lv-pack',
      '#variant2-lv-risk'
    ];

    idsToClone.forEach(sel => {
      const oldEl = modal.querySelector(sel);
      if (!oldEl || !oldEl.parentNode) return;
      const newEl = oldEl.cloneNode(true);
      oldEl.parentNode.replaceChild(newEl, oldEl);
    });

    ['#variant2-reset-btn', '#variant2-clear-btn', '#variant2-apply-btn'].forEach(sel => {
      const oldBtn = modal.querySelector(sel);
      if (!oldBtn || !oldBtn.parentNode) return;
      const newBtn = oldBtn.cloneNode(true);
      oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    });
  }

  modal.__wired = true;

  const ids = [
    '#variant2-discount',
    '#variant2-ins-amount',
    '#variant2-finish-enabled',
    '#variant2-finish-sum',
    '#variant2-movable-enabled',
    '#variant2-movable-sum',
    '#variant2-go-enabled',
    '#variant2-go-sum',
    '#variant2-lv-pack',
    '#variant2-lv-risk'
  ];

  ids.forEach(sel => {
    const el = modal.querySelector(sel);
    if (!el) return;
    el.addEventListener('input', refresh);
    el.addEventListener('change', refresh);
  });

  modal.querySelector('#variant2-reset-btn').addEventListener('click', () => {
    const currentCtx = window.__CURRENT_CONSTRUCTOR_CTX__;
    if (currentCtx) {
      currentCtx.variant2CustomState = null;
      if (currentCtx.variant2Meta) {
        currentCtx.variant2Meta.base = null;
      }
    }
    window.openVariant2Constructor(window.__CURRENT_CONSTRUCTOR_CTX__);
  });

  modal.querySelector('#variant2-clear-btn').addEventListener('click', () => {
    if (typeof window.clearPreviousResults === 'function') {
      window.clearPreviousResults();
    }
  });

  modal.querySelector('#variant2-apply-btn').addEventListener('click', () => {
    const currentCtx = window.__CURRENT_CONSTRUCTOR_CTX__;
    if (!currentCtx) return;

    const block = document.getElementById('variant2-block');
    if (!block) return;

    const meta = currentCtx.variant2Meta;
    const baseNow = meta.base || computeVariant2BasePremiums(
      currentCtx.parsedData,
      currentCtx.bankConfig,
      meta.insuranceAmount,
      meta.discountPercent
    );

    const html = renderVariant2RisksHtml(baseNow, meta.additionalRisks || []);
    const total = meta.total || round2(
      baseNow.propertyPremiumV2 +
      baseNow.lifePremiumV2 +
      baseNow.titlePremiumV2 +
      (meta.additionalRisks || []).reduce((s, r) => s + (Number(r.premium) || 0), 0)
    );

    block.innerHTML = `${html}<br>Итого тариф взнос ${formatMoneyRuGrouped(total)}`;

    currentCtx.variant2CustomState = { ...state };
    currentCtx.insuranceAmount = meta.insuranceAmount;
    window.__LAST_VARIANT2_CONTEXT__ = currentCtx;
    window.closeVariant2Constructor();
  });

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
window.getMoyaLimits = getMoyaLimits;
window.computeMoyaPremiums = computeMoyaPremiums;
window.renderVariant2RisksHtml = renderVariant2RisksHtml;
