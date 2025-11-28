// -----------------------
// ЗАГРУЗКА ТАРИФОВ
// -----------------------
import { banksConfig } from "./config_banks.js";
import { lifeTariffs } from "./tariffs_life.js";
import { propertyTariffs } from "./tariffs_property.js";

// -----------------------
// GPT-5 Nano через PUTER
// -----------------------
async function askGPT5(prompt) {
    const proxy = "https://cors-anywhere.herokuapp.com/";
    const url = "https://api.puter.com/v1/chat/completions";

    const body = {
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
    };

    const res = await fetch(proxy + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!data.choices) return "Ошибка GPT: " + JSON.stringify(data);

    return data.choices[0].message.content;
}

// -----------------------
// ОСНОВНАЯ ФУНКЦИЯ РАСЧЁТА
// -----------------------
export async function calculateWithGPT(userInput) {
    const payload = `
Ты — страховой расчетчик. 

У тебя есть ТРИ набора данных:

1) Надбавки и особенности банков:
${JSON.stringify(banksConfig, null, 2)}

2) Тарифы по страхованию жизни:
${JSON.stringify(lifeTariffs, null, 2)}

3) Тарифы по имуществу / титулу:
${JSON.stringify(propertyTariffs, null, 2)}

-----------------------------------------
ЗАДАЧА: рассчитать страховку ПОЛНОСТЬЮ.
Если данных мало — задавай уточняющий вопрос.
Если данных достаточно — дай итоговую цену.
Пиши чётко, по делу.
-----------------------------------------

Ввод пользователя:
${userInput}
    `;

    return await askGPT5(payload);
}
