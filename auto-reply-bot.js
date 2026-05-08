/**
 * MAX Messenger — Автоответчик "Не в офисе"
 * Отвечает только в ЛИЧНЫХ чатах (не в групповых)
 * Каждому человеку отвечает только ОДИН РАЗ
 * Запуск: node auto-reply-bot.js
 */

const WebSocket = require('ws');

// ============================================================
// КОНФИГУРАЦИЯ — меняй здесь
// ============================================================
const CONFIG = {
  // Токен бота (вставь свой)
  token: process.env.MAX_TOKEN || 'An_Sx6HQ9HDidhSR_xPXv87TFe56Ar-vmsVidqrLUxPHtVRTK6UCG3Px0y5zMEY91jBN7jSN0GBOioOqbOxaLjJ8SOxCUzOlgszNwWPG0_AYtYY9fL2DKsnzj6NGAbJfyPGOebjnltFV0tWtwxTySkMUFCpmO2NrrZ-Z7EjBIoVEI-YYMzNMOwM7eEnZVIHCdZt38Rg2RhU1xxCf2GBEQJULT4_lK-vPZmj24y-uLDGNgfWK-rdD83HpVS5yCUt32zYQXUbcQkB_xt7XTK052gLZFohM2VfhOyeUwmsAO4KqCuW2a5Xwz-TR-WX9pudlj8D7eXsSZVWPsxK2iqa2oF3OZZKom55qQt1pCL62wQqA3h5amvxNHQyXTx97jMgMgapCIAm7cGojHYxHSvO17vn5uvemqb7yoH5oD8PoL1LEsYM17uNRIIlDZuMpONWuHS6wm71sotCipMuK52dX4LKm05J3XNkfGNYw0iiUtfOIxXJqEbpLb147hFM1GoKR3ZRPjTEf6GA74V4iTnqEcJTQ5EM4gdiXZg5MKMrEIkAjp0Bi67Z3MpNrCgMQyhxBRtOB-ZJuAEB6pSxNUV90YCX-i7NxNCB_GynnAFPuZTmpvHuhTwU9VxpleupxfbZ0tUr2GBCgN9lLDIy4QSEiab4cW1wRAADVlyMe5vLSmRhsWf5uanTQLBegh4kUsWpPrf0VG4k',

  // Текст автоответа
  replyText: `Добрый день, нахожусь не в офисе

По срочным вопросам в рамках ипотечного страхования просьба обращаться:
• Залялиева Алия — aliya.husaenova@ingos.ru, +7 905 311-44-43
• Артамонова Екатерина — +7 965 594-18-29
• Перепелица Ксения — Kseniya.Perepelitsa@ingos.ru
• Фролова Рената — Renata.Frolova@ingos.ru
• Оскотская Екатерина — +7 917 293-03-03

Ваше сообщение не переадресовано.`,

  // Задержка ответа в мс (0 = мгновенно)
  replyDelay: 1000,

  wsUrl: 'wss://ws-api.oneme.ru/websocket',
  deviceId: 'autoreply-' + Math.random().toString(36).substr(2, 9),
  reconnectDelay: 5000,
};

// ============================================================
// СОСТОЯНИЕ
// ============================================================
let ws;
let seq = 0;
let reconnectTimer;
let botUserId = null;

// Кому уже ответили (chatId) — чтобы не спамить
const repliedChats = new Set();

// ============================================================
// ОТПРАВКА
// ============================================================
function send(opcode, payload, cmd = 0) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ver: 11, cmd, seq: seq++, opcode, payload }));
  }
}

