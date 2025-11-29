// parser.js
// Гибридный интеллектуальный парсер (правила + эвристики)
// Возвращает structured JSON: parseTextToObject(text)
// Экспорт: module.exports.parseTextToObject (Node) и window.parseTextToObject (browser)

// -----------------------------
// Настройка: словари и параметры
// -----------------------------
const BANK_SYNONYMS = {
  "Сбербанк": ["сбер", "сбербанк", "сбербанк тт", "сбербанк тат", "сбер банк"],
  "ВТБ": ["втб", "втб банк", "втб рт", "втб ростов"],
  "Альфа Банк": ["альфа", "альфабанк", "альфа банк"],
  "Ак Барс": ["ак барс", "акбарс"],
  "РСХБ": ["рсхб", "россельхозбанк", "рсхб банк"],
  "Дом.РФ": ["дом.рф","дом рф","домрф","дом рф"],
  "Райффайзен": ["райф", "райффайзен", "райфайзенбанк"],
  "МТС": ["мтс","мтс банк"],
  "Зенит": ["зенит","зенит банк"],
  "Открытие": ["открытие", "открытие (втб)"],
  "УБРИР": ["убрир","убрир банк"],
  "Уралсиб": ["уралсиб"],
  "Абсолют": ["абсолют","абсолют банк"],
  "Металлинвест": ["металлинвест"],
  "ТКБ": ["ткб","итб"],
  "Промсвязьбанк": ["промсвязь","промсвязьбанк"],
  // дополни при необходимости
};

// ключевые синонимы рисков
const RISK_KEYWORDS = {
  life: ["жизн", "life", "личн", "страхование жизни"],
  property: ["имущ", "квар", "кв-", "кв ", "дом", "апарт", "апартам", "таун", "таунхаус", "таун-", "страхование имущества"],
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
  // если дробная часть есть, округлим до рублей
  return Math.round(v);
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
  const re = /(?:осз|ост|остаток|остаток задолженности|сумма кредита|сумма)[^\d\n\r]{0,30}([\d\s\.,]{4,})/ig;
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
  const lines = text.split(/[\n\r]/g).map(l=>l.trim()).filter(Boolean);
  const found = [];
  // 1) scan lines for keywords "он/она/муж/жен/мужчина/женщина" plus date and optional percent
  for (const line of lines) {
    // try to find dob
    const dobMatch = line.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    const percMatch = line.match(/(\d{1,3})\s*%/);
    let gender = null;
    if (/\b(он|муж|мужчина)\b/i.test(line)) gender='m';
    if (/\b(она|жен|женщина)\b/i.test(line)) gender='f';
    if (dobMatch) {
      found.push({ dob: dobMatch[1], gender: gender, share: percMatch ? Number(percMatch[1]) : undefined, raw: line });
      continue;
    }
    // try pattern "он - 23.09.1975"
    const short = line.match(/\b(он|она|муж|жен)\b.*?(\d{1,2}\.\d{1,2}\.\d{4})/i);
    if (short) {
      const g = /он|муж/i.test(short[1]) ? 'm' : 'f';
      found.push({ dob: short[2], gender: g, share: percMatch ? Number(percMatch[1]) : undefined, raw: line });
    }
  }

  // 2) If none found, try global search for tokens like "он - 23.09.1975" anywhere
  if (found.length === 0) {
    const global = Array.from(text.matchAll(/(он|она|муж|жен|мужчина|женщина)[^0-9]{0,10}(\d{1,2}\.\d{1,2}\.\d{4})/ig));
    for (const g of global) {
      const gender = /он|муж|мужчина/i.test(g[1]) ? 'm' : 'f';
      found.push({ dob: g[2], gender });
    }
  }

  // 3) If still none, try to find date-like token and treat as single borrower DOB
  if (found.length === 0) {
    const anyDate = text.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (anyDate) found.push({ dob: anyDate[1], gender: null });
  }

  // 4) Normalize shares: if all shares undefined -> equal share
  if (found.length > 0) {
    const sharesDefined = found.filter(f=>f.share!==undefined).length;
    if (sharesDefined === 0) {
      const equal = Math.floor(100 / found.length);
      for (let i=0;i<found.length;i++) found[i].share = (i === found.length-1) ? (100 - equal*(found.length-1)) : equal;
    } else {
      // if some shares defined but not summing to 100, try to normalize proportionally
      const sum = found.reduce((s,f)=> s + (f.share||0), 0);
      if (sum !== 100) {
        // distribute undefined as remaining equally
        let rem = 100 - sum;
        const undefCount = found.filter(f=>f.share===undefined).length;
        if (undefCount > 0) {
          const each = Math.floor(rem / undefCount);
          let acc = 0;
          for (const f of found) {
            if (f.share === undefined) {
              f.share = each;
              acc += each;
            }
          }
          // adjust last
          const last = found[found.length-1];
          last.share += (100 - (sum + acc));
        } else {
          // all defined but not 100 -> normalize proportionally
          for (const f of found) f.share = Math.round(f.share * 100 / sum);
        }
      }
    }
  }

  // 5) compute age from dob if possible
  for (const f of found) {
    if (f.dob) {
      const parts = f.dob.split('.');
      if (parts.length === 3) {
        const yyyy = Number(parts[2]);
        f.age = CURRENT_YEAR - yyyy;
      }
    }
  }

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

  // 4) Risks detection
  for (const [risk, keys] of Object.entries(RISK_KEYWORDS)) {
    for (const k of keys) if (lower.includes(k)) result.risks[risk]=true;
  }
  // If no explicit property keyword but text contains 'дом'/'квар' etc we set property true above

  // 5) object type
  if (/\b(таунхаус|таун)\b/i.test(text)) result.objectType = 'townhouse';
  else if (/\b(апарт|апартам|апартаменты)\b/i.test(text)) result.objectType = 'apartment';
  else if (/\b(кварти|кв[^\w]|кв-|кв |квар)\b/i.test(text)) result.objectType = 'flat';
else if (/\b(дом|жилой дом|частный дом)\b/i.test(text)) result.objectType = 'house';

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

  // Дополнительная логика для случаев, когда риски частично указаны
  if (hasBorrower && !result.risks.life) {
    // Если есть заемщик и жизнь не указана - добавляем жизнь
    result.risks.life = true;
  }

  if (hasProperty && !result.risks.property) {
    // Если есть объект и имущество не указано - добавляем имущество
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
