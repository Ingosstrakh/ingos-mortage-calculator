// parser.js
// Гибридный интеллектуальный парсер (правила + эвристики)
// Возвращает structured JSON: parseTextToObject(text)
// Экспорт: module.exports.parseTextToObject (Node) и window.parseTextToObject (browser)

// -----------------------------
// Настройка: словари и параметры
// -----------------------------
const BANK_SYNONYMS = {
  "Сбербанк": ["сбер", "сбербанк", "сбербанк тт", "сбербанк тат", "сбер банк", "сбер мо", "сбер татарстан", "сбер новая", "сбербанк татарстан"],
  "ВТБ": ["втб", "втб банк", "втб рт", "втб ростов", "втб екб", "втб екатеринбург"],
  "Альфа Банк": ["альфа", "альфабанк", "альфа банк", "альфабанк новая ипотека", "альфа-банк", "альфа банк 6%", "альфа 6%", "альфа 6,8%", "альфа 8,1%"],
  "Ак Барс": ["ак барс", "акбарс", "ак барс банк", "акбарс банк"],
  "РСХБ": ["рсхб", "россельхозбанк", "рсхб банк"],
  "Дом.РФ": ["дом.рф","дом рф","домрф","дом рф","дом. рф"],
  "Райффайзен": ["райф", "райффайзен", "райфайзенбанк"],
  "МТС": ["мтс","мтс банк"],
  "Зенит": ["зенит","зенит банк"],
  "Открытие": ["открытие", "открытие (втб)"],
  "УБРИР": ["убрир","убрир банк"],
  "Уралсиб": ["уралсиб", "уралсиб рт"],
  "Юникредит": ["юникредит", "юникредит рт"],
  "Абсолют": ["абсолют","абсолют банк"],
  "Металлинвест": ["металлинвест"],
  "ТКБ": ["ткб","итб"],
  "Промсвязьбанк": ["промсвязь","промсвязьбанк"],
  // дополни при необходимости
};

