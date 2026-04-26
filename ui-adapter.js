// ui-adapter.js

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("calculate-btn");
  const input = document.getElementById("input-area");

  btn.addEventListener("click", async () => {
    const raw = input.value.trim();

    // Проверка на пустой запрос
    if (raw.length < 5) {
      displayPremiumOutput("<b>Ошибка:</b> Пожалуйста, введите корректный запрос.");
      return;
    }

    try {
      const result = await handleClientRequest(raw);
      displayPremiumOutput(result);
    } catch (e) {
      displayPremiumOutput("<b>Ошибка:</b><br>" + e.message);
    }
  });
});

// Функция для отображения результата
function displayPremiumOutput(text) {
  const outputElement = document.getElementById('gptResponse');
  outputElement.innerHTML = text;
}
