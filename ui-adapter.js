// ui-adapter.js
// Премиальная визуализация и взаимодействие для калькулятора Ингосстрах

// Плавная анимация появления блока
function fadeInElement(el) {
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    el.style.transition = "0.45s ease";

    setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
    }, 20);
}

// Подсветка успешного обновления
function flashSuccess(el) {
    el.style.boxShadow = "0 0 18px rgba(75,163,255,0.6)";
    el.style.transition = "0.6s ease";

    setTimeout(() => {
        el.style.boxShadow = "none";
    }, 700);
}

// Подсветка ошибки
function flashError(el) {
    el.style.boxShadow = "0 0 18px rgba(255,80,80,0.7)";
    el.style.transition = "0.4s ease";

    setTimeout(() => {
        el.style.boxShadow = "none";
    }, 700);
}

// Премиальный вывод результата
function displayPremiumOutput(text) {
    const output = document.getElementById("output");
    output.innerHTML = "";
    fadeInElement(output);

    setTimeout(() => {
        output.innerHTML = text.replace(/\n/g, "<br>");
        flashSuccess(output);
    }, 80);
}

// Обновляем систему под твой index.html
document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".btn-primary");
    const textarea = document.getElementById("inputText");

    if (!button || !textarea) return;

    button.addEventListener("click", () => {
        const input = textarea.value.trim();

        if (input.length < 5) {
            flashError(textarea);
            displayPremiumOutput("<b>Ошибка:</b> введите корректные данные.");
            return;
        }

        try {
            const parsed = parseClientText(input);   // парсер
            const result = calculateInsurance(parsed); // калькулятор
            displayPremiumOutput(result);
        } catch (err) {
            displayPremiumOutput("<b>Ошибка анализа:</b><br>" + err.message);
        }
    });
});