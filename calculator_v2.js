// Функция для выполнения ипотечного расчета
function calculateLoan(loanAmount, interestRate, years) {
  const monthlyRate = interestRate / 12 / 100;
  const numberOfPayments = years * 12;
  const monthlyPayment = loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
  return monthlyPayment;
}

// Основная функция для обработки запроса клиента
async function handleClientRequest(clientText) {
  // Отправляем запрос в GPT-Neo для извлечения данных из текста
  const gptResponse = await askGPTNeo(clientText);

  // Логируем ответ от GPT-Neo для диагностики
  console.log("Ответ от GPT-Neo:", gptResponse);

  // Пример обработки запроса с извлечением данных
  const loanAmount = extractNumber(gptResponse, 'сумма кредита'); // Пример извлечения суммы кредита
  const interestRate = extractNumber(gptResponse, 'ставка');  // Пример извлечения ставки
  const years = extractNumber(gptResponse, 'лет');  // Пример извлечения срока
  const risk = extractRisk(gptResponse);  // Пример извлечения риска (жизнь, имущество, титул)
  const bank = extractBank(gptResponse);  // Пример извлечения банка

  if (!loanAmount || !interestRate || !years || !risk || !bank) {
    return "Недостаточно данных для расчета. Пожалуйста, уточните запрос.";
  }

  // Выполняем расчет ипотечного платежа
  const finalTariff = await calculateTariff(bank, risk, loanAmount, interestRate, years);

  return `Ежемесячный платеж по ипотеке для банка ${bank} (${risk}): ${finalTariff.toFixed(2)} рублей.`;
}

// Функция для извлечения числовых данных из текста
function extractNumber(text, keyword) {
  // Убедимся, что text это строка
  if (typeof text !== 'string') {
    text = String(text); // Преобразуем в строку
  }

  const regex = new RegExp(`(${keyword})\\s*(\\d+([\\.,]\\d+)?)`);
  const match = text.match(regex);
  
  if (match) {
    return parseFloat(match[2].replace(',', '.')); // Возвращаем число
  }
  return null; // Если не нашли, возвращаем null
}

// Функция для извлечения риска (жизнь, имущество, титул)
function extractRisk(text) {
  const riskRegex = /\bжизнь\b|\bимущ\b|\bтитул\b/i;
  const match = text.match(riskRegex);
  return match ? match[0] : null;
}

// Функция для извлечения банка
function extractBank(text) {
  const bankRegex = /(\bВТБ\b|\bДом\.РФ\b|\bЮникредит\b)/i;
  const match = text.match(bankRegex);
  return match ? match[0] : null;
}

// Функция для расчета тарифов с учетом банка, риска, суммы, ставки и срока
async function calculateTariff(bank, risk, loanAmount, interestRate, years) {
  let tariff = 0;
  let discount = 0;

  // Определяем тарифы на основе риска и банка
  if (risk === 'жизнь') {
    tariff = LIFE_TARIFF_BASE.m[loanAmount] || LIFE_TARIFF_DOMRF.m[loanAmount]; // Пример для жизни
  } else if (risk === 'имущ') {
    tariff = PROPERTY_TARIFFS.base.flat; // Тариф на имущество
  } else if (risk === 'титул') {
    tariff = TITLE_TARIFFS.base.flat; // Тариф на титул (пример)
  }

  // Применяем скидку для определенного банка
  const bankData = BANKS[bank];
  if (bankData && bankData.allow_discount_life) {
    discount = tariff * 0.1; // Пример скидки 10%
  }

  // Рассчитываем итоговый тариф
  const finalTariff = tariff - discount;
  return finalTariff;
}

// Функция для отправки запроса в GPT-5Nano через Puter
async function askGPTNeo(question) {
  try {
    const response = await puter.ai.chat(question, { model: "gpt-5-nano" });
    return response;  // Ответ от модели
  } catch (e) {
    console.error("Ошибка при запросе к Puter:", e);
    return "Ошибка при получении ответа.";
  }
}
