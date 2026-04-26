/**
 * MAX Messenger Bot — Калькулятор КИС (Ингосстрах)
 * Использует все готовые модули калькулятора
 * Запуск: node max-bot.js
 */

const WebSocket = require('ws');
const https = require('https');
const PDFParser = require('pdf2json');

// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================
const CONFIG = {
  token: process.env.MAX_TOKEN || 'An_Sx6HQ9HDinL1hF1fpktLNK_inxrJQ4A00_0k4IjymndOaj1i3bBH-rxUs5De9McFbWdJ0odCchV_D6eiN5wj57gwjfA9QM81alzB0dYDP2XZqocytgdHbA36WYZzL4loQdgQEWvf15XmrOzf2-ZMXU_LjLBHaBMTJ2Vo5clpXm5kbKk0abz1FaWK8W2uucbypciZYETE_hK2t6yKaV_OOCcGxwCGUJnBBQgkz0YuLW1JCsieufAdfWDEZknP9YPck5XOM6mRdRY2Nj5N1Je3Zl5oFKqQHDhbzIIdAdKqvflfh30-hSK9rvmq_oBuyp0EsL80w-kIg2Wt1ONiGqJ0hAinQdtdB7PqJCeOug2p_WoTzs_kZD9i_IZwJrsQnTLkCz5hgttENC2hF4bpJnXdOToVD6usli4vD55nY0wB5IoOyvV4USx1FECtkQbvY87oFNboiGrBqD9YUDVd-af9aDbXVaC3aAL-rqL18oi3if13vLdzZBiyEakxIa23Z-rSNZh2ina4RJnIh3HGNg5KpDhjrUrPPnjspl-e1C555J9gSAo3S-1PwDZbt33div9qqnEByKDmV8AtYAHabzEqdcLuFgoWI1f1wvS97KQ1cc9RCjYRkqwwbScTPvMIf-E4REXY1aKJc99oTAx2aT4LaylSM3bjlQPC0mhopxD6hx8XqeJh-fSHOY5HQiNOUAraQQEc',
  wsUrl: 'wss://ws-api.oneme.ru/websocket',
  deviceId: 'bot-' + Math.random().toString(36).substr(2, 9),
  reconnectDelay: 5000,
  botUserId: null, // заполнится автоматически после авторизации

  // ⏱ ВРЕМЯ ОТВЕТА — меняй здесь (в миллисекундах)
  // 10000 = 10 секунд, 5000 = 5 секунд, 30000 = 30 секунд
  replyDelay: 16000,
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
// СКАЧИВАНИЕ И ПАРСИНГ PDF
// ============================================================

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parsePdfBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on('pdfParser_dataReady', () => {
      const text = pdfParser.getRawTextContent();
      resolve(text);
    });
    pdfParser.on('pdfParser_dataError', reject);
    pdfParser.parseBuffer(buffer);
  });
}