// ключевые синонимы рисков
const RISK_KEYWORDS = {
  life: ["жизн", "жизнь", "life", "личн", "страхование жизни", "жизнь и здоровье"],
  property: ["имущ", "имущество", "квар", "кв-", "кв ", "квартир", "дом", "апарт", "апартам", "таун", "таунхаус", "таун-", "частный дом", "жилой дом", "им", "имущ", "имущества", "страхование имущества"],
  titul: ["титул", "title", "страхование титула"]
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
function findLargeNumbers(text) { const re = /(\d[\d\s.,]{3,}\d)/g;
  const arr = [];
  let m;
  while ((m=re.exec(text)) !== null) {
    const n = normalizeNumber(m[1]);
    if (n && n >= MIN_BIG_NUMBER) arr.push(n);
  }
  return arr;
}

// попытка извлечь сумму после ключа (осз / ост / остаток)
function extractOszByKey(text) {
  // ключи с возможной опечаткой
  const re = /(?:ост|осз|остаток|остаток задолженности|сумма кредита|сумма)[^\d\n\r]{0,30}(\d[\d\s\.,]*?)(?:\s|$|\n)/ig;
  const m = re.exec(text);
  if (m) {
    const n = normalizeNumber(m[1]);
    if (n) return n;
  }
  return null;
}

// извлечение "кд" (даты сделки / кредитной даты)
function extractCreditDate(text) {
  // ищем "кд" или "кд от" или "кд:" "кд с" "кредитный договор от"
  const re = /\b(?:кд|кд от|кредитный договор|кредит от|к.д.)\b[^\d]{0,10}(\d{1,2}\.\d{1,2}\.\d{4})/ig;
  const m = re.exec(text);
  if (m) return m[1];
  // fallback: look for 'кд' token possibly adjacent
  // also search for "кд от DD.MM.YYYY" with multiple variants
  return null;
}

// -----------------------------
// Распознавание банка (синонимы + fuzzy)
function detectBank(text) {
  const t = toLower(normalizeText(text));
  // 1) прямое includes по синонимам
  for (const [canon, syns] of Object.entries(BANK_SYNONYMS)) {
    for (const s of syns) if (t.includes(toLower(s))) return { name: canon, confidence: 1.0 };
  }
  // 2) fuzzy: проверяем слова текста на похожесть
  const tokens = Array.from(new Set(t.split(/[\s,;.()]+/))).filter(Boolean);
  let best = {name:null, score:0};
  for (const [canon, syns] of Object.entries(BANK_SYNONYMS)) {
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
function extractBorrowers(text) {
  const found = [];
  const lines = text.split(/[\n\r]/g).map(l => l.trim()).filter(Boolean);

  // 1) Сначала ищем заемщиков в отдельных строках (более надежно)
  for (const line of lines) {
    // Пропускаем строки, которые явно являются датами кредитных договоров
    if (/\bкд\b/i.test(line) || /\bкредитный договор\b/i.test(line) || /^\d{1,2}\.\d{1,2}\.\d{4}/.test(line.trim())) {
      continue;
    }

    // Ищем заемщиков с долями (формат: "жен 04.06.1981- 50%" или "он - 50%- 13.04.1968")
    const sharePattern = /(мужчина|женщина|муж|жен|он|она|мужч)[^\d]{0,20}(\d{1,2}\.\d{1,2}\.\d{4})[^\d]{0,20}(\d{1,3})\s*%/ig;

    // Специальный паттерн для дат в начале строки: "29.12.1983 мужчина"
    const dateFirstPattern = /^(\d{1,2}\.\d{1,2}\.\d{4})\s+(мужчина|женщина|муж|жен|он|она|мужч)/ig;

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
      const simplePattern = /(мужчина|женщина|муж|жен|он|она|мужч)[^\d]{0,20}(\d{1,2}\.\d{1,2}\.\d{4})/ig;
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
      /(она)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(он)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
      /(жен)[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/ig,
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
      const parts = borrower.dob.split('.');
      if (parts.length === 3) {
        const yyyy = Number(parts[2]);
        borrower.age = CURRENT_YEAR - yyyy;
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
    creditDate: null,
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
  if (credit) result.creditDate = credit;
  else {
    // heuristic: if there's a date that mentions "кд" near it not found, else fallback: choose dates that appear after "кд" or "от"
    const tokens = text.split(/\n/);
    for (const t of tokens) {
      if (/\bкд\b|\bкредит\b|\bдоговор\b/i.test(t)) {
        const d = extractDates(t);
        if (d && d.length) { result.creditDate = d[0]; break; }
      }
    }
  }

  // 3) OSZ (остаток/осз)
  const oszByKey = extractOszByKey(text);
  if (oszByKey) {
    result.osz = oszByKey;
    result.oszCandidates.push({source:'key', value:oszByKey});
  } else {
    const large = findLargeNumbers(text);
    if (large.length>0) {
      // heuristics: prefer first large number that appears after word 'ост' or 'осз'
      const afterOst = text.match(/(?:ост|осз|остаток)[^\d\n\r]{0,40}(\d[\d\s\.,]*)/i);
      if (afterOst) {
        const n = normalizeNumber(afterOst[1]);
        if (n) { result.osz = n; result.oszCandidates.push({source:'afterKey',value:n}); }
      } 
      if (!result.osz) { result.osz = large[0]; result.oszCandidates.push({source:'firstLarge',value:large[0]}); }
      // push other candidates
      for (let i=1;i<large.length;i++) result.oszCandidates.push({source:'otherLarge',value:large[i]});
    }
  }

  // 4) Risks detection - сначала определяем явно указанные риски
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

  // Если нет явных упоминаний рисков, определяем автоматически
  if (!hasExplicitRiskMention) {
    // Автоматическое определение рисков на основе контента
    const hasBorrower = result.borrowers.length > 0;
    const hasProperty = result.objectType !== null || /\b(дом|кв|квартир|таун|имущ|имуществ|частный дом|жилой дом)\b/i.test(text);

    // Логика определения рисков:
    // 1. Если есть заемщик И есть объект недвижимости - включаем оба риска (жизнь + имущество)
    // 2. Если есть только заемщик - жизнь
    // 3. Если есть только объект - имущество
    // 5. Если ничего нет - оставляем как есть (ошибка)

    if (hasBorrower && hasProperty) {
      result.risks.life = true;
      result.risks.property = true;
    } else if (hasBorrower) {
      result.risks.life = true;
    } else if (hasProperty) {
      result.risks.property = true;
    }
  }

  // 5) object type
  if (/(таунхаус|таун)/i.test(text)) result.objectType = 'townhouse';
  else if (/(апарт|апартам|апартаменты)/i.test(text)) result.objectType = 'apartment';
  else if (/(кварти|кв[^а-яё]|кв-|кв |квар|кв-ра)/i.test(text)) result.objectType = 'flat';
  else if (/(дом|жилой дом|частный дом)/i.test(text)) {
    // Определяем тип дома по материалу
    if (/(кирпич|блок|блоки|железобетон|ж\/б)/i.test(text)) result.objectType = 'house_brick';
    else if (/(дерев|древес|каркас|брус)/i.test(text)) result.objectType = 'house_wood';
    else result.objectType = 'house_brick'; // по умолчанию кирпич
  }

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
    // heuristics: if there's "ставка" word around the percent - it's rate; if percent followed by "ставк" it's manual markup
    const m = text.match(/(ставк[ае]|ставка|ставк:)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*%/i);
    if (m) result.markupPercent = Number(String(m[2]).replace(',','.'));
    else result.markupPercent = percents[0];
  }

  // 9) borrowers
  result.borrowers = extractBorrowers(text);

  // if no borrowers found but a single date present and risk life -> assume that date is borrower DOB
  if (result.borrowers.length===0 && result.risks.life) {
    const allDates = result.dates;
    if (allDates.length>0) {
      // choose earliest date that is plausible as DOB (year > 1900 and age 18-100)
      for (const d of allDates) {
        const parts = d.split('.');
        if (parts.length===3) {
          const y = Number(parts[2]);
          const age = CURRENT_YEAR - y;
          if (age >= 18 && age <= 100) {
            result.borrowers.push({ dob: d, gender: null, age, share:100 });
            break;
          }
        }
      }
    }
  }

  // Логика определения рисков:
  // 1. Если явно указаны - используем их
  // 2. Если есть заемщик И есть объект недвижимости - включаем оба риска (жизнь + имущество)
  // 3. Если есть только заемщик - жизнь
  // 4. Если есть только объект - имущество
  // 5. Если ничего нет - ошибка

  const hasBorrower = result.borrowers.length > 0;
  const hasProperty = result.objectType !== 'flat' || /\b(дом|кв|имущ)/i.test(text);

  // Автоматическое определение рисков на основе контента
  if (hasBorrower && !result.risks.life) {
    // Если есть заемщик - добавляем страхование жизни
    result.risks.life = true;
  }

  if (hasProperty && !result.risks.property) {
    // Если есть объект недвижимости - добавляем страхование имущества
    result.risks.property = true;
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
