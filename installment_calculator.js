// installment_calculator.js
// Калькулятор рассрочки для страхования жизни
// Использует тарифы Сбербанка (LIFE_TARIFF_BASE) без надбавок

// Функция определения пола по фамилии
function detectGenderBySurname(surname) {
  if (!surname) return null;
  
  const surnameUpper = surname.trim().toUpperCase();
  
  // Женские окончания (более полный список)
  const femaleEndings = [
    'ОВА', 'ЕВА', 'ИНА', 'СКАЯ', 'ЦКАЯ', 'НСКАЯ',
    'АЯ', 'ЯЯ', 'УЮ', 'ОЮ', 'ЕЮ', 'ИЮ'
  ];
  
  // Проверяем женские окончания
  for (const ending of femaleEndings) {
    if (surnameUpper.endsWith(ending)) {
      return 'f'; // female
    }
  }
  
  // Мужские окончания (по умолчанию, если не женское)
  // ОВ, ЕВ, ИН, СКИЙ, ЦКИЙ, НСКИЙ и т.д.
  return 'm'; // male
}

// Функция извлечения ФИО из текста
function extractFullName(text) {
  // Ищем паттерн: Фамилия Имя Отчество
  // Пример: "Николаев Олег Юрьевич" или "Эгамова Дильором Якубовна" или "Саляхов Марсель Камилевич"
  const patterns = [
    /^([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)/m,
    /([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+),/,
    /([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\s*[,\s]*\d{1,2}\.\d{1,2}\.\d{4}/,
    /([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\s*гр/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        surname: match[1],
        firstName: match[2],
        middleName: match[3],
        fullName: `${match[1]} ${match[2]} ${match[3]}`
      };
    }
  }
  
  return null;
}

// Функция извлечения даты рождения
function extractBirthDate(text) {
  // Ищем паттерн: DD.MM.YYYY или DD.MM.YYYY гр или DD.MM.YYYYгр
  const patterns = [
    /(\d{1,2}\.\d{1,2}\.\d{4})\s*гр/,
    /(\d{1,2}\.\d{1,2}\.\d{4})гр/,
    /,\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*гр/,
    /,\s*(\d{1,2}\.\d{1,2}\.\d{4})/,
    /(\d{1,2}\.\d{1,2}\.\d{4})/
  ];
  
  // Исключаем дату окончания рассрочки (она обычно идет после слова "до")
  const installmentEndDatePattern = /[Дд]о\s+(\d{1,2}\.\d{1,2}\.\d{4})/;
  const installmentEndMatch = text.match(installmentEndDatePattern);
  const installmentEndDate = installmentEndMatch ? installmentEndMatch[1] : null;
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1];
      // Пропускаем дату окончания рассрочки
      if (installmentEndDate && date === installmentEndDate) {
        continue;
      }
      return date;
    }
  }
  
  return null;
}

// Функция извлечения суммы рассрочки
function extractInstallmentAmount(text) {
  // Ищем паттерн: "Сумма в рассрочку 18 038 600 р." или "Сумма в рассрочку 18038600" или "рассрочку 11 793 972 р."
  const patterns = [
    /[Сс]умма\s+в\s+рассрочку\s+([\d\s]+)\s*р/,
    /[Сс]умма\s+в\s+рассрочку\s+([\d\s]+)/,
    /рассрочку\s+([\d\s]+)\s*р/,
    /рассрочку\s+([\d\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Убираем пробелы и преобразуем в число
      const amountStr = match[1].replace(/\s+/g, '').trim();
      const amount = parseInt(amountStr, 10);
      // Минимум 5 цифр для суммы рассрочки (может быть меньше 1 млн)
      if (amount > 0 && amountStr.length >= 5) {
        return amount;
      }
    }
  }
  
  // Если не нашли по паттернам, ищем любое большое число после слова "рассрочку"
  const fallbackPattern = /рассрочку[^\d]*(\d{1,3}(?:\s+\d{3})+|\d{5,})/;
  const fallbackMatch = text.match(fallbackPattern);
  if (fallbackMatch) {
    const amountStr = fallbackMatch[1].replace(/\s+/g, '').trim();
    const amount = parseInt(amountStr, 10);
    if (amount > 0) {
      return amount;
    }
  }
  
  return null;
}

// Функция извлечения даты окончания рассрочки
function extractInstallmentEndDate(text) {
  // Ищем паттерн: "до 20.12.2026" или "до 20.03.2029 г." или "до 20.09.2026г." или "до 20.03.29 г"
  const patterns = [
    /[Дд]о\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*г/,
    /[Дд]о\s+(\d{1,2}\.\d{1,2}\.\d{4})г/,
    /[Дд]о\s+(\d{1,2}\.\d{1,2}\.\d{4})/,
    /[Сс]рок\s+рассрочки\s+до\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*г/,
    /[Сс]рок\s+рассрочки\s+до\s+(\d{1,2}\.\d{1,2}\.\d{4})г/,
    /[Сс]рок\s+рассрочки\s+до\s+(\d{1,2}\.\d{1,2}\.\d{4})/,
    // Паттерны с коротким годом (2 цифры)
    /[Дд]о\s+(\d{1,2}\.\d{1,2}\.\d{2})\s*г/,
    /[Дд]о\s+(\d{1,2}\.\d{1,2}\.\d{2})г/,
    /[Дд]о\s+(\d{1,2}\.\d{1,2}\.\d{2})/,
    /[Сс]рок\s+рассрочки\s+до\s+(\d{1,2}\.\d{1,2}\.\d{2})\s*г/,
    /[Сс]рок\s+рассрочки\s+до\s+(\d{1,2}\.\d{1,2}\.\d{2})г/,
    /[Сс]рок\s+рассрочки\s+до\s+(\d{1,2}\.\d{1,2}\.\d{2})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let dateStr = match[1];
      
      // Если год короткий (2 цифры), преобразуем в полный (4 цифры)
      const parts = dateStr.split('.');
      if (parts.length === 3 && parts[2].length === 2) {
        const shortYear = parseInt(parts[2], 10);
        // Если год меньше 50, считаем что это 20XX, иначе 19XX
        const fullYear = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
        dateStr = `${parts[0]}.${parts[1]}.${fullYear}`;
      }
      
      return dateStr;
    }
  }
  
  return null;
}

// Функция расчета возраста
function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  
  const parts = birthDateStr.split('.');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // месяцы в JS начинаются с 0
  const year = parseInt(parts[2], 10);
  
  const birthDate = new Date(year, month, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Функция расчета количества месяцев до окончания рассрочки
function calculateMonthsUntilEnd(endDateStr) {
  if (!endDateStr) return null;
  
  const parts = endDateStr.split('.');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  const endDate = new Date(year, month, day);
  const today = new Date();
  
  // Если дата окончания в прошлом, возвращаем 0
  if (endDate < today) {
    return 0;
  }
  
  const yearsDiff = endDate.getFullYear() - today.getFullYear();
  const monthsDiff = endDate.getMonth() - today.getMonth();
  const daysDiff = endDate.getDate() - today.getDate();
  
  let totalMonths = yearsDiff * 12 + monthsDiff;
  
  // Если день окончания еще не наступил в текущем месяце, добавляем месяц
  if (daysDiff > 0) {
    totalMonths++;
  }
  
  return Math.max(1, totalMonths); // Минимум 1 месяц
}

// Основная функция парсинга данных рассрочки
function parseInstallmentData(text) {
  const result = {
    fullName: null,
    surname: null,
    firstName: null,
    middleName: null,
    birthDate: null,
    age: null,
    gender: null,
    installmentAmount: null,
    endDate: null,
    monthsUntilEnd: null,
    isValid: false,
    errors: []
  };
  
  // Извлекаем ФИО
  const nameData = extractFullName(text);
  if (nameData) {
    result.fullName = nameData.fullName;
    result.surname = nameData.surname;
    result.firstName = nameData.firstName;
    result.middleName = nameData.middleName;
    
    // Определяем пол по фамилии
    result.gender = detectGenderBySurname(nameData.surname);
  } else {
    result.errors.push('Не удалось извлечь ФИО');
  }
  
  // Извлекаем дату рождения
  result.birthDate = extractBirthDate(text);
  if (result.birthDate) {
    result.age = calculateAge(result.birthDate);
    if (!result.age) {
      result.errors.push('Не удалось рассчитать возраст');
    }
  } else {
    result.errors.push('Не удалось извлечь дату рождения');
  }
  
  // Извлекаем сумму рассрочки
  result.installmentAmount = extractInstallmentAmount(text);
  if (!result.installmentAmount) {
    result.errors.push('Не удалось извлечь сумму рассрочки');
  }
  
  // Извлекаем дату окончания рассрочки
  result.endDate = extractInstallmentEndDate(text);
  if (result.endDate) {
    result.monthsUntilEnd = calculateMonthsUntilEnd(result.endDate);
    if (!result.monthsUntilEnd) {
      result.errors.push('Не удалось рассчитать количество месяцев до окончания');
    }
  } else {
    result.errors.push('Не удалось извлечь дату окончания рассрочки');
  }
  
  // Извлекаем рост и вес для медицинского андеррайтинга (опционально)
  result.height = extractHeight(text);
  result.weight = extractWeight(text);
  
  // Проверяем валидность данных
  result.isValid = result.fullName && 
                   result.age !== null && 
                   result.gender && 
                   result.installmentAmount && 
                   result.monthsUntilEnd !== null &&
                   result.errors.length === 0;
  
  return result;
}

// Функция извлечения роста (в см) - используем ту же логику, что и в parser.js
function extractHeight(text) {
  if (!text) return null;
  const patterns = [
    /рост\s+(\d{2,3})/i,
    /рост:\s*(\d{2,3})/i,
    /ростом\s+(\d{2,3})/i,
    /height\s*:?\s*(\d{2,3})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const height = parseInt(match[1], 10);
      // Проверяем разумность значения (120-220 см)
      if (height >= 120 && height <= 220) {
        return height;
      }
    }
  }
  return null;
}

// Функция извлечения веса (в кг) - используем ту же логику, что и в parser.js
function extractWeight(text) {
  if (!text) return null;
  const patterns = [
    /вес\s+(\d{2,3})/i,
    /вес:\s*(\d{2,3})/i,
    /весом\s+(\d{2,3})/i,
    /weight\s*:?\s*(\d{2,3})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const weight = parseInt(match[1], 10);
      // Проверяем разумность значения (30-200 кг)
      if (weight >= 30 && weight <= 200) {
        return weight;
      }
    }
  }
  return null;
}