function parsePdfForHouse(text) {
  const lower = text.toLowerCase();
  const result = {};

  // Классификация материала по ключевым словам
  function classifyMaterial(val) {
    const v = val.toLowerCase().trim();
    // Неизвестный / прочие
    if (/прочи|иной|иных|другой|другие|не определ|неизвест|смешан|разн/i.test(v)) {
      return 'unknown';
    }
    // СИП-панели — дерево (проверяем ДО общего "панел")
    if (/сип[\s-]?панел|сип\b/i.test(v)) {
      return 'wood';
    }
    // Кирпич и аналоги (негорючие)
    if (/кирпич|газоблок|газобетон|пеноблок|пенобетон|железобетон|монолит|панел|керамзит|шлакоблок|бетон|блок/i.test(v)) {
      return 'brick';
    }
    // Дерево и аналоги (горючие)
    if (/дерев|брус|бревн|каркас|щитов/i.test(v)) {
      return 'wood';
    }
    // Не распознан
    return 'unknown';
  }

  // ═══════════════════════════════════════════════════════════════
  // СТРАТЕГИЯ: Ищем секцию "Описание объекта оценки" в первой трети PDF
  // Там точно будет материал стен именно оцениваемого дома, а не аналогов
  // ═══════════════════════════════════════════════════════════════

  const lines = text.split('\n');
  // Ищем в первых 60% документа (аналоги обычно в последней трети)
  const searchLimit = Math.floor(lines.length * 0.6);

  // Ищем начало раздела с описанием объекта (не оглавление)
  // Признак — заголовок раздела с номером страницы или без, после которого идут данные
  let descriptionStartIdx = 0;
  for (let i = 0; i < searchLimit; i++) {
    const l = lines[i].trim();
    // Ищем заголовок раздела "Описание объекта" — не в оглавлении (без точек и номеров страниц)
    if (/^(?:\d+[\.\s]+)?(?:описание|характеристик)\s+объекта/i.test(l) && !/\.{3,}/.test(l)) {
      descriptionStartIdx = i;
      console.log(`📌 Раздел описания: строка ${i}: "${l.substring(0,60)}"`);
      break;
    }
  }

  // Ищем материал стен от начала раздела до конца зоны поиска (60% документа)
  let found = false;
  for (let i = descriptionStartIdx; i < searchLimit; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    const prevLine = lines[i - 1] || '';

    // Паттерн 1: "Материал наружных стен: кирпич" / "Наружные стены: кирпич"
    const m1 = line.match(/(?:материал\s+(?:наружных\s+)?стен|наружные\s+стены|стены\s+наружные)[:\s]+([^\n]{2,40})/i);
    if (m1) {
      const raw = m1[1].replace(/\s{3,}.*/s, '').trim();
      if (/кирпич|дерев|брус|бревн|блок|бетон|монолит|панел|каркас|сип|щитов|прочи|иной|смешан|неизвест/i.test(raw)) {
        result.material = classifyMaterial(raw);
        result.materialText = raw.substring(0, 40);
        console.log(`🔍 Материал стен (паттерн 1, строка ${i}): "${raw}" → ${result.material}`);
        found = true;
        break;
      }
    }

    // Паттерн 2: Строка "Стены" — материал на следующей строке
    if (/^Стены\s*$/i.test(line.trim())) {
      const raw = nextLine.replace(/\s{3,}.*/s, '').replace(/:.*/,'').trim();
      if (raw && /кирпич|дерев|брус|бревн|блок|бетон|монолит|панел|каркас|сип|щитов|прочи|иной|смешан|неизвест/i.test(raw)) {
        result.material = classifyMaterial(raw);
        result.materialText = raw.substring(0, 40);
        console.log(`🔍 Материал стен (паттерн 2, таблица, строка ${i}): "${raw}" → ${result.material}`);
        found = true;
        break;
      }
    }

    // Паттерн 3: Заголовок таблицы "Материал стен дома" — данные на предыдущей строке
    if (/Материал\s+стен\s+дома/i.test(line)) {
      const raw = prevLine.replace(/\s{3,}.*/s, '').trim();
      if (raw && /кирпич|дерев|брус|бревн|блок|бетон|монолит|панел|каркас|сип|щитов|прочи|иной|смешан|неизвест/i.test(raw)) {
        result.material = classifyMaterial(raw);
        result.materialText = raw.substring(0, 40);
        console.log(`🔍 Материал стен (паттерн 3, заголовок, строка ${i}): "${raw}" → ${result.material}`);
        found = true;
        break;
      }
    }

    // Паттерн 4: Строка содержит только материал + рядом есть признаки описания объекта
    // (год постройки, этажность, площадь, износ, фундамент)
    if (!found) {
      const context = lines.slice(Math.max(0, i-3), i+4).join(' ');
      if (/год\s+постройки|этаж|площад|износ|фундамент|перекрыти/i.test(context)) {
        const m4 = line.match(/(?:материал\s+стен|стены)[:\s]+([^\n]{2,40})/i);
        if (m4) {
          const raw = m4[1].replace(/\s{3,}.*/s, '').trim();
          if (/кирпич|дерев|брус|бревн|блок|бетон|монолит|панел|каркас|сип|щитов|прочи|иной|смешан|неизвест/i.test(raw)) {
            result.material = classifyMaterial(raw);
            result.materialText = raw.substring(0, 40);
            console.log(`🔍 Материал стен (паттерн 4, контекст, строка ${i}): "${raw}" → ${result.material}`);
            found = true;
            break;
          }
        }
      }
    }
  }

  if (!found) {
    console.log(`⚠️ Материал стен не найден в первой половине PDF`);
  }
  const yearPatterns = [
    /год\s+(?:постройки|строительства|возведения)[:\s]+(\d{4})/i,
    /год\s+ввода\s+(?:в\s+)?(?:эксплуатацию|объекта)[:\s]+(\d{4})/i,
    /ввод\s+в\s+эксплуатацию[:\s]+(\d{4})/i,
    /построен[оа]?\s+в\s+(\d{4})/i,
    /(\d{4})\s+год\s+(?:постройки|строительства|ввода)/i,
    // Год на следующей строке после ключевого слова
    /год\s+ввода[^0-9]{0,30}(\d{4})/i,
    /год\s+постройки[^0-9]{0,30}(\d{4})/i,
    /эксплуатацию[^0-9]{0,30}(\d{4})/i,
  ];

  for (const pattern of yearPatterns) {
    const m = text.match(pattern);
    if (m) {
      const year = parseInt(m[1]);
      if (year >= 1800 && year <= 2030) {
        result.yearBuilt = year;
        break;
      }
    }
  }

  // Адрес
  const addrMatch = text.match(/адрес[:\s]+([^\n]{10,100})/i);
  if (addrMatch) result.address = addrMatch[1].trim();

  return result;
}

