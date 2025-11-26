// ui-adapter.js
// Премиальная визуализация и безопасное подключение событий

// Ждём полной загрузки DOM
document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("input-area");
    const button = document.getElementById("calculate-btn");
    const output = document.getElementById("output");

    if (!input || !button || !output) {
        console.error("UI elements not found");
        return;
    }

    // Анимация плавного появления
    function fadeInElement(el) {
        el.style.opacity = "0";
        el.style.transform = "translateY(10px)";
        el.style.transition = "0.45s ease";
        setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
        }, 20);
    }

    function flashSuccess(el) {
        el.style.boxShadow = "0 0 18px rgba(75,163,255,0.6)";
        setTimeout(() => el.style.boxShadow = "none", 600);
    }

    function flashError(el) {
        el.style.boxShadow = "0 0 18px rgba(255,80,80,0.7)";
        setTimeout(() => el.style.boxShadow = "none", 600);
    }

    function displayPremiumOutput(text) {
        output.innerHTML = "";
        fadeInElement(output);
        setTimeout(() => {
            output.innerHTML = text.replace(/\n/g, "<br>");
            flashSuccess(output);
        }, 80);
    }

    // ОБРАБОТЧИК КНОПКИ
    button.addEventListener("click", () => {

        const text = input.value.trim();

        if (text.length < 5) {
            flashError(input);
            displayPremiumOutput("<b>Ошибка:</b> введите корректные данные.");
            return;
        }

        try {
            const parsed = parseClientText(text);   // из parser.js
            const result = calculateInsurance(parsed); // из calculator.js

            displayPremiumOutput(result);
        }
        catch (err) {
            displayPremiumOutput("<b>Ошибка анализа:</b><br>" + err.message);
        }
    });

    console.log("UI адаптер успешно инициализирован");
});
