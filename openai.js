// openai.js - Интеграция с Grok через Puter API

// Функция для отправки запроса к Grok через Puter API
async function askGPTNeo(question) {
  try {
    const response = await puter.ai.chat(question, {
      model: 'x-ai/grok-4.1-fast',
      temperature: 0.7,
      max_tokens: 1000
    });

    console.log('Grok response:', response); // Выводим ответ от Grok для отладки

    return response.message.content.trim();
  } catch (error) {
    console.error('Error calling Grok API:', error);
    return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте еще раз.';
  }
}

// Функция для чата с Grok (для будущего использования)
async function chatWithGrok(message, conversationHistory = []) {
  try {
    const messages = [
      ...conversationHistory,
      { role: "user", content: message }
    ];

    const response = await puter.ai.chat(messages, {
      model: 'x-ai/grok-4.1-fast',
      temperature: 0.7,
      max_tokens: 1000
    });

    return {
      message: response.message.content,
      conversationHistory: [
        ...messages,
        { role: "assistant", content: response.message.content }
      ]
    };
  } catch (error) {
    console.error('Error in chat:', error);
    return {
      message: 'Извините, произошла ошибка при обращении к ИИ.',
      conversationHistory: conversationHistory
    };
  }
}
