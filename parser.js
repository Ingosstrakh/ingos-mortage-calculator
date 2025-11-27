function parseTextToObject(rawText) {
  const text = rawText.toLowerCase();
  const result = {
    bank: null,
    risks: { life: false, property: false, titul: false },
    amount: null,
    interestRate: null,
    years: null,
  };

  // Распознавание банка и рисков
  if (text.includes("втб")) result.bank = "ВТБ РТ";
  if (text.includes("сбер")) result.bank = "Сбербанк";

  // Прочие функции парсинга для извлечения суммы, ставки и лет
  // Используем извлеченные данные для построения запроса
  return result;
}