// Таблица медицинского андеррайтинга (копия из calculator_v2.js)
const UNDERWRITING_TABLE_INSTALLMENT = {
  140: {
    "16-29": [1.25, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": [1.25, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": [1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": [1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  150: {
    "16-29": ["МЕДО", 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  160: {
    "16-29": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  170: {
    "16-29": ["МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  180: {
    "16-29": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  },
  190: {
    "16-29": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "30-45": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "46-59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"],
    "59": ["МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО", 1.25, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.25, 1.25, 1.25, "МЕДО", "МЕДО", "МЕДО", "МЕДО", "МЕДО"]
  }
};

// Функция получения коэффициента медицинского андеррайтинга
function getUnderwritingFactorInstallment(age, height, weight) {
  if (!age || !height || !weight) return 1.00;
  
  const ageGroup = age >= 16 && age <= 29 ? "16-29" :
                  age >= 30 && age <= 45 ? "30-45" :
                  age >= 46 && age <= 59 ? "46-59" : "59";

  const heightKeys = Object.keys(UNDERWRITING_TABLE_INSTALLMENT).map(Number).sort((a, b) => a - b);
  const closestHeight = heightKeys.reduce((prev, curr) => 
    Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
  );

  const weightRanges = [39, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140];
  let weightIndex = 0;
  for (let i = 0; i < weightRanges.length; i++) {
    if (weight < weightRanges[i]) {
      weightIndex = i;
      break;
    }
    if (i === weightRanges.length - 1) weightIndex = weightRanges.length;
  }

  if (!UNDERWRITING_TABLE_INSTALLMENT[closestHeight] || !UNDERWRITING_TABLE_INSTALLMENT[closestHeight][ageGroup]) {
    return 1.00;
  }

  return UNDERWRITING_TABLE_INSTALLMENT[closestHeight][ageGroup][weightIndex] || 1.00;
}

// Функция проверки лимитов страховой суммы по возрасту
function getAgeLimitForLifeInsuranceInstallment(age) {
  if (!age) {
    return { maxAmount: null, requiresMedicalExam: false, message: '' };
  }
  
  if (age >= 65) {
    return {
      maxAmount: null,
      requiresMedicalExam: true,
      message: '⚠️ Необходимо пройти медобследование (возраст 65+ лет)'
    };
  } else if (age >= 56 && age <= 64) {
    return {
      maxAmount: 15000000, // 15 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 15 000 000 ₽`
    };
  } else if (age >= 50 && age <= 55) {
    return {
      maxAmount: 25000000, // 25 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 25 000 000 ₽`
    };
  } else if (age >= 45 && age <= 49) {
    return {
      maxAmount: 35000000, // 35 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 35 000 000 ₽`
    };
  } else {
    // До 44 лет включительно
    return {
      maxAmount: 45000000, // 45 млн
      requiresMedicalExam: false,
      message: `⚠️ Максимальная страховая сумма для возраста ${age} лет: 45 000 000 ₽`
    };
  }
}

// Функция расчета премии по рассрочке
function calculateInstallmentPremium(parsedData) {
  if (!parsedData.isValid) {
    return {
      success: false,
      error: 'Данные невалидны: ' + parsedData.errors.join(', ')
    };
  }
  
  // Проверяем наличие тарифов Сбербанка
  const tariffTable = window.LIFE_TARIFF_BASE;
  if (!tariffTable) {
    return {
      success: false,
      error: 'Тарифы Сбербанка не загружены'
    };
  }
  
  // Проверяем возраст (должен быть в диапазоне тарифов)
  if (parsedData.age < 18 || parsedData.age > 64) {
    return {
      success: false,
      error: `Возраст ${parsedData.age} лет вне диапазона тарифов (18-64 года)`
    };
  }
  
  // Проверяем лимиты по возрасту
  let ageLimitMessage = '';
  let ageLimitRequiresMedicalExam = false;
  let effectiveInstallmentAmount = parsedData.installmentAmount;
  
  const ageLimit = getAgeLimitForLifeInsuranceInstallment(parsedData.age);
  
  if (ageLimit.requiresMedicalExam) {
    // Возраст 65+ - требуется медобследование
    return {
      success: false,
      error: ageLimit.message
    };
  } else if (ageLimit.maxAmount && parsedData.installmentAmount > ageLimit.maxAmount) {
    // Страховая сумма превышает лимит для данного возраста
    effectiveInstallmentAmount = ageLimit.maxAmount;
    if (ageLimit.message) {
      ageLimitMessage = ageLimit.message;
    }
  }
  
  // Проверяем медицинский андеррайтинг (рост/вес)
  let medicalUnderwritingFactor = 1.00;
  let requiresMedicalExam = false;
  let medicalUnderwritingMessage = '';
  
  if (parsedData.height && parsedData.weight) {
    medicalUnderwritingFactor = getUnderwritingFactorInstallment(parsedData.age, parsedData.height, parsedData.weight);
    
    if (medicalUnderwritingFactor === "МЕДО") {
      requiresMedicalExam = true;
      medicalUnderwritingMessage = '⚠️ Необходимо пройти медобследование';
    } else if (medicalUnderwritingFactor === 1.25) {
      medicalUnderwritingMessage = '⚠️ Применена надбавка +25% к тарифу жизни (мед. андеррайтинг)';
    }
  }
  
  // Объединяем требования медобследования
  const finalRequiresMedicalExam = requiresMedicalExam || ageLimitRequiresMedicalExam;
  
  // Объединяем сообщения
  let combinedMessage = '';
  if (ageLimitMessage) {
    combinedMessage = ageLimitMessage;
  }
  if (medicalUnderwritingMessage) {
    if (combinedMessage) {
      combinedMessage += '; ' + medicalUnderwritingMessage;
    } else {
      combinedMessage = medicalUnderwritingMessage;
    }
  }
  
  // Получаем тариф для данного возраста и пола
  const tariff = tariffTable[parsedData.gender] && tariffTable[parsedData.gender][parsedData.age];
  if (!tariff) {
    return {
      success: false,
      error: `Тариф не найден для возраста ${parsedData.age} лет и пола ${parsedData.gender}`
    };
  }
  
  // Определяем количество месяцев для расчета
  // Если меньше 12 месяцев, считаем как 1 год
  const monthsToCalculate = parsedData.monthsUntilEnd < 12 ? 12 : parsedData.monthsUntilEnd;
  
  // Рассчитываем премию за 1 год с учетом эффективной суммы
  let annualPremium = effectiveInstallmentAmount * (tariff / 100);
  
  // Применяем коэффициент медицинского андеррайтинга
  if (medicalUnderwritingFactor === 1.25) {
    annualPremium = annualPremium * 1.25;
  }
  
  // Рассчитываем премию за месяц
  const monthlyPremium = annualPremium / 12;
  
  // Рассчитываем итоговую премию (за все месяцы рассрочки)
  const totalPremium = monthlyPremium * monthsToCalculate;
  
  // Вариант 1: без скидки (скидки отключены при мед. андеррайтинге)
  const variant1 = Math.round(totalPremium * 100) / 100;
  
  // Вариант 2: со скидкой 25% (только если нет мед. андеррайтинга)
  const variant2 = finalRequiresMedicalExam || medicalUnderwritingFactor === 1.25 
    ? variant1 
    : Math.round(totalPremium * 0.75 * 100) / 100;
  
  return {
    success: true,
    data: {
      fullName: parsedData.fullName,
      age: parsedData.age,
      gender: parsedData.gender === 'm' ? 'мужчина' : 'женщина',
      installmentAmount: parsedData.installmentAmount,
      effectiveInstallmentAmount: effectiveInstallmentAmount,
      endDate: parsedData.endDate,
      monthsUntilEnd: parsedData.monthsUntilEnd,
      monthsCalculated: monthsToCalculate,
      tariff: tariff,
      annualPremium: annualPremium,
      monthlyPremium: monthlyPremium,
      variant1: variant1,
      variant2: variant2,
      medicalUnderwritingFactor: medicalUnderwritingFactor,
      requiresMedicalExam: finalRequiresMedicalExam,
      medicalUnderwritingMessage: combinedMessage
    }
  };
}

// Экспорт функций для использования в других файлах
if (typeof window !== 'undefined') {
  window.parseInstallmentData = parseInstallmentData;
  window.calculateInstallmentPremium = calculateInstallmentPremium;
  window.detectGenderBySurname = detectGenderBySurname;
}
