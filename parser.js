// parser.js
// Гибридный интеллектуальный парсер (правила + эвристики)
// Возвращает structured JSON: parseTextToObject(text)
// Экспорт: module.exports.parseTextToObject (Node) и window.parseTextToObject (browser)

// -----------------------------
// Настройка: словари и параметры
// -----------------------------
// Старый BANK_SYNONYMS удален - теперь используется window.BANKS из config_banks.js

// ключевые синонимы рисков
const RISK_KEYWORDS = {
  life: ["жизн", "жизнь", "life", "личн", "страхование жизни", "жизнь и здоровье"],
  property: ["имущ", "имущество", "квар", "кв-", "кв ", "квартир", "дом", "апарт", "апартам", "таун", "таунхаус", "таун-", "частный дом", "жилой дом", "им", "имущ", "имущества", "страхование имущества"],
  titul: ["титул", "title", "страхование титула"]
};

// Резервная копия синонимов банков (если config_banks.js не загрузится)
const BANK_SYNONYMS = {
  "Абсолют Банк": ["абсолют", "абсолют банк", "абсолютбанк", "абсолют-банк"],
  "Ак Барс": ["ак барс", "ак-барс", "акбарс"],
  "Альфа Банк": ["альфа", "альфабанк", "альфа банк"],
  "Банк СПБ": ["банк спб", "спб", "спб банк", "банк санкт-петербург"],
  "ВТБ": ["втб", "втб банк", "втб рт", "втб ростов", "втб екб", "втб екатеринбург"],
  "Дом.РФ": ["дом.рф","дом рф","домрф","дом рф","дом. рф"],
  "Зенит": ["зенит","зенит банк"],
  "ИТБ / ТКБ": ["итб", "ткб", "ткб/итб", "итб/ткб"],
  "Металлинвест": ["металлинвест", "металлинвестбанк"],
  "МКБ": ["мкб", "мкб банк", "московский кредитный банк"],
  "МТС Банк": ["мтс", "мтс банк"],
  "ПСБ (Промсвязьбанк)": ["псб", "промсвязьбанк", "псб банк"],
  "Райффайзенбанк": ["райф", "райффайзен", "райфайзенбанк"],
  "РСХБ": ["рсхб", "россельхоз", "россельхозбанк"],
  "Сбербанк": ["сбер", "сбербанк", "sber"],
  "Т-Банк / Росбанк": ["т банк", "т-банк", "t bank", "тинькофф", "тиньков", "тбанк", "т-банк", "росбанк", "т банк", "тинкофф", "tinkoff"],
  "Тимер Банк": ["тимер", "тимер банк"],
  "УБРИР": ["убрир", "у б р и р", "ubr"],
  "Уралсиб": ["уралсиб"],
  "Энергобанк": ["энерго", "энергобанк", "энерго банк", "энергобанк", "энерго-банк"],
  "Юникредит Банк": ["юникредит", "unicredit", "uni credit"]
};

// общая настройка
const MIN_BIG_NUMBER = 1000; // минимальный числовой кандидат на ОСЗ/остаток
const CURRENT_YEAR = (new Date()).getFullYear();

