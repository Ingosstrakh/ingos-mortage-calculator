// ui-adapter.js

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
    el.style.transition = "0.6s ease";
    setTimeout(() => el.style.boxShadow = "none", 700);
}

function flashError(el) {
    el.style.boxShadow = "0 0 18px rgba(255,80,80,0.7)";
    el.style.transition = "0.4s ease";
    setTimeout(() => el.style.boxShadow = "none", 700);
}

function displayPremiumOutput(text) {
    const output = document.getElementById("output");
    output.innerHTML = "";
    fadeInElement(output);

    setTimeout(() => {
        output.innerHTML = text.replace(/\n/g, "<br>");
        flashSuccess(output);
    }, 80);
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("calculate-btn");
    const input = document.getElementById("input-area");

    btn.addEventListener("click", () => {
        const raw = input.value.trim();

        if (raw.length < 5) {
            flashError(input);
            displayPremiumOutput("<b>Ошибка:</b> введите корректный текст клиента.");
            return;
        }

        try {
            // ИСПОЛЬЗУЕМ ИМЕННО ЭТУ ФУНКЦИЮ
            const parsed = parseTextToObject(raw);

            console.log("Parsed object:", parsed);

            const result = calculateInsurance(parsed);

            displayPremiumOutput(result);
        } catch (e) {
            displayPremiumOutput("<b>Ошибка:</b><br>" + e.message);
        }
    });

    console.log("UI адаптер успешно инициализирован");
});
