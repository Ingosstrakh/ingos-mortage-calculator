// openai.js - Чистый парсер для ипотечного страхования

// Основная функция для обработки запросов клиентов
async function processClientRequest(message) {
  try {
    // Пытаемся распарсить и рассчитать
    const result = handleClientRequest(message);

    // Проверяем, является ли результат детальной ошибкой валидации
    if (result && typeof result === 'string' && (result.includes('🚫') || result.includes('❌ Найдены ошибки'))) {
      // Это детальная ошибка валидации - возвращаем как есть
      return result;
    } else if (result && typeof result === 'string' && (result.includes('Банк:') || result.includes('Расчет рассрочки'))) {
      // Это успешный расчет (обычный или рассрочка)
      return result;
    } else {
      // Не удалось распарсить - возвращаем сообщение об ошибке
      return `<div style="color: #dc3545; padding: 15px; border: 1px solid #dc3545; border-radius: 8px; margin: 15px 0; background-color: #f8d7da;">
        <strong>❌ Ошибка обработки запроса</strong><br><br>
        Не удалось распознать данные для расчета страхования.<br><br>
        <strong>📋 Укажите следующие данные:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Название банка (Сбербанк, ВТБ, Дом.РФ и т.д.)</li>
          <li>ОСЗ (остаток ссудной задолженности)</li>
          <li>Данные заемщика (пол и дата рождения)</li>
          <li>Тип объекта (квартира/дом)</li>
        </ul>
        <strong>💡 Пример:</strong> "ВТБ ост 3000000 муж 15.08.1985 дом кирпич"
      </div>`;
    }
  } catch (error) {
    return `<div style="color: #dc3545; padding: 15px; border: 1px solid #dc3545; border-radius: 8px; margin: 15px 0; background-color: #f8d7da;">
      <strong>❌ Произошла техническая ошибка</strong><br><br>
      Попробуйте переформулировать запрос или проверьте корректность введенных данных.
    </div>`;
  }
}

// Экспортируем функцию в глобальную область
window.processClientRequest = processClientRequest;