// ============================================================
// ПОДКЛЮЧЕНИЕ
// ============================================================
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
    console.log('✅ Подключён');
    seq = 0;

    // deviceInfo
    send(6, {
      deviceId: CONFIG.deviceId,
      userAgent: {
        deviceType: 'WEB', locale: 'ru', deviceLocale: 'ru',
        osVersion: 'Windows', deviceName: 'Chrome', appVersion: '26.4.7',
        headerUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screen: '1080x1920 1.0x', timezone: 'Europe/Moscow'
      }
    });

    // авторизация
    setTimeout(() => {
      console.log('⏱ Отправляю opcode=19 с токеном...');
      send(19, {
        token: CONFIG.token,
        chatsCount: 40, chatsSync: 0, contactsSync: 0,
        draftsSync: 0, interactive: true, presenceSync: -1,
      });
      console.log('🔑 Авторизация отправлена');
    }, 1000);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      const { opcode, payload, cmd } = msg;

      // Получаем userId бота
      if (opcode === 19 && payload) {
        // userId может быть в payload.userId или в payload.profile.contact.id
        const uid = payload.userId || payload.profile?.contact?.id;
        if (uid) {
          botUserId = String(uid);
          console.log(`🤖 Bot userId: ${botUserId}`);
          console.log('📨 Автоответчик активен. Жду сообщений...');
        } else if (cmd === 3) {
          console.log(`❌ Ошибка авторизации: ${payload.error || 'unknown'}`);
        }
      }

      // Логируем только важные opcodes
      if (opcode !== 1 && opcode !== 19 && opcode !== 6 && opcode !== 128 && opcode !== 129 && opcode !== 130 && opcode !== 292) {
        console.log(`📡 opcode=${opcode} cmd=${cmd}`);
      }

      // Входящее сообщение
      if (opcode === 128 && payload?.message) {
        const message = payload.message;
        const chatId = payload.chatId;
        const sender = String(message.sender);
        const text = message.text || '';
        const messageId = message.id;

        console.log(`📩 opcode=128 chatId=${chatId} sender=${sender} botUserId=${botUserId} text="${text.substring(0,40)}"`);

        // Игнорируем свои сообщения
        if (botUserId && sender === botUserId) {
          console.log(`⏭ Своё сообщение, пропускаю`);
          return;
        }

        // Игнорируем пустые сообщения
        if (!text && (!message.attaches || message.attaches.length === 0)) {
          console.log(`⏭ Пустое сообщение, пропускаю`);
          return;
        }

        // Определяем тип чата
        const isPersonal = isPersonalChat(chatId, sender);
        console.log(`🔍 isPersonal=${isPersonal} (chatId=${chatId})`);

        if (!isPersonal) {
          console.log(`⏭ Групповой чат ${chatId}, пропускаю`);
          return;
        }

        // Уже отвечали этому человеку?
        if (repliedChats.has(chatId)) {
          console.log(`⏭ Уже отвечал в чат ${chatId}, пропускаю`);
          return;
        }

        console.log(`📨 Личное сообщение от ${sender} в чат ${chatId}: "${text.substring(0, 50)}"`);

        // Отмечаем что ответим
        repliedChats.add(chatId);

        // Отправляем автоответ
        setTimeout(() => {
          send(64, {
            chatId,
            message: {
              text: CONFIG.replyText,
              cid: -Date.now(),
              elements: [],
              attaches: [],
            },
            notify: true,
          });
          console.log(`📤 Автоответ отправлен в чат ${chatId}`);
        }, CONFIG.replyDelay);
      }

    } catch (e) { /* игнорируем */ }
  });

  ws.on('close', (code) => {
    console.log(`⚠️ Соединение закрыто (${code}). Переподключение через ${CONFIG.reconnectDelay / 1000} сек...`);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, CONFIG.reconnectDelay);
  });

  ws.on('error', (err) => {
    console.log('❌ Ошибка WebSocket:', err.message);
  });
}

// ============================================================
// ОПРЕДЕЛЕНИЕ ЛИЧНОГО ЧАТА
// В Max мессенджере:
//   Личный чат  — chatId ПОЛОЖИТЕЛЬНЫЙ (равен userId собеседника)
//   Групповой   — chatId ОТРИЦАТЕЛЬНЫЙ (большое отрицательное число)
// ============================================================
function isPersonalChat(chatId, senderId) {
  const chatIdNum = Number(chatId);

  // Отрицательный chatId — всегда группа/канал
  if (chatIdNum < 0) return false;

  // Положительный chatId — личный чат
  return true;
}

// ============================================================
// ЗАПУСК
// ============================================================
console.log('🤖 Max Auto-Reply Bot — Автоответчик "Не в офисе"');
console.log('==================================================');

if (CONFIG.token === 'ВСТАВЬ_ТОКЕН_СЮДА') {
  console.log('❌ Вставь токен в CONFIG.token или переменную окружения MAX_TOKEN');
  process.exit(1);
}

connect();

// Пинг каждые 25 сек
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    send(1, { interactive: true });
  }
}, 25000);
