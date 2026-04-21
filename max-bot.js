/**
 * MAX Messenger Bot — Калькулятор КИС (Ингосстрах)
 * Использует все готовые модули калькулятора
 * Запуск: node max-bot.js
 */

const WebSocket = require('ws');

// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================
const CONFIG = {
  token: process.env.MAX_TOKEN || 'ВСТАВЬ_СВОЙ_TOKEN_СЮДА',
  wsUrl: 'wss://ws-api.oneme.ru/websocket',
  deviceId: 'bot-' + Math.random().toString(36).substr(2, 9),
  reconnectDelay: 5000,
};

// ============================================================
// ПОДКЛЮЧЕНИЕ МОДУЛЕЙ КАЛЬКУЛЯТОРА
// Эмулируем window для Node.js
// ============================================================
global.window = global;

// Загружаем все модули
require('./config_banks.js');
require('./tariffs_life.js');
require('./tariffs_property.js');
require('./calculator-utils.js');

const medModule = require('./calculator-medical.js');
if (medModule) {
  if (medModule.getUnderwritingFactor) window.getUnderwritingFactor = medModule.getUnderwritingFactor;
  if (medModule.getAgeLimitForLifeInsurance) window.getAgeLimitForLifeInsurance = medModule.getAgeLimitForLifeInsurance;
}

const lifeModule = require('./calculator-insurance-life.js');
if (lifeModule && lifeModule.calculateLifeInsurance) window.calculateLifeInsurance = lifeModule.calculateLifeInsurance;

const propModule = require('./calculator-insurance-property.js');
if (propModule && propModule.calculatePropertyInsurance) window.calculatePropertyInsurance = propModule.calculatePropertyInsurance;

const titleModule = require('./calculator-insurance-title.js');
if (titleModule && titleModule.calculateTitleInsurance) window.calculateTitleInsurance = titleModule.calculateTitleInsurance;

const propTariffModule = require('./tariffs_property.js');
if (propTariffModule && propTariffModule.getPropertyTariff) window.getPropertyTariff = propTariffModule.getPropertyTariff;

const parserModule = require('./parser.js');
if (parserModule && parserModule.parseTextToObject) window.parseTextToObject = parserModule.parseTextToObject;

console.log('✅ Все модули калькулятора загружены');

// ============================================================
// РАСЧЁТ — использует готовые модули
// ============================================================
function runCalculation(text) {
  try {
    // 1. Парсим текст
    const data = window.parseTextToObject(text);
    if (!data || !data.bank) {
      return null; // не наш запрос — молчим
    }

    // 2. Получаем конфиг банка
    const bankConfig = window.BANKS[data.bank];
    if (!bankConfig) {
      return `❌ Банк "${data.bank}" не найден в базе.\n\nДоступные банки:\n${Object.keys(window.BANKS).join(', ')}`;
    }
    bankConfig.bankName = data.bank;

    // 3. Проверяем минимальные данные
    if (!data.osz || data.osz <= 0) {
      return `❌ Не указан остаток долга (ОСЗ).\n\nПример: Сбер, ОСЗ 3000000, муж 15.08.1985, кв-ра`;
    }

    // 4. Определяем страховую сумму
    let insuranceAmount = data.osz;
    if (bankConfig.add_percent && bankConfig.add_percent > 0) {
      insuranceAmount = data.osz * (1 + bankConfig.add_percent / 100);
    } else if (bankConfig.add_percent === null && data.markupPercent) {
      insuranceAmount = data.osz * (1 + data.markupPercent / 100);
    }

    // Специальная логика для Альфа Банка
    if (data.bank === 'Альфа Банк') {
      data.lifeTariff = window.LIFE_TARIFF_ALFABANK;
    }

    // 5. Считаем каждый риск
    let lifeResult = null;
    let propertyResult = null;
    let titleResult = null;

    if (data.risks.life && data.borrowers && data.borrowers.length > 0) {
      lifeResult = window.calculateLifeInsurance(data, bankConfig, insuranceAmount);
    }

    if (data.risks.property) {
      propertyResult = window.calculatePropertyInsurance(data, bankConfig, data.osz);
    }

    if (data.risks.titul) {
      titleResult = window.calculateTitleInsurance(data, bankConfig, data.osz, data.risks.life, data.contractDate);
    }

    // 6. Если ничего не посчиталось
    if (!lifeResult && !propertyResult && !titleResult) {
      return `❌ Не удалось определить тип страхования.\n\nУкажите что страховать: жизнь, имущество, титул\n\nПример: Сбер, ОСЗ 3000000, муж 15.08.1985, кв-ра`;
    }

    // 7. Формируем ответ
    return formatResult(data, bankConfig, lifeResult, propertyResult, titleResult, insuranceAmount);

  } catch (e) {
    console.error('Ошибка расчёта:', e.message);
    console.error('Stack:', e.stack);
    return null; // не отвечаем клиенту при ошибке
  }
}

