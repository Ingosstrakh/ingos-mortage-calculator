// calculator.js
// Главный модуль расчёта премии

// Достаём глобальные данные
const BANKS = window.BANKS;
const LIFE_TARIFF_BASE = window.LIFE_TARIFF_BASE;
const LIFE_TARIFF_DOMRF = window.LIFE_TARIFF_DOMRF;
const LIFE_TARIFF_RSHB_LOSS = window.LIFE_TARIFF_RSHB_LOSS;
const getPropertyTariff = window.getPropertyTariff;

// Расчёт страховки по жизни
function calculateLife(age, gender, bank, sumInsured, loss = false) {
    let tariff;

    if (bank === "Дом РФ") {
        tariff = LIFE_TARIFF_DOMRF[gender][age];
    } else if (bank === "РСХБ" && loss === true) {
        tariff = LIFE_TARIFF_RSHB_LOSS[gender][age];
    } else {
        tariff = LIFE_TARIFF_BASE[gender][age];
    }

    const premium = (sumInsured * tariff) / 100;
    return Math.round(premium);
}

// Расчёт имущества
function calculateProperty(bank, objectType, material, creditSum, discountAllowed) {
    const propertyTariff = getPropertyTariff(bank, objectType, material);

    let tariff = propertyTariff;

    if (discountAllowed) {
        tariff *= 0.9;
    }

    return Math.round((creditSum * tariff) / 100);
}

// Главная функция
function calculateInsurance(data) {
    const bank = data.bank;
    const cfg = BANKS[bank];

    let fullSum = data.sum;

    if (cfg.add_percent > 0) {
        fullSum = Math.round(fullSum * (1 + cfg.add_percent / 100));
    }

    let life = calculateLife(
        data.age,
        data.gender,
        bank,
        fullSum,
        data.loss
    );

    if (cfg.allow_discount_life && data.discount_life) {
        life = Math.round(life * 0.75);
    }

    const property = calculateProperty(
        bank,
        data.objectType,
        data.material,
        data.sum,
        cfg.allow_discount_property && data.discount_property
    );

    return `
<b>Банк:</b> ${bank}<br>
<b>Возраст:</b> ${data.age}<br>
<b>Пол:</b> ${data.gender}<br>
<b>Страховая сумма:</b> ${fullSum.toLocaleString()} ₽<br><br>

<b>Страхование жизни:</b> ${life.toLocaleString()} ₽<br>
<b>Имущество:</b> ${property.toLocaleString()} ₽<br><br>

<b>ИТОГО:</b> ${(life + property).toLocaleString()} ₽
`;
}

// Экспорт в глобальную область
window.calculateInsurance = calculateInsurance;