// Запрос ссылки на файл через opcode 88
function requestFileUrl(fileId, chatId, messageId) {
  return new Promise((resolve) => {
    const handler = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.opcode === 88 && msg.cmd === 1 && msg.payload?.url) {
          ws.removeListener('message', handler);
          resolve(msg.payload.url);
        }
      } catch(e) {}
    };
    ws.on('message', handler);
    send(88, { fileId, chatId, messageId });
    // Таймаут 10 сек
    setTimeout(() => {
      ws.removeListener('message', handler);
      resolve(null);
    }, 10000);
  });
}
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

    // Определяем пол по отчеству если парсер не нашёл "муж"/"жен"
    // ОВИЧ/ЕВИЧ → мужской ('m'), ОВНА/ЕВНА → женский ('f')
    // Парсер использует 'm'/'f', не 'male'/'female'
    if (data.borrowers && data.borrowers.length > 0) {
      for (const b of data.borrowers) {
        if (!b.gender) {
          if (/[ОЕ]ВИЧ(\s|$)/i.test(text)) b.gender = 'm';
          else if (/[ОЕ]ВНА(\s|$)/i.test(text)) b.gender = 'f';
        }
      }
    }

    // Если дата КД не найдена — ищем дату которая явно не является датой рождения
    // (дата рождения уже в borrowers, берём оставшуюся дату)
    if (!data.contractDate && data.dates && data.dates.length > 1) {
      const dobDates = new Set((data.borrowers || []).map(b => b.dob).filter(Boolean));
      const remaining = data.dates.filter(d => !dobDates.has(d));
      if (remaining.length > 0) data.contractDate = remaining[remaining.length - 1];
    }

    // Специальная логика для Дом.РФ:
    // Название банка содержит слово "дом" — парсер может ошибочно поставить objectType=house.
    // Если нет явного материала стен и нет года квартиры (кв YYYY) — считаем только жизнь.
    if (data.bank === 'Дом.РФ') {
      const lowerRaw = text.toLowerCase();
      // Расширенный список материалов включая опечатки (крипич) и синонимы (бетон, газобетон)
      const hasMaterial = /кирпич|крипич|блок|железобетон|монолит|панел|дерев|брус|каркас|бетон|газобетон/i.test(lowerRaw);
      // hasKvYear: проверяем явные признаки квартиры с годом постройки
      // После нормализации "кв 2000 ОСЗ" → "квартира осз ... год 2000"
      // НЕ используем data.yearBuilt — он может взяться из года в дате КД
      const hasKvYear = /кв(?:артир[аы]?)?\s+\d{4}/i.test(lowerRaw)
        || /год\s+\d{4}/i.test(lowerRaw)
        || data.objectType === 'flat';
      if (!hasMaterial && !hasKvYear) {
        // Нет объекта — только жизнь
        data.objectType = null;
        data.risks.property = false;
        data.risks.titul = false;
      } else if (hasMaterial) {
        // Есть материал — это дом
        if (!data.objectType || data.objectType === 'house') {
          data.objectType = /дерев|брус|каркас/i.test(lowerRaw) ? 'house_wood' : 'house_brick';
        }
        data.risks.property = true;
      } else if (hasKvYear) {
        // Есть год квартиры — это квартира
        data.objectType = 'flat';
        data.risks.property = true;
      }
    }

    // Если дом без материала (не Дом.РФ) — молчим, нужна оценка
    if (data.objectType === 'house') {
      // Проверяем есть ли материал стен в тексте
      const lowerText = text.toLowerCase();
      const hasBrick = /кирпич|крипич|блок|газоблок|газобетон|пеноблок|пенобетон|железобетон|монолит|панел|керамзит|шлакоблок|бетон/i.test(lowerText);
      const hasWood  = /дерев|брус|бревн|каркас|сип[\s-]?панел|щитов/i.test(lowerText);

      if (hasBrick) {
        data.objectType = 'house_brick';
      } else if (hasWood) {
        data.objectType = 'house_wood';
      } else {
        // Нет материала — убираем название банка и проверяем реальное слово "дом"
        const textWithoutBank = text.replace(new RegExp(data.bank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        const hasDomWord = /(^|\s)(дом|жилой\s+дом|частный\s+дом)(\s|$)/i.test(textWithoutBank);
        if (hasDomWord) {
          return null; // реальный дом без материала — молчим, нужна оценка
        }
        data.objectType = null; // "дом" из названия банка — сбрасываем
      }
    }
    // house_brick и house_wood — материал уже в objectType, всё ок

    // Дом 1960–2005 года постройки — имущество не страхуем (слишком старый)
    const isHouseType = data.objectType === 'house_brick' || data.objectType === 'house_wood';
    if (isHouseType && data.yearBuilt && data.yearBuilt >= 1960 && data.yearBuilt <= 2005) {
      console.log(`⚠️ Дом ${data.yearBuilt} года — имущество не считаем (1960–2005)`);
      data.risks.property = false;
    }

    // "3 риска" = жизнь + имущество + титул
    const lower = (data.raw || '').toLowerCase();
    if (/3\s*риска|три\s*риска/.test(lower)) {
      data.risks.life = true;
      data.risks.property = true;
      data.risks.titul = true;
    }

    // Специальная логика для ВТБ — меняем правила в зависимости от даты КД
    if (data.bank === 'ВТБ' && data.contractDate) {
      const cutoffDate = new Date('2025-02-01T00:00:00');
      const parts = data.contractDate.split('.');
      let contractDateObj;
      if (parts.length === 3) {
        contractDateObj = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T00:00:00`);
      } else {
        contractDateObj = new Date(data.contractDate);
      }
      const contractDateOnly = new Date(contractDateObj.getFullYear(), contractDateObj.getMonth(), contractDateObj.getDate());
      const cutoffDateOnly = new Date(2025, 1, 1);
      if (contractDateOnly >= cutoffDateOnly) {
        // Новые правила ВТБ после 01.02.2025
        bankConfig.add_percent = 0;
        bankConfig.allow_discount_property = false;
        bankConfig.allow_discount_life = false;
        bankConfig.allow_discount_title = false;
      }
      // Для старых дат оставляем add_percent = 10 как в конфиге
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
      propertyResult = window.calculatePropertyInsurance(data, bankConfig, insuranceAmount);
    }

    if (data.risks.titul) {
      titleResult = window.calculateTitleInsurance(data, bankConfig, insuranceAmount, data.risks.life, data.contractDate);
    }

    // 6. Если ничего не посчиталось — молчим (не пишем ошибку клиенту)
    if (!lifeResult && !propertyResult && !titleResult) {
      return null;
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
      const isVUT = data.bank === 'Альфа Банк' || data.bank === 'РСХБ';
      const vutLabel = isVUT ? ' (с ВУТ)' : '';
      if (lifeResult.borrowers.length === 1) {
        const premium = lifeResult.totalWithoutDiscount || lifeResult.total;
        lines.push(`Жизнь заёмщик${vutLabel} ${fmt(premium)}`);
        total += premium;
      } else {
        lifeResult.borrowers.forEach((b, i) => {
          lines.push(`Жизнь заёмщик ${i+1}${vutLabel} ${fmt(b.premium)}`);
          total += b.premium;
        });
      }
    }
  }

  // Имущество
  if (propertyResult) {
    const premium = propertyResult.totalWithoutDiscount || propertyResult.total;
    const isHouse = data.objectType === 'house_brick' || data.objectType === 'house_wood' || data.objectType === 'house';
    const yearBuilt = data.yearBuilt;
    const needsPhoto = isHouse && yearBuilt && yearBuilt <= 2019;
    if (needsPhoto) {
      lines.push(`Имущество ${fmt(premium)} (предварительно, необходимо актуальные фото 3-5 шт. изнутри и столько же снаружи)`);
    } else {
      lines.push(`Имущество ${fmt(premium)}`);
    }
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

// ID сообщений на которые уже ответили (чтобы не отвечать повторно)
const answeredMessages = new Set();

// Кэш последних текстовых сообщений по chatId (для связки с PDF)
const chatTextCache = new Map(); // chatId -> { text, time }

// Последнее сообщение клиента по chatId (для блокировки ответа когда сотрудник пишет)
const lastClientMessage = new Map(); // chatId -> messageId

// Флаг — уже запланирован ответ в этот чат (чтобы не отвечать дважды)
const pendingReply = new Set(); // chatId

// Флаг паузы — управляется командами /pause и /resume
let botPaused = false;

// ID администратора — только он может управлять ботом командами
const ADMIN_IDS = ['7279375'];

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
      const { opcode, payload, cmd } = msg;

      // Ответ сервера на авторизацию — получаем userId бота
      if (cmd === 1 && opcode === 19 && payload?.userId) {
        CONFIG.botUserId = String(payload.userId);
        console.log(`🤖 Bot userId определён: ${CONFIG.botUserId}`);
      }

      // Подтверждение отправки сообщения (opcode 64 cmd=1)
      // Если сотрудник ответил на сообщение клиента — запоминаем
      if (opcode === 64 && msg.cmd === 1 && payload?.message?.link?.type === 'REPLY') {
        const repliedToId = payload.message.link.message?.id;
        if (repliedToId) {
          answeredMessages.add(repliedToId);
          console.log(`📝 Сотрудник ответил на сообщение ${repliedToId}, бот пропустит его`);
          if (answeredMessages.size > 1000) {
            const f = answeredMessages.values().next().value;
            answeredMessages.delete(f);
          }
        }
      }

      // Входящее сообщение
      if (opcode === 128 && payload?.message) {
        const message = payload.message;
        const chatId = payload.chatId;
        const sender = message.sender;
        const messageId = message.id;
        const text = message.text || '';
        const attaches = message.attaches || [];
        const replyToId = message.link?.messageId;

        // Если это ручной reply от кого-то (не от бота) — запоминаем что на это сообщение уже ответили
        if (replyToId && String(sender) !== String(CONFIG.botUserId)) {
          answeredMessages.add(replyToId);
          console.log(`📝 Ручной ответ на сообщение ${replyToId} от ${sender}, запоминаю`);
          if (answeredMessages.size > 1000) {
            const f = answeredMessages.values().next().value;
            answeredMessages.delete(f);
          }
          return; // не обрабатываем это сообщение дальше
        }

        // Игнорируем сообщения от сотрудников (список в staff.json)
        let staffIds = [];
        try { staffIds = require('./staff.json').ids.map(String); } catch(e) {}

        // Команды управления ботом — только от администратора
        if (ADMIN_IDS.includes(String(sender))) {
          const cmd = (text || '').trim().toLowerCase();
          if (cmd === '/pause') {
            botPaused = true;
            send(64, { chatId, message: { text: '⏸ Бот на паузе. Напиши /resume чтобы продолжить.', cid: -Date.now(), elements: [], attaches: [] }, notify: false });
            console.log('⏸ Бот поставлен на паузу администратором');
            return;
          }
          if (cmd === '/resume') {
            botPaused = false;
            send(64, { chatId, message: { text: '▶️ Бот возобновил работу.', cid: -Date.now(), elements: [], attaches: [] }, notify: false });
            console.log('▶️ Бот возобновил работу');
            return;
          }
          if (cmd === '/status') {
            const status = botPaused ? '⏸ На паузе' : '▶️ Работает';
            send(64, { chatId, message: { text: `Статус бота: ${status}`, cid: -Date.now(), elements: [], attaches: [] }, notify: false });
            return;
          }
        }

        if (staffIds.includes(String(sender))) {
          console.log(`⏭ Сообщение от сотрудника (${sender}), пропускаю`);
          // Если сотрудник написал — значит он берёт этот чат, добавляем последнее сообщение клиента
          const lastClientMsg = lastClientMessage.get(chatId);
          if (lastClientMsg) {
            answeredMessages.add(lastClientMsg);
            console.log(`📝 Сотрудник взял чат ${chatId}, блокирую ответ бота на ${lastClientMsg}`);
          }
          return;
        }

        // Защита от дублей
        if (messageId && processedMessages.has(messageId)) {
          console.log(`⏭ Дубль сообщения ${messageId}, пропускаю`);
          return;
        }

        // Если это ответ на сообщение которое уже обработали — игнорируем
        if (replyToId && answeredMessages.has(replyToId)) {
          console.log(`⏭ Уже отвечали на сообщение ${replyToId}, пропускаю`);
          return;
        }

        if (messageId) {
          processedMessages.add(messageId);
          if (processedMessages.size > 500) {
            const first = processedMessages.values().next().value;
            processedMessages.delete(first);
          }
        }

        // Проверяем PDF файл
        const pdfAttach = attaches.find(a =>
          a._type === 'FILE' && a.name && a.name.toLowerCase().endsWith('.pdf')
        );

        if (pdfAttach) {
          console.log(`📎 PDF файл: ${pdfAttach.name}`);
          // Проверяем паузу
          if (botPaused) {
            console.log('⏸ БОТ НА ПАУЗЕ — PDF пропускаю');
            return;
          }
          // Если в этом чате уже запланирован ответ (на текстовое сообщение) — не отвечаем на PDF
          if (pendingReply.has(chatId)) {
            console.log(`⏭ Уже запланирован ответ в чат ${chatId}, PDF пропускаю`);
            return;
          }
          pendingReply.add(chatId);
          setTimeout(async () => {
            try {
              const fileUrl = await requestFileUrl(pdfAttach.fileId, chatId, messageId);
              if (!fileUrl) { console.log('❌ Не удалось получить ссылку'); pendingReply.delete(chatId); return; }
              console.log('📥 Скачиваю PDF...');
              const pdfBuffer = await downloadFile(fileUrl);
              const pdfText = await parsePdfBuffer(pdfBuffer);
              const houseInfo = parsePdfForHouse(pdfText);
              console.log('📄 Данные из PDF:', houseInfo);

              // Берём текст из текущего сообщения или из кэша чата (последние 10 минут)
              let baseText = text;
              if (!baseText) {
                const cached = chatTextCache.get(chatId);
                if (cached && (Date.now() - cached.time) < 10 * 60 * 1000) {
                  baseText = cached.text;
                  console.log('📋 Использую кэшированный текст:', baseText);
                }
              }

              // Объединяем данные из текста и PDF
              let combinedText = baseText || '';

              // Если материал "прочие" / неизвестен — не добавляем в расчёт, сотрудник разберётся
              if (houseInfo.material === 'unknown') {
                console.log(`⚠️ Материал стен неизвестен ("${houseInfo.materialText}") — имущество не считаем`);
                // Не добавляем материал — расчёт пройдёт только по жизни (если есть данные)
              } else if (houseInfo.material === 'brick') {
                combinedText += ' дом кирпич';
              } else if (houseInfo.material === 'wood') {
                combinedText += ' дом дерево';
              }
              // Добавляем год постройки с явным ключевым словом чтобы парсер не путал с другими годами
              if (houseInfo.yearBuilt) combinedText += ` год постройки ${houseInfo.yearBuilt}`;

              console.log('📝 Объединённый запрос:', combinedText);

              // Считаем
              const response = runCalculation(combinedText);
              if (!response) {
                // Не хватает данных — молчим, сотрудник разберётся сам
                console.log('⏭ PDF: не хватает данных для расчёта, пропускаю');
                pendingReply.delete(chatId);
                return;
              }

              setTimeout(() => {
                // Проверяем — вдруг сотрудник уже ответил пока шёл таймер
                if (answeredMessages.has(messageId)) {
                  console.log(`⏭ Сотрудник уже ответил на ${messageId}, бот молчит`);
                  pendingReply.delete(chatId);
                  return;
                }
                send(64, {
                  chatId,
                  message: { text: response, cid: -Date.now(), elements: [], attaches: [],
                    link: { type: 'REPLY', messageId } },
                  notify: true,
                });
                if (messageId) { answeredMessages.add(messageId); if (answeredMessages.size > 1000) { const f = answeredMessages.values().next().value; answeredMessages.delete(f); } }
                pendingReply.delete(chatId);
                console.log(`📤 Ответ отправлен в чат ${chatId}`);
              }, CONFIG.replyDelay);
            } catch(e) { console.error('Ошибка PDF:', e.message); pendingReply.delete(chatId); }
          }, 1000);
          return;
        }

        // Текстовое сообщение
        if (!text) return;
        console.log(`📨 [${chatId}] от ${sender}: "${text}"`);

        // Запоминаем последнее сообщение клиента в этом чате
        lastClientMessage.set(chatId, messageId);

        // Нормализуем текст
        const normalizedText = (() => {
          let t = text
            // Защищаем "Дом.РФ" — заменяем на ASCII-плейсхолдер чтобы не разбился
            .replace(/Дом\.?\s*РФ/gi, 'DOMRF')
            // Сначала обрабатываем слитные случаи: МОост → ост, МОосз → осз
            .replace(/МО(ост|осз)/gi, '$1')
            .replace(/(^|\s)МО(\s|$)/gi, ' ') // убираем МО (надбавка Ак Барс)
            .replace(/(^|\s)РТ(\s|$)/g, ' ') // убираем РТ (надбавка ВТБ)
            .replace(/(\d{4,})\.(\d{2})\b/g, '$1,$2') // 6716409.39 → 6716409,39
            // "кирп/дер", "кирпич/дерево" и т.п. — наружные стены кирпич, перегородки дерево → кирпич
            .replace(/кирп(?:ич)?\s*[\/\\]\s*(?:дер(?:ево)?|дерев\w*)/gi, 'кирпич')
            // "дер/кирп" — тоже кирпич (наружные стены первые)
            .replace(/дер(?:ево)?\s*[\/\\]\s*кирп(?:ич)?/gi, 'кирпич')
            // Числа с пробелами-разделителями тысяч: "2 600 000" → "2600000"
            .replace(/\b(\d{1,3}(?:\s\d{3})+)\b/g, s => s.replace(/\s/g, ''))
            // кв YYYYNNNNNN (слитно) → кв YYYY NNNNNN (разбиваем)
            .replace(/(кв(?:артир[аы]?)?\s*)(\d{4})(\d{6,})/gi, '$1$2 $3')
            // кв YYYY NNNNNN → квартира осз NNNNNN год YYYY
            .replace(/(кв(?:артир[аы]?)?\s+)(\d{4})\s+(\d{6,})/gi, 'квартира осз $3 год $2')
            .replace(/([а-яёА-ЯЁa-zA-Z])(\d)/g, '$1 $2') // буква+цифра → пробел
            .replace(/(\d)([а-яёА-ЯЁa-zA-Z])/g, '$1 $2') // цифра+буква → пробел
            .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2') // строчная+заглавная → пробел
            .replace(/([А-ЯЁ]{2,})([а-яё])/g, (m, p1, p2) => p1.slice(0,-1) + ' ' + p1.slice(-1) + p2)
            // Восстанавливаем название банка
            .replace(/DOMRF/g, 'Дом.РФ')
            .replace(/\s+/g, ' ').trim();
          // Если нет ключевого слова ост/осз/остаток, но есть большое число (7+ цифр) — добавляем "осз"
          if (!/\b(ост|осз|остаток)\b/i.test(t)) {
            t = t.replace(/(\d{7,}(?:[,.]\d+)?)/g, 'осз $1');
          }
          return t;
        })();

        console.log(`📝 Нормализованный текст: "${normalizedText}"`);

        // Сохраняем текст в кэш для последующей связки с PDF
        chatTextCache.set(chatId, { text: normalizedText, time: Date.now() });

        // Проверяем паузу — если botPaused, бот молчит
        if (botPaused) {
          console.log('⏸ БОТ НА ПАУЗЕ (напиши /resume чтобы продолжить)');
          return;
        }

        const response = runCalculation(normalizedText);
        if (!response) { console.log('⏭ Не запрос расчёта, пропускаю'); return; }

        // Если уже запланирован ответ в этот чат — не добавляем второй
        if (pendingReply.has(chatId)) {
          console.log(`⏭ Уже запланирован ответ в чат ${chatId}, пропускаю`);
          return;
        }
        pendingReply.add(chatId);

        setTimeout(() => {
          // Проверяем — вдруг сотрудник уже ответил пока шёл таймер
          console.log(`🔍 Проверка перед отправкой: messageId=${messageId}, answeredMessages=${JSON.stringify([...answeredMessages].slice(-5))}`);
          if (answeredMessages.has(messageId)) {
            console.log(`⏭ Сотрудник уже ответил на ${messageId}, бот молчит`);
            pendingReply.delete(chatId);
            return;
          }
          send(64, {
            chatId,
            message: { text: response, cid: -Date.now(), elements: [], attaches: [],
              link: { type: 'REPLY', messageId } },
            notify: true,
          });
          if (messageId) { answeredMessages.add(messageId); if (answeredMessages.size > 1000) { const f = answeredMessages.values().next().value; answeredMessages.delete(f); } }
          pendingReply.delete(chatId);
          console.log(`📤 Ответ отправлен в чат ${chatId}`);
        }, CONFIG.replyDelay);
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
console.log('🤖 Max Bot — Калькулятор КИС (Ингосстрах) v2.0');
console.log('==========================================');
console.log(`⏱ Время ответа: ${CONFIG.replyDelay / 1000} сек`);

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
