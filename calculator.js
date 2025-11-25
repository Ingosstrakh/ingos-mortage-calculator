// calculator.js
// Полный рабочий калькулятор: имущество + жизнь + титул
// Требует рядом: config_banks.js (BANKS), tariffs_property.js (getPropertyTariff), tariffs_life.js (LIFE_TARIFF_*)

// --- загрузка модулей (поддержка браузер/Node) ---
const BANKS = (typeof window !== 'undefined' && window.BANKS) ? window.BANKS : (typeof require !== 'undefined' ? require('./config_banks.js') : null);
const PROPERTY = (typeof window !== 'undefined' && window.PROPERTY_TARIFFS) ? window.PROPERTY_TARIFFS : null;
const getPropertyTariff = (typeof window !== 'undefined' && window.getPropertyTariff) ? window.getPropertyTariff : (typeof require !== 'undefined' ? require('./tariffs_property.js').getPropertyTariff : null);
const LIFE_BASE = (typeof window !== 'undefined' && window.LIFE_TARIFF_BASE) ? window.LIFE_TARIFF_BASE : (typeof require !== 'undefined' ? require('./tariffs_life.js').LIFE_TARIFF_BASE : null);
const LIFE_DOMRF = (typeof window !== 'undefined' && window.LIFE_TARIFF_DOMRF) ? window.LIFE_TARIFF_DOMRF : (typeof require !== 'undefined' ? require('./tariffs_life.js').LIFE_TARIFF_DOMRF : null);
const LIFE_RSHB_LOSS = (typeof window !== 'undefined' && window.LIFE_TARIFF_RSHB_LOSS) ? window.LIFE_TARIFF_RSHB_LOSS : (typeof require !== 'undefined' ? require('./tariffs_life.js').LIFE_TARIFF_RSHB_LOSS : null);

if (!BANKS || !getPropertyTariff || !LIFE_BASE) {
  console.warn("calculator.js: required modules not found. Ensure config_banks.js, tariffs_property.js, tariffs_life.js are present.");
}

// --- утилиты ---
function clampAge(age) {
  return Math.max(18, Math.min(64, age));
}
function roundRub(val) {
  return Math.round(val);
}

// --- LIFE selection ---
function getLifeTariffForPerson(bankName, gender, age, rshbLossMode) {
  gender = (gender || 'm').toLowerCase().startsWith('f') ? 'f' : 'm';
  age = Math.floor(age);
  const bank = BANKS && BANKS[bankName] ? BANKS[bankName] : null;
  const model = bank && bank.lifeModel ? bank.lifeModel : 'BASE';

  if (model === 'DOMRF') {
    if (age < 21) throw new Error("DOM.RF tariff not available for age < 21");
    if (LIFE_DOMRF && LIFE_DOMRF[gender] && LIFE_DOMRF[gender][age] !== undefined) return LIFE_DOMRF[gender][age];
    if (LIFE_BASE && LIFE_BASE[gender] && LIFE_BASE[gender][age] !== undefined) return LIFE_BASE[gender][age];
    return 0;
  }

  if (model === 'RSHB') {
    if (rshbLossMode === true) {
      const idx = age - 18;
      if (!LIFE_RSHB_LOSS || !LIFE_RSHB_LOSS[gender]) return 0;
      if (idx < 0) throw new Error("RSHB loss tariff not available for age < 18");
      if (idx >= LIFE_RSHB_LOSS[gender].length) return LIFE_RSHB_LOSS[gender][LIFE_RSHB_LOSS[gender].length - 1];
      return LIFE_RSHB_LOSS[gender][idx];
    } else {
      if (LIFE_BASE && LIFE_BASE[gender] && LIFE_BASE[gender][age] !== undefined) return LIFE_BASE[gender][age];
      return 0;
    }
  }

  if (LIFE_BASE && LIFE_BASE[gender] && LIFE_BASE[gender][age] !== undefined) return LIFE_BASE[gender][age];
  return 0;
}

