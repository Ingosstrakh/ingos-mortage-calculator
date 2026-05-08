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
  token: process.env.MAX_TOKEN || 'An_Sx6HQ9HDinL1hF1fpktLNK_inxrJQ4A00_0k4IjymndOaj1i3bBH-rxUs5De9McFbWdJ0odCchV_D6eiN5wj57gwjfA9QM81alzB0dYDP2XZqocytgdHbA36WYZzL4loQdgQEWvf15XmrOzf2-ZMXU_LjLBHaBMTJ2Vo5clpXm5kbKk0abz1FaWK8W2uucbypciZYETE_hK2t6yKaV_OOCcGxwCGUJnBBQgkz0YuLW1JCsieufAdfWDEZknP9YPck5XOM6mRdRY2Nj5N1Je3Zl5oFKqQHDhbzIIdAdKqvflfh30-hSK9rvmq_oBuyp0EsL80w-kIg2Wt1ONiGqJ0hAinQdtdB7PqJCeOug2p_WoTzs_kZD9i_IZwJrsQnTLkCz5hgttENC2hF4bpJnXdOToVD6usli4vD55nY0wB5IoOyvV4USx1FECtkQbvY87oFNboiGrBqD9YUDVd-af9aDbXVaC3aAL-rqL18oi3if13vLdzZBiyEakxIa23Z-rSNZh2ina4RJnIh3HGNg5KpDhjrUrPPnjspl-e1C555J9gSAo3S-1PwDZbt33div9qqnEByKDmV8AtYAHabzEqdcLuFgoWI1f1wvS97KQ1cc9RCjYRkqwwbScTPvMIf-E4REXY1aKJc99oTAx2aT4LaylSM3bjlQPC0mhopxD6hx8XqeJh-fSHOY5HQiNOUAraQQEc',

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
      'User-Agent': 'Mozilla/5.0',
      'Cache-Control': 'no-cache',
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
        headerUserAgent: 'Mozilla/5.0',
        screen: '1080x1920 1.0x', timezone: 'Europe/Moscow'
      }
    });

    // авторизация
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
      const { opcode, payload, cmd } = msg;

      // Получаем userId бота
      if (cmd === 1 && opcode === 19 && payload?.userId) {
        botUserId = String(payload.userId);
        console.log(`🤖 Bot userId: ${botUserId}`);
        console.log('📨 Автоответчик активен. Жду сообщений...');
      }

      // Логируем все входящие opcodes для отладки
      if (opcode !== 1 && opcode !== 19) {
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
