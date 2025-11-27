// server.js

const express = require('express');  // Подключаем Express
const fetch = require('node-fetch');  // Подключаем node-fetch для отправки HTTP-запросов
const app = express();
const PORT = process.env.PORT || 3000;  // Используем переменную окружения для порта

app.use(express.json());  // Для парсинга JSON в теле запроса

// POST-запрос для обработки запроса от клиента
app.post('/api/gpt', async (req, res) => {
  const apiKey = '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';  // Вставьте сюда ваш API ключ Hugging Face
  const question = req.body.question;  // Получаем вопрос от клиента

  try {
    // Отправляем запрос в Hugging Face API
    const response = await fetch('https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-2.7B', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,  // Вставьте ваш API ключ
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: question }),  // Отправляем запрос с вопросом
    });

    const data = await response.json();  // Получаем ответ от Hugging Face API
    res.json(data);  // Отправляем ответ обратно на фронтенд
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при запросе к Hugging Face API' });
  }
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
