// openai.js
async function askGPT5Mini(question) {
  const apiKey = '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';  // Вставьте сюда ваш API ключ

  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',  // Используем GPT-5 mini
      prompt: question,
      max_tokens: 150, // Ограничение на количество токенов
      temperature: 0.7, // Параметр креативности (от 0 до 1)
    }),
  });

  const data = await response.json();
  return data.choices[0].text.trim(); // Возвращаем ответ от GPT-5 mini
}