// --- LIFE premium calculation for one person
function calculateLifePremiumForPerson(osz, bankName, person, rshbLossMode, applyLifeDiscount25, manualMarkupPercent) {
  const bank = BANKS && BANKS[bankName] ? BANKS[bankName] : {};
  const markupPercent = bank.manualMarkup && typeof manualMarkupPercent === 'number' ? manualMarkupPercent : (bank.markup || 0);

  const tariff = getLifeTariffForPerson(bankName, person.gender, person.age, rshbLossMode);
  const share = (person.share === undefined) ? 100 : person.share;
  const insuredPercent = (person.insuredPercent === undefined) ? 100 : person.insuredPercent;
  const oszShare = osz * (share / 100) * (insuredPercent / 100);

  const base = oszShare * (tariff / 100);
  const withMarkup = base * (1 + (markupPercent / 100));
  const bankAllows = bank.allowDiscountLife !== false;
  const final = (applyLifeDiscount25 && bankAllows) ? withMarkup * 0.75 : withMarkup;
  return roundRub(final);
}

function calculateTotalLife(osz, bankName, persons, rshbLossMode, applyLifeDiscount25, manualMarkupPercent) {
  let total = 0;
  for (const p of persons) {
    total += calculateLifePremiumForPerson(osz, bankName, p, rshbLossMode, applyLifeDiscount25, manualMarkupPercent);
  }
  return roundRub(total);
}

function calculatePropertyPremium(osz, bankName, objectType, applyPropertyDiscount10, manualMarkupPercent) {
  const bank = BANKS && BANKS[bankName] ? BANKS[bankName] : {};
  const markupPercent = bank.manualMarkup && typeof manualMarkupPercent === 'number' ? manualMarkupPercent : (bank.markup || 0);

  const tariff = getPropertyTariff(bankName, (objectType === 'flat' ? 'flat' : (objectType === 'house_brick' ? 'house_brick' : 'house_wood')));
  const base = osz * (tariff / 100);
  const withMarkup = base * (1 + (markupPercent / 100));
  const bankAllows = bank.allowDiscountProperty !== false;
  const final = (applyPropertyDiscount10 && bankAllows) ? withMarkup * 0.9 : withMarkup;
  return roundRub(final);
}

function calculateTitlePremium(osz, bankName, applyPropertyDiscount10, manualMarkupPercent) {
  const bank = BANKS && BANKS[bankName] ? BANKS[bankName] : {};
  const markupPercent = bank.manualMarkup && typeof manualMarkupPercent === 'number' ? manualMarkupPercent : (bank.markup || 0);

  let baseSum = osz;
  if (bank.titleFromMarkedUpSum === true || (bank.markup && bank.markup > 0)) {
    baseSum = osz * (1 + (markupPercent / 100));
  }
  let premium = baseSum * (0.2 / 100);
  const bankAllows = bank.allowDiscountProperty !== false;
  if (applyPropertyDiscount10 && bankAllows) premium = premium * 0.9;
  return roundRub(premium);
}

function validateShares(persons, bankName) {
  if (bankName === 'ВТБ' || (BANKS[bankName] && BANKS[bankName].allowVTBSpecial === true)) return true;
  const sum = persons.reduce((s, p) => s + (p.share || 0), 0);
  return Math.abs(sum - 100) < 0.01;
}

function calculateFullPackage(params) {
  const {
    bankName, osz, objectType, persons,
    rshbLossMode = false,
    applyLifeDiscount25 = false,
    applyPropertyDiscount10 = false,
    manualMarkupPercent = undefined
  } = params;

  if (!validateShares(persons, bankName)) {
    throw new Error("Shares of co-borrowers must sum to 100% (except VTB special).");
  }

  const property = calculatePropertyPremium(osz, bankName, objectType, applyPropertyDiscount10, manualMarkupPercent);
  const life = calculateTotalLife(osz, bankName, persons, rshbLossMode, applyLifeDiscount25, manualMarkupPercent);
  const title = calculateTitlePremium(osz, bankName, applyPropertyDiscount10, manualMarkupPercent);
  const total = roundRub(property + life + title);

  return { property, life, title, total };
}

// Exports
if (typeof window !== 'undefined') {
  window.Calculator = {
    calculateFullPackage,
    calculatePropertyPremium,
    calculateLifePremiumForPerson,
    calculateTotalLife,
    calculateTitlePremium,
    validateShares
  };
}
if (typeof module !== 'undefined') {
  module.exports = {
    calculateFullPackage,
    calculatePropertyPremium,
    calculateLifePremiumForPerson,
    calculateTotalLife,
    calculateTitlePremium,
    validateShares
  };
}