// -----------------------------
// Утилиты
// -----------------------------
function normalizeText(t) {
  if (!t) return "";
  // приводим к единому виду: убираем лишние пробелы, нормализуем дефисы, кавычки
  return t.replace(/\u00A0/g, ' ')
          .replace(/[«»“”„"]/g, '"')
          .replace(/[\t ]+/g, ' ')
          .replace(/\r/g, '\n')
          .trim();
}

function toLower(t){ return (t||"").toLowerCase(); }

// нормализация чисел: "5 632 057", "3.991.511,63" -> integer (рубли округлённые)
function normalizeNumber(s) {
  if (!s && s !== 0) return null;
  s = String(s);
  // удаляем рубли/₽ и слова
  s = s.replace(/₽/g, '').replace(/р(уб|ублей)?/gi,'');
  // заменить запятые внутри дроби на точку, убрать пробелы тысяч
  // возможны варианты: "3 991 511,63" -> "3991511.63"
  s = s.replace(/\s+/g, '');
  // если есть запятая и точка, заменить последнюю запятую на дробную точку
  s = s.replace(',', '.');
  // оставить только digits and dot
  s = s.replace(/[^\d.]/g, '');
  if (s === '') return null;
  let v = Number(s);
  if (isNaN(v)) return null;
  // сохраняем точность до копеек (2 знака после запятой)
  return Math.round(v * 100) / 100;
}

// простой левенштейн для небольших строк (для устойчивого распознавания банков)
function editDistance(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, ()=>Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}
function similarityScore(a,b){
  if(!a||!b) return 0;
  const ed = editDistance(a,b);
  const maxlen = Math.max(a.length,b.length);
  return 1 - (ed / maxlen);
}

// извлекает все даты формата DD.MM.YYYY
function extractDates(text) {
  const re = /(\d{1,2}\.\d{1,2}\.\d{4})/g;
  const arr = [];
  let m;
  while ((m=re.exec(text)) !== null) arr.push(m[1]);
  return arr;
}

// извлекает все 4-значные года 1900-2099
function extractYears(text) {
  const re = /\b(19|20)\d{2}\b/g;
  const arr = [];
  let m;
  while ((m=re.exec(text)) !== null) arr.push(Number(m[0]));
  return arr;
}

// извлечение процентов "6%", "5,9%"
function extractPercents(text) {
  const re = /(\d+(?:[.,]\d+)?)\s*%/g;
  const arr = [];
  let m;
  while ((m=re.exec(text)) !== null) {
    arr.push(Number(String(m[1]).replace(',','.')));
  }
  return arr;
}

// поиск больших чисел (кандидаты на сумму)
function findLargeNumbers(text) {
  const lines = text.split('\n');
  const arr = [];
  for (const line of lines) {
    // Ищем числа в строке, игнорируя слова
    const re = /\b(\d+(?:[.,]\d+)*(?:\s+\d+(?:[.,]\d+)*)*)\b/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const n = normalizeNumber(m[1]);
      if (n && n >= MIN_BIG_NUMBER) arr.push(n);
    }
  }
  return arr;
}

// Разбор даты формата DD.MM.YYYY или любого поддерживаемого Date
function parseDateDMY(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return null;
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // месяцы 0-11
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
      return d;
    }
  }
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

// Корректный расчет возраста с учетом дня рождения и даты договора
function calculateAge(dobStr, asOfDateStr = null) {
  const dob = parseDateDMY(dobStr);
  if (!dob) return null;
  const ref = parseDateDMY(asOfDateStr) || new Date();
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

// попытка извлечь сумму после ключа (осз / ост / остаток)
function extractOszByKey(text) {
  // ключи с возможной опечаткой (включая заглавные буквы)
  // Ищем ключевое слово, затем пробелы, затем число (только цифры и пробелы внутри числа)
  const lines = text.split('\n');
  for (const line of lines) {
    const re = /(?:ост|осз|ОСЗ|остаток|остаток задолженности|сумма кредита|сумма|Остаток|Остаточная\s+сумма)\s+(\d+(?:\s+\d+)*(?:\.\d+)?)/i;
    const m = re.exec(line);
    if (m) {
      // Проверяем, что найденное число не является процентом надбавки
      const fullMatch = m[0];
      const numberPart = m[1];
      // Если после числа идет %, то это процент, а не OSZ
      if (fullMatch.includes('%') || text.substring(m.index + fullMatch.length).trim().startsWith('%')) {
        continue;
      }
      const n = normalizeNumber(numberPart);
      if (n) return n;
    }
  }
  return null;
}

// извлечение "кд" (даты сделки / кредитной даты)
function extractCreditDate(text) {
  // Поиск даты после ключевых слов (кд, выдача, договор, кредит)
  // Ищем все возможные комбинации и берем последнюю найденную дату
  const patterns = [
    /кд\s+от\s+(\d{1,2}\.\d{1,2}\.\d{4})/ig,
    /кд\.\s*(\d{1,2}\.\d{1,2}\.\d{4})/ig,  // "кд. 21.02.2025"
    /кд\.\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*г\.?/ig,  // "кд. 21.02.2025г."
    /кд[^\d]{1,10}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
    /кредитный\s+договор\s+от\s+(\d{1,2}\.\d{1,2}\.\d{4})/ig,
    /кредит\s+от\s+(\d{1,2}\.\d{1,2}\.\d{4})/ig,
    /выдача\s+(\d{1,2}\.\d{1,2}\.\d{4})/ig,
    /договор\s+от\s+(\d{1,2}\.\d{1,2}\.\d{4})/ig
  ];

  let latestDate = null;
  let latestPosition = -1;

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const date = match[1];
      const position = match.index;
      if (position > latestPosition) {
        latestDate = date;
        latestPosition = position;
      }
    }
  }

  return latestDate;
}

