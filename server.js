// server.js

const express = require('express');  // Подключаем Express
const fetch = require('node-fetch');  // Подключаем node-fetch для отправки HTTP-запросов
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());  // Для парсинга JSON в теле запроса

// Endpoint для получения запросов от клиента
app.post('/api/gpt', async (req, res) => {
  const apiKey = 'YOUR_HUGGINGFACE_API_KEY';  // Вставьте сюда ваш API ключ Hugging Face
  const question = req.body.question;  // Получаем текст запроса от клиента

  try {
    // Отправляем запрос в Hugging Face API
    const response = await fetch('https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-2.7B', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,  // Ваш API ключ
        'Content-Type': 'application/json',  // Тип данных
      },
      body: JSON.stringify({ inputs: question }),  // Тело запроса (вопрос)
    });

    const data = await response.json();  // Получаем данные от Hugging Face
    res.json(data);  // Отправляем данные обратно на фронтенд
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при запросе к Hugging Face API' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
