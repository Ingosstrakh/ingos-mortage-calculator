// Подключаем функцию из openai.js
async function handleClientRequest(clientText) {
  if (!clientText || clientText.trim().length === 0) {
    return 'Пожалуйста, введите запрос для расчета.';
  }

  // Получаем ответ от GPT-5 mini
  const gptResponse = await askGPT5Mini(clientText);

  // Если GPT-5 mini говорит, что не хватает данных, задаем уточняющие вопросы
  if (gptResponse.includes("не хватает данных")) {
    return `${gptResponse}\nПожалуйста, уточните:\n- Какой пол и дата рождения заемщика?`;
  }

  // Возвращаем ответ от GPT-5 mini
  return gptResponse;
}

// Функция для расчета страховки жизни
function calculateLife(age, gender, bank, sumInsured, loss = false) {
  let tariff;

  if (bank === "Дом РФ") {
    tariff = window.LIFE_TARIFF_DOMRF[gender][age];
  } else if (bank === "РСХБ" && loss === true) {
    tariff = window.LIFE_TARIFF_RSHB_LOSS[gender][age];
  } else {
    tariff = window.LIFE_TARIFF_BASE[gender][age];
  }

  return Math.round((sumInsured * tariff) / 100);
}

// Функция для расчета имущества
function calculateProperty(bank, objectType, material, creditSum, discountAllowed) {
  const propertyTariff = window.getPropertyTariff(bank, objectType, material);

  let tariff = propertyTariff;

  if (discountAllowed) {
    tariff *= 0.9; // Скидка 10%
  }

  return Math.round((creditSum * tariff) / 100);
}

// Главная функция расчета
function calculateInsurance(data) {
  const bank = data.bank;
  const cfg = window.BANKS[bank]; // <-- ссылка только через window

  let fullSum = data.sum;

  // Надбавка
  if (cfg.add_percent > 0) {
    fullSum = Math.round(fullSum * (1 + cfg.add_percent / 100));
  }

  // Страхование жизни
  let life = calculateLife(
    data.age,
    data.gender,
    bank,
    fullSum,
    data.loss
  );

  // Скидка 25%
  if (cfg.allow_discount_life && data.discount_life) {
    life = Math.round(life * 0.75);
  }

  // Имущество
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

// Экспортируем функцию
window.calculateInsurance = calculateInsurance;
