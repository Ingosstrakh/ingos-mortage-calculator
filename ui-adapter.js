document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("calculate-btn");
  const input = document.getElementById("input-area");

  btn.addEventListener("click", async () => {
    const raw = input.value.trim();

    if (raw.length < 5) {
      flashError(input);
      displayPremiumOutput("<b>Ошибка:</b> введите корректный текст клиента.");
      return;
    }

    try {
      // Отправляем запрос к GPT-5 mini и получаем ответ
      const gptResponse = await handleClientRequest(raw);

      // Выводим ответ или вопрос от GPT-5 mini
      displayPremiumOutput(gptResponse);
    } catch (e) {
      displayPremiumOutput("<b>Ошибка:</b><br>" + e.message);
    }
  });

  console.log("UI адаптер успешно инициализирован");
});
