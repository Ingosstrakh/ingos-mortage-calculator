// calculator_v2.js

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
  // В данном случае мы ожидаем, что GPT-Neo вернет параметры для расчета
  const loanAmount = extractNumber(gptResponse, 'сумма кредита'); // Пример извлечения суммы кредита
  const interestRate = extractNumber(gptResponse, 'ставка');  // Пример извлечения ставки
  const years = extractNumber(gptResponse, 'лет');  // Пример извлечения срока

  if (!loanAmount || !interestRate || !years) {
    return "Недостаточно данных для расчета. Пожалуйста, уточните запрос.";
  }

  // Выполняем расчет ипотечного платежа
  const monthlyPayment = calculateLoan(loanAmount, interestRate, years);

  return `Ежемесячный платеж по ипотеке: ${monthlyPayment.toFixed(2)} рублей.`;
}

// Функция для извлечения числовых данных из текста
function extractNumber(text, keyword) {
  const regex = new RegExp(`(${keyword})\\s*(\\d+([\\.,]\\d+)?)`);
  const match = text.match(regex);
  if (match) {
    return parseFloat(match[2].replace(',', '.')); // Возвращаем число
  }
  return null; // Если не нашли, возвращаем null
}