// -----------------------------
// Распознавание банка (синонимы + fuzzy)
function detectBank(text) {
  const t = toLower(normalizeText(text));

  // Используем window.BANKS если он загружен, иначе BANK_SYNONYMS
  const banksData = window.BANKS || BANK_SYNONYMS;

  // 1) прямое includes по синонимам
  for (const [canon, bankConfig] of Object.entries(banksData)) {
    const syns = bankConfig.aliases || bankConfig;
    for (const s of syns) if (t.includes(toLower(s))) return { name: canon, confidence: 1.0 };
  }
  // 2) fuzzy: проверяем слова текста на похожесть
  const tokens = Array.from(new Set(t.split(/[\s,;.()]+/))).filter(Boolean);
  let best = {name:null, score:0};
  for (const [canon, bankConfig] of Object.entries(banksData)) {
    const syns = bankConfig.aliases || bankConfig;
    for (const s of syns) {
      for (const tok of tokens) {
        const score = similarityScore(tok, toLower(s));
        if (score > best.score) best = {name:canon, score};
      }
    }
  }
  if (best.score >= 0.7) return { name: best.name, confidence: best.score };
  return { name: null, confidence: 0 };
}

// -----------------------------
// Выделение заемщиков (несколько)
// Форматы, которые мы поддерживаем:
// "муж, 07.01.1985", "она 25.11.1992", "он - 23.09.1975", "он - 50% - 13.04.1968"
// также "муж 60% - 13.04.1980", "она - 50% - 02.05.1968"
function extractBorrowers(text, contractDate = null) {
  const found = [];
  const lines = text.split(/[\n\r]/g).map(l => l.trim()).filter(Boolean);

  // 1) Сначала ищем заемщиков в отдельных строках (более надежно)
  for (const line of lines) {
    // Пропускаем строки, которые явно являются датами кредитных договоров
    if (/\bкд\b/i.test(line) || /\bкредитный договор\b/i.test(line) || /^\d{1,2}\.\d{1,2}\.\d{4}/.test(line.trim())) {
      continue;
    }

    // Ищем заемщиков с долями (формат: "жен 04.06.1981- 50%" или "он - 50%- 13.04.1968")
    const sharePattern = /(мужчина|женщина|муж|жен|она|он|мужч)[^\d]{0,20}(\d{1,2}\.\d{1,2}\.\d{4})[^\d]{0,20}(\d{1,3})\s*%/ig;

    // Специальный паттерн для дат в начале строки: "29.12.1983 мужчина"
    const dateFirstPattern = /^(\d{1,2}\.\d{1,2}\.\d{4})\s+(мужчина|женщина|муж|жен|она|он|мужч)/ig;

    // Паттерн для даты перед полом: "02.03.1980 ЖЕНЩИНА"
    const dateBeforeGenderPattern = /(\d{1,2}\.\d{1,2}\.\d{4})\s+(ЖЕНЩИНА|МУЖЧИНА|ЖЕН|МУЖ|ОНА|ОН|МУЖЧ)/ig;

    // Обработка паттерна "дата перед полом"
    const dateBeforeMatches = Array.from(text.matchAll(dateBeforeGenderPattern));
    for (const match of dateBeforeMatches) {
      const dob = match[1];
      const genderWord = match[2].toLowerCase();
      const gender = (genderWord === 'женщина' || genderWord === 'жен' || genderWord === 'она') ? 'f' : 'm';

      if (!found.some(f => f.dob === dob)) {
        found.push({
          dob: dob,
          gender: gender,
          share: undefined
        });
      }
    }

    // Сначала проверяем специальный паттерн для дат в начале
    const dateFirstMatches = Array.from(line.matchAll(dateFirstPattern));
    for (const match of dateFirstMatches) {
      const dob = match[1];
      const genderWord = match[2].toLowerCase();
      const gender = (genderWord === 'женщина' || genderWord === 'жен' || genderWord === 'она') ? 'f' : 'm';

      if (!found.some(f => f.dob === dob)) {
        found.push({ dob, gender, share: 100, raw: line });
      }
    }

    const matches = Array.from(line.matchAll(sharePattern));

    for (const match of matches) {
      const genderWord = match[1].toLowerCase();
      const gender = (genderWord === 'женщина' || genderWord === 'жен' || genderWord === 'она') ? 'f' : 'm';
      const dob = match[2];
      const share = Number(match[3]);

      // Проверяем, что такая дата еще не добавлена
      if (!found.some(f => f.dob === dob)) {
        found.push({ dob, gender, share, raw: line });
      }
    }

    // Если не нашли с долями, ищем просто пол + дата
    if (!sharePattern.test(line)) {
      const simplePattern = /(мужчина|женщина|муж|жен|она|он|мужч)[^\d]{0,20}(\d{1,2}\.\d{1,2}\.\d{4})/ig;
      const simpleMatches = Array.from(line.matchAll(simplePattern));

      for (const match of simpleMatches) {
        const genderWord = match[1].toLowerCase();
        const gender = (genderWord === 'женщина' || genderWord === 'жен' || genderWord === 'она') ? 'f' : 'm';
        const dob = match[2];

        // Проверяем, что такая дата еще не добавлена
        if (!found.some(f => f.dob === dob)) {
          found.push({ dob, gender, share: undefined, raw: line });
        }
      }
    }
  }

  // 2) Если все еще не найдено, ищем глобально (менее надежно)
  if (found.length === 0) {
    const globalPatterns = [
      /(женщина)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(мужчина)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(мужч)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(женщина)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(она)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(жен)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(он)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(муж)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(муж)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig
    ];

    for (const pattern of globalPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const genderWord = match[1].toLowerCase();
        const gender = (genderWord === 'женщина' || genderWord === 'жен' || genderWord === 'она') ? 'f' : 'm';
        const dob = match[2];

        // Проверяем, что это не дата кредитного договора
        if (!/\bкд\b/i.test(match[0]) && !found.some(f => f.dob === dob)) {
          found.push({ dob, gender, share: undefined });
        }
      }
    }
  }

  // 3) Нормализация долей
  if (found.length > 1) {
    const withoutShare = found.filter(f => f.share === undefined);
    if (withoutShare.length === found.length) {
      // Все без долей - делим поровну
      const equalShare = Math.floor(100 / found.length);
      found.forEach((f, i) => {
        f.share = i < found.length - 1 ? equalShare : 100 - (equalShare * (found.length - 1));
      });
    } else {
      // Некоторые с долями - оставляем как есть
      found.forEach(f => {
        if (f.share === undefined) f.share = 0;
      });
    }
  } else if (found.length === 1) {
    found[0].share = found[0].share || 100;
  }

  // 4) Добавляем возраст
  found.forEach(borrower => {
    if (borrower.dob) {
      borrower.age = calculateAge(borrower.dob, contractDate);
          // Парсим рост и вес из текста (формат: "рост 170 вес 85" или "170см 85кг")
    const heightMatch = text.match(/\b(?:рост\s*)?(\d{2,3})\s*(?:см)?\b/i);
    const weightMatch = text.match(/\b(?:вес\s*)?(\d{2,3})\s*(?:кг)?\b/i);
    
    if (heightMatch && heightMatch[1]) {
      const height = Number(heightMatch[1]);
      if (height >= 100 && height <= 250) { // разумный диапазон роста
        borrower.height = height;
      }
    }
    
    if (weightMatch && weightMatch[1]) {
      const weight = Number(weightMatch[1]);
      if (weight >= 30 && weight <= 300) { // разумный диапазон веса
        borrower.weight = weight;
      }
    }

    }
  });

  return found;
      
}


