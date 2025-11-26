// openai.js

// Функция для отправки запроса в Hugging Face API и получения ответа от GPT-Neo
async function askGPTNeo(question) {
  const apiKey = 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;  // Вставьте сюда ваш API ключ

  const response = await fetch('https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-2.7B', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: question }),
  });

  const data = await response.json();
  console.log(data);  // Выводим ответ от GPT-Neo для отладки

  return data[0].generated_text.trim(); // Возвращаем сгенерированный текст от GPT-Neo
}