function formatResult(data, bankConfig, lifeResult, propertyResult, titleResult, insuranceAmount) {
  const fmt = (n) => {
    // Форматируем как "12 540,00" — с пробелами и запятой
    return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  let lines = [];
  let total = 0;

  // Жизнь
  if (lifeResult) {
    if (lifeResult.requiresMedicalExam) {
      lines.push(`Жизнь: требуется медобследование`);
    } else {
      if (lifeResult.borrowers.length === 1) {
        const premium = lifeResult.totalWithoutDiscount || lifeResult.total;
        lines.push(`Жизнь заёмщик ${fmt(premium)}`);
        total += premium;
      } else {
        lifeResult.borrowers.forEach((b, i) => {
          lines.push(`Жизнь заёмщик ${i+1} ${fmt(b.premium)}`);
          total += b.premium;
        });
      }
    }
  }

  // Имущество
  if (propertyResult) {
    const premium = propertyResult.totalWithoutDiscount || propertyResult.total;
    lines.push(`Имущество ${fmt(premium)}`);
    total += premium;
  }

  // Титул
  if (titleResult) {
    const premium = titleResult.totalWithoutDiscount || titleResult.total;
    lines.push(`Титул ${fmt(premium)}`);
    total += premium;
  }

  lines.push(`ИТОГО тариф/взнос ${fmt(total)}`);

  return lines.join('\n');
}

function formatHelp() {
  return `🤖 Калькулятор КИС — Ингосстрах

Формат запроса:
[Банк], ОСЗ [сумма], [пол] [дата рождения], [тип объекта]

Примеры:
• Сбер, ОСЗ 3000000, муж 15.08.1985, кв-ра
• ВТБ 5000000 жен 23.04.1990 квартира кд 01.03.2025
• Альфа Банк, ОСЗ 2500000, 6%, муж 12.01.1980, кв-ра
• Дом.РФ, 4000000, муж 35 лет, жен 32 года, квартира, титул

Банки: ${Object.keys(window.BANKS).join(', ')}`;
}

// ============================================================
// WEBSOCKET БОТ
// ============================================================
let ws;
let seq = 0;
let reconnectTimer;

// Защита от дублей — храним ID последних обработанных сообщений
const processedMessages = new Set();

function send(opcode, payload, cmd = 0) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg = JSON.stringify({ ver: 11, cmd, seq: seq++, opcode, payload });
    ws.send(msg);
  }
}

function connect() {
  console.log('🔌 Подключаюсь к Max...');
  ws = new WebSocket(CONFIG.wsUrl, {
    headers: {
      'Origin': 'https://web.max.ru',
      'Host': 'ws-api.oneme.ru',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }
  });

  ws.on('open', () => {
    console.log('✅ Подключён к Max WebSocket');
    seq = 0;

    // Шаг 1: deviceInfo
    send(6, {
      deviceId: CONFIG.deviceId,
      userAgent: {
        deviceType: 'WEB', locale: 'ru', deviceLocale: 'ru',
        osVersion: 'Windows', deviceName: 'Chrome', appVersion: '26.4.7',
        headerUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screen: '1080x1920 1.0x', timezone: 'Europe/Moscow'
      }
    });

    // Шаг 2: авторизация
    setTimeout(() => {
      send(19, {
        token: CONFIG.token,
        chatsCount: 40, chatsSync: 0, contactsSync: 0,
        draftsSync: 0, interactive: true, presenceSync: -1,
      });
      console.log('🔑 Авторизация отправлена');
    }, 500);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      const { opcode, payload } = msg;

      // Входящее сообщение
      if (opcode === 128 && payload?.message?.text) {
        const text = payload.message.text;
        const chatId = payload.chatId;
        const sender = payload.message.sender;
        const messageId = payload.message.id;

        // Защита от дублей — пропускаем уже обработанные сообщения
        if (messageId && processedMessages.has(messageId)) {
          console.log(`⏭ Дубль сообщения ${messageId}, пропускаю`);
          return;
        }
        if (messageId) {
          processedMessages.add(messageId);
          // Чистим старые ID чтобы не росло бесконечно
          if (processedMessages.size > 500) {
            const first = processedMessages.values().next().value;
            processedMessages.delete(first);
          }
        }

        console.log(`📨 [${chatId}] от ${sender}: "${text}"`);

        // Считаем
        const response = runCalculation(text);

        // Отвечаем только если есть результат
        if (!response) {
          console.log('⏭ Не похоже на запрос расчёта, пропускаю');
          return;
        }

        setTimeout(() => {
          // Отвечаем с цитированием исходного сообщения
          const replyPayload = {
            chatId,
            message: {
              text: response,
              cid: -Date.now(),
              elements: [],
              attaches: [],
              // Reply — привязка к исходному сообщению
              link: {
                type: 'REPLY',
                messageId: messageId,
              },
            },
            notify: true,
          };

          send(64, replyPayload);
          console.log(`📤 Ответ отправлен в чат ${chatId}`);
        }, 600);
      }

    } catch (e) { /* игнорируем */ }
  });

  ws.on('close', (code) => {
    console.log(`⚠️ Соединение закрыто (${code}). Переподключение через ${CONFIG.reconnectDelay/1000} сек...`);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, CONFIG.reconnectDelay);
  });

  ws.on('error', (err) => {
    console.log('❌ Ошибка WebSocket:', err.message);
  });
}

// ============================================================
// ЗАПУСК
// ============================================================
console.log('🤖 Max Bot — Калькулятор КИС (Ингосстрах)');
console.log('==========================================');

if (CONFIG.token === 'ВСТАВЬ_СВОЙ_TOKEN_СЮДА') {
  console.log('❌ Вставь свой token в CONFIG.token');
  console.log('   Токен из opcode 19 в панели разработчика Max');
  process.exit(1);
}

connect();

// Пинг каждые 25 сек — используем opcode 1 как делает браузер
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    send(1, { interactive: true });
  }
}, 25000);
