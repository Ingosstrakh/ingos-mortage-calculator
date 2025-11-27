// Функция для выполнения ипотечного расчета
function calculateLoan(loanAmount, interestRate, years) {
  const monthlyRate = interestRate / 12 / 100;
  const numberOfPayments = years * 12;
  const monthlyPayment = loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
  return monthlyPayment;
}

// Основная функция для обработки запроса клиента
async function handleClientRequest(clientText) {
  // Формируем запрос для GPT-5 nano с использованием имеющихся данных
  const context = `
    Вопрос: ${clientText}
    Банки и тарифы:
    ВТБ РТ: жизнь 5000, имущество 4000, титул 3000.
    Сбербанк: жизнь 4500, имущество 3800, титул 2900.
    Тинькофф: жизнь 4800, имущество 3900, титул 3100.
  `;

  const gptResponse = await askGPT5Nano(context); // Отправляем запрос в GPT-5 nano

  // Логируем ответ от GPT-5
  console.log("Ответ от GPT-5:", gptResponse);

  // Если GPT ответил, выводим расчет
  document.getElementById('result').innerText = gptResponse;
}

// Обработчик события для отправки данных
document.getElementById('calculateButton').addEventListener('click', function() {
  const userInput = document.getElementById('userInput').value;  // Получаем введенный текст
  handleClientRequest(userInput);  // Обрабатываем запрос пользователя
});
