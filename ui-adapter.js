document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("calculate-btn");
  const input = document.getElementById("input-area");

  btn.addEventListener("click", async () => {
    const raw = input.value.trim();

    // Проверка на пустой ввод
    if (raw.length < 5) {
      // Если введенный текст слишком короткий или пустой, выводим ошибку
      displayPremiumOutput("<b>Ошибка:</b> Пожалуйста, введите корректный запрос.");
      return;
    }

    try {
      // Отправляем запрос к GPT-5 mini и получаем ответ
      const gptResponse = await handleClientRequest(raw);

      // Выводим ответ от GPT-5 mini в элемент
      displayPremiumOutput(gptResponse);
    } catch (e) {
      // Если произошла ошибка, выводим ее в интерфейсе
      displayPremiumOutput("<b>Ошибка:</b><br>" + e.message);
    }
  });

  console.log("UI адаптер успешно инициализирован");
});

// Функция для отображения результата в UI
function displayPremiumOutput(text) {
  const outputElement = document.getElementById('gptResponse');
  outputElement.innerHTML = text;
}
