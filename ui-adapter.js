// ui-adapter.js
// Премиальные эффекты + кнопка расчёта

function fadeIn(el) {
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    el.style.transition = "0.4s ease";

    setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
    }, 10);
}

function showOutput(text) {
    const out = document.getElementById("output");
    out.style.opacity = "0";

    setTimeout(() => {
        out.innerHTML = text.replace(/\n/g, "<br>");
        fadeIn(out);
    }, 50);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("calculate-btn").onclick = () => {
        const input = document.getElementById("input-area").value.trim();

        if (!input) {
            showOutput("<b>Введите текст для анализа.</b>");
            return;
        }

        try {
            const parsed = parseClientText(input);
            const result = calculateInsurance(parsed);

            showOutput(result);

        } catch (e) {
            showOutput("<b>Ошибка:</b> " + e.message);
        }
    };

    console.log("UI адаптер загружен");
});
