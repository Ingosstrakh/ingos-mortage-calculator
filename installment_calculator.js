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
  
  // Проверяем валидность данных
  result.isValid = result.fullName && 
                   result.age !== null && 
                   result.gender && 
                   result.installmentAmount && 
                   result.monthsUntilEnd !== null &&
                   result.errors.length === 0;
  
  return result;
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
  
  // Рассчитываем премию за 1 год
  const annualPremium = parsedData.installmentAmount * (tariff / 100);
  
  // Рассчитываем премию за месяц
  const monthlyPremium = annualPremium / 12;
  
  // Рассчитываем итоговую премию (за все месяцы рассрочки)
  const totalPremium = monthlyPremium * monthsToCalculate;
  
  // Вариант 1: без скидки
  const variant1 = Math.round(totalPremium * 100) / 100;
  
  // Вариант 2: со скидкой 25%
  const variant2 = Math.round(totalPremium * 0.75 * 100) / 100;
  
  return {
    success: true,
    data: {
      fullName: parsedData.fullName,
      age: parsedData.age,
      gender: parsedData.gender === 'm' ? 'мужчина' : 'женщина',
      installmentAmount: parsedData.installmentAmount,
      endDate: parsedData.endDate,
      monthsUntilEnd: parsedData.monthsUntilEnd,
      monthsCalculated: monthsToCalculate,
      tariff: tariff,
      annualPremium: annualPremium,
      monthlyPremium: monthlyPremium,
      variant1: variant1,
      variant2: variant2
    }
  };
}

// Экспорт функций для использования в других файлах
if (typeof window !== 'undefined') {
  window.parseInstallmentData = parseInstallmentData;
  window.calculateInstallmentPremium = calculateInstallmentPremium;
  window.detectGenderBySurname = detectGenderBySurname;
}
