// calculator_v2.js

// Пример функции для расчета страхования жизни
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

// Пример функции для расчета имущества
function calculateProperty(bank, objectType, material, creditSum, discountAllowed) {
  const propertyTariff = window.getPropertyTariff(bank, objectType, material);

  let tariff = propertyTariff;

  if (discountAllowed) {
    tariff *= 0.9; // Скидка 10%
  }

  return Math.round((creditSum * tariff) / 100);
}

// Функция для выполнения расчетов
async function handleClientRequest(clientText) {
  // Отправляем запрос к GPT-5 mini
  const gptResponse = await askGPT5Mini(clientText);

  // Логируем ответ от GPT-5 mini для диагностики
  console.log("Ответ от GPT-5 mini:", gptResponse);

  // Если GPT-5 mini говорит, что не хватает данных, задаем уточняющие вопросы
  if (gptResponse.includes("не хватает данных")) {
    return `${gptResponse}\nПожалуйста, уточните:\n- Какой пол и дата рождения заемщика?`;
  }

  // Возвращаем результат
  return gptResponse;
}

window.calculateInsurance = handleClientRequest;