// -----------------------------
// Основная функция парсинга (public)
// -----------------------------
function parseTextToObject(rawText) {
  const text0 = normalizeText(rawText || "");
  const text = text0;
  const lower = toLower(text);
  const result = {
    raw: rawText,
    textNormalized: text,
    bank: null,
    bankConfidence: 0,
    osz: null,
    oszCandidates: [],
    contractDate: null,
    risks: { life:false, property:false, titul:false },
    objectType: null,
    material: null,
    yearBuilt: null,
    gas: null,
    markupPercent: null,
    borrowers: [],
    confidence: 0.0,
    notes: []
  };

  // 1) Bank
  const dbank = detectBank(text);
  result.bank = dbank.name;
  result.bankConfidence = dbank.confidence;

  // 2) Dates and years
  result.dates = extractDates(text); // all dates present
  const years = extractYears(text);
  if (years.length > 0) result.yearBuilt = years[years.length - 1];

  // credit date
  const credit = extractCreditDate ? extractCreditDate(text) : null;
  if (credit) result.contractDate = credit;
  else {
    // heuristic: if there's a date that mentions "кд" near it not found, else fallback: choose dates that appear after "кд" or "от"
    const tokens = text.split(/\n/);
    for (const t of tokens) {
      if (/\bкд\b|\bкредит\b|\bдоговор\b/i.test(t)) {
        const d = extractDates(t);
        if (d && d.length) { result.contractDate = d[0]; break; }
      }
    }
  }

  // 3) OSZ (остаток/осз)
  const large = findLargeNumbers(text);
  if (large.length>0) {
    // heuristics: prefer numbers that appear before word 'ост' or 'осз' or 'ОСЗ'
    const beforeOst = text.match(/(\d[\d\s\.,]*?)[^\d\n\r]{0,10}(?:ост|осз|ОСЗ|остаток)/i);
    if (beforeOst) {
      const n = normalizeNumber(beforeOst[1]);
      if (n && n >= MIN_BIG_NUMBER) { result.osz = n; result.oszCandidates.push({source:'beforeKey',value:n}); }
    }
    // also check numbers after keywords (but exclude percentages)
    if (!result.osz) {
      const afterOst = text.match(/(?:ост|осз|ОСЗ|остаток)[^\d\n\r]{0,10}(\d[\d\s\.,]*?)(?!\s*%|%)(?:\D|\n|$)/i);
      if (afterOst) {
        const n = normalizeNumber(afterOst[1]);
        if (n && n >= MIN_BIG_NUMBER) { result.osz = n; result.oszCandidates.push({source:'afterKey',value:n}); }
      }
    }
    if (!result.osz) {
      // Если есть только одно большое число, используем его как OSZ
      if (large.length === 1) {
        result.osz = large[0];
        result.oszCandidates.push({source:'singleLarge',value:large[0]});
      } else if (large.length > 1) {
        // Если несколько чисел, выбираем наиболее подходящее (обычно первое)
        result.osz = large[0];
        result.oszCandidates.push({source:'firstOfMultiple',value:large[0]});
      }
    }
    // push other candidates
    for (let i=1;i<large.length;i++) result.oszCandidates.push({source:'otherLarge',value:large[i]});
  }

  // 4) borrowers (перенесено вверх для правильного определения рисков)
  result.borrowers = extractBorrowers(text, result.contractDate);

  // 4.1) Дополнительная проверка на наличие слов, указывающих на заемщиков
  // Если есть слова "муж"/"жен"/"мужчина"/"женщина" без даты, создаем заемщика
  if (result.borrowers.length === 0) {
    const genderWords = /\b(мужчина|женщина|муж|жен|он|она)\b/i;
    if (genderWords.test(text)) {
      // Определяем пол
      let gender = null;
      if (/\b(мужчина|муж|он)\b/i.test(text)) gender = 'male';
      else if (/\b(женщина|жен|она)\b/i.test(text)) gender = 'female';

      // Создаем заемщика без даты рождения (она будет запрошена в валидации)
      result.borrowers.push({
        dob: null,
        gender: gender,
        age: null,
        share: 100
      });
    }
  }

  // 5) Risks detection - сначала определяем явно указанные риски
  let hasExplicitRiskMention = false;

  // Проверяем явные упоминания рисков
  for (const [risk, keys] of Object.entries(RISK_KEYWORDS)) {
    for (const k of keys) {
      if (lower.includes(k)) {
        result.risks[risk] = true;
        hasExplicitRiskMention = true;
      }
    }
  }

  // Дополнительная проверка для специальных случаев
  if (lower.includes('ж+им') || lower.includes('ж + им') || lower.includes('жизнь и имущ') || lower.includes('жизнь и имущество')) {
    result.risks.life = true;
    result.risks.property = true;
    hasExplicitRiskMention = true;
  }

  if (lower.includes('2 риска') || lower.includes('два риска')) {
    result.risks.life = true;
    result.risks.property = true;
    hasExplicitRiskMention = true;
  }

  // Автоматическое дополнение рисков (всегда проверяем)
  // Даже если есть явные упоминания, добавляем недостающие риски автоматически
  const hasBorrowers = result.borrowers.length > 0;
  const hasProperty = result.objectType !== null || /\b(дом|кв|квартир|таун|имущ|имуществ|частный дом|жилой дом)\b/i.test(text);

  // Логика дополнения рисков:
  // Всегда добавляем жизнь, если есть заемщики
  // Всегда добавляем имущество, если есть объект недвижимости
  // Это работает независимо от явных упоминаний

  if (hasBorrowers && !result.risks.life) {
    result.risks.life = true;
  }

  if (hasProperty && !result.risks.property) {
    result.risks.property = true;
  }
  // 5) object type (перенесено вверх для правильного определения рисков)
  if (/(таунхаус|таун)/i.test(text)) result.objectType = 'townhouse';
  else if (/(апарт|апартам|апартаменты)/i.test(text)) result.objectType = 'apartment';
  else if (/(кварти|кв[^а-яё]|кв-|кв |квар|кв-ра)/i.test(text)) result.objectType = 'flat';
  else if (/(дом|жилой дом|частный дом)/i.test(text)) {
    // Определяем тип дома по материалу
    if (/(кирпич|блок|блоки|железобетон|ж\/б)/i.test(text)) result.objectType = 'house_brick';
    else if (/(дерев|древес|каркас|брус)/i.test(text)) result.objectType = 'house_wood';
    else result.objectType = 'house_brick'; // по умолчанию кирпич
  }

  // Если есть явные упоминания - оставляем только их, без автоматического добавления

  // 6) material
  if (/\bкирпич|блок|блоки|кирпичное\b/i.test(text)) result.material = 'brick';
  else if (/\bдерев|древес|каркас|брус\b/i.test(text)) result.material = 'wood';
  else if (/\bгазобетон\b/i.test(text)) result.material = 'gasobet';

  // 7) gas
  if (/\b(газ есть|газ: есть|есть газ)\b/i.test(text)) result.gas = true;
  else if (/\b(газа нет|нет газа|газ отсутствует)\b/i.test(text)) result.gas = false;

  // 8) markup / ставка
  const percents = extractPercents(text);
  if (percents.length>0) {
    // heuristics: if there's "ставка" word around the percent - it's rate; if percent followed by "ставк" or "ст" it's manual markup
    const m = text.match(/(ставк[ае]|ставка|ставк:|ст\s)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*%/i);
    if (m) result.markupPercent = Number(String(m[2]).replace(',','.'));
    else result.markupPercent = percents[0];
  }


  // if no borrowers found but a single date present and risk life -> assume that date is borrower DOB
  if (result.borrowers.length===0 && result.risks.life) {
    const allDates = result.dates;
    if (allDates.length>0) {
      // choose earliest date that is plausible as DOB (year > 1900 and age 18-100)
      for (const d of allDates) {
        const parts = d.split('.');
        if (parts.length===3) {
          const age = calculateAge(d, result.contractDate);
          if (age >= 18 && age <= 100) {
            result.borrowers.push({ dob: d, gender: null, age, share:100 });
            break;
          }
        }
      }
    }
  }

  // 10) normalise borrowers shares if needed (ensure sum 100 unless VTB special case is required externally)
  const sumShares = result.borrowers.reduce((s,b)=>s+(b.share||0),0);
  if (result.borrowers.length>0 && sumShares !== 100) {
    // Distribute equally if none defined
    const anyDefined = result.borrowers.some(b => b.share !== undefined);
    if (!anyDefined) {
      const eq = Math.floor(100 / result.borrowers.length);
      for (let i=0;i<result.borrowers.length;i++){
        result.borrowers[i].share = (i === result.borrowers.length-1) ? (100 - eq*(result.borrowers.length-1)) : eq;
      }
    } else {
      // normalize proportionally
      let total = result.borrowers.reduce((s,b)=>s+(b.share||0),0);
      if (total === 0) {
        const eq = Math.floor(100 / result.borrowers.length);
        for (let i=0;i<result.borrowers.length;i++){
          result.borrowers[i].share = (i === result.borrowers.length-1) ? (100 - eq*(result.borrowers.length-1)) : eq;
        }
      } else {
        for (const b of result.borrowers) b.share = Math.round((b.share||0) * 100 / total);
      }
    }
  }

  // 11) If osz missing but property and there is a big number -> guess
  if (!result.osz && result.risks.property) {
    const nums = findLargeNumbers(text);
    if (nums.length>0) { result.osz = nums[0]; result.oszCandidates.push({source:'guess', value:nums[0]}); result.notes.push('osz guessed from largest number'); }
  }

  // 12) Confidence scoring (simple heuristic)
  let conf = 0;
  if (result.bank) conf += 0.25 * (result.bankConfidence || 1);
  if (result.osz) conf += 0.25;
  if (result.borrowers.length>0) conf += Math.min(0.25, 0.1 * result.borrowers.length);
  if (result.objectType) conf += 0.1;
  if (result.material) conf += 0.05;
  if (result.markupPercent !== null) conf += 0.05;
  // clamp
  result.confidence = Math.max(0, Math.min(1, conf));
  result.confidenceText = result.confidence >= 0.85 ? 'high' : result.confidence >= 0.6 ? 'medium' : 'low';

  return result;
}

// -----------------------------
// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseTextToObject };
}
if (typeof window !== 'undefined') {
  window.parseTextToObject = parseTextToObject;

}



