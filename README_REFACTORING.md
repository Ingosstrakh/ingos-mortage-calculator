# 🔄 Рефакторинг calculator_v2.js

> Разделение монолитного файла (2969 строк) на модульную структуру

## 📊 Статус: 57% готово (8 из 14 модулей)

```
████████████░░░░░░░░░░░░  57%
```

---

## ⚡ Быстрый старт

### 1. Подключите загрузчик:
```html
<script src="calculator-loader.js"></script>
```

### 2. Проверьте консоль:
```
✅ Все модули калькулятора успешно загружены!
```

### 3. Используйте функции:
```javascript
const errors = validateParsedData(data);
const result = calculateLifeInsurance(data, bankConfig, amount);
```

---

## 📦 Что создано (8 модулей)

| Модуль | Размер | Функции | Статус |
|--------|--------|---------|--------|
| **calculator-validation.js** | 5.3 KB | Валидация данных | ✅ |
| **calculator-utils.js** | 3.7 KB | Утилиты форматирования | ✅ |
| **calculator-medical.js** | 9.9 KB | Мед. андеррайтинг | ✅ |
| **calculator-insurance-life.js** | 11.8 KB | Страхование жизни | ✅ |
| **calculator-insurance-property.js** | 2.9 KB | Страхование имущества | ✅ |
| **calculator-insurance-title.js** | 4.5 KB | Страхование титула | ✅ |
| **calculator-installment.js** | 7.1 KB | Рассрочка | ✅ |
| **calculator-loader.js** | 4.5 KB | Загрузчик модулей | ✅ |

**Итого:** 49.7 KB, ~1070 строк кода, 15 функций

---

## 📚 Документация (5 файлов)

| Документ | Назначение |
|----------|------------|
| **[INDEX.md](INDEX.md)** | 📑 Полный индекс всех файлов |
| **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** | 🚀 Руководство по интеграции |
| **[CALCULATOR_MODULES_README.md](CALCULATOR_MODULES_README.md)** | 📖 API и примеры использования |
| **[REFACTORING_PLAN.md](REFACTORING_PLAN.md)** | 📋 План разделения на модули |
| **[REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)** | 📊 Итоги работы |

---

## ✨ Преимущества

### Было:
```
calculator_v2.js
└── 2969 строк кода
    └── 33 функции
        └── Сложно поддерживать
```

### Стало:
```
8 модулей
├── 70-250 строк каждый
├── Четкая структура
├── Легко тестировать
└── Обратная совместимость
```

### Результат:
- 📦 **Модульность** - каждый файл отвечает за свою область
- 📖 **Читаемость** - легко найти нужную функцию
- 🧪 **Тестируемость** - можно тестировать модули отдельно
- 🔧 **Поддержка** - проще вносить изменения
- ♻️ **Переиспользование** - модули можно использовать независимо
- ✅ **Совместимость** - все функции доступны через `window`

---

## 🎯 Что работает сейчас

✅ Валидация входных данных  
✅ Форматирование сумм  
✅ Медицинский андеррайтинг  
✅ Расчет страхования жизни  
✅ Расчет страхования имущества  
✅ Расчет страхования титула  
✅ Форматирование рассрочки  

---

## ⏳ В разработке (6 модулей)

- calculator-ifl-products.js (Продукты IFL)
- calculator-variant2-helpers.js (Вспомогательные функции)
- calculator-variant2-constructor.js (UI конструктор)
- calculator-variant2.js (Вариант 2)
- calculator-variant3.js (Вариант 3)
- calculator-main.js (Главный координатор)

---

## 🧪 Тестирование

```javascript
// Проверка доступности функций
console.log(typeof window.validateParsedData);        // "function"
console.log(typeof window.calculateLifeInsurance);    // "function"
console.log(typeof window.formatMoneyRu);             // "function"

// Тест валидации
const errors = validateParsedData(testData);
console.log('Ошибки:', errors); // null если все OK

// Тест форматирования
console.log(formatMoneyRuGrouped(1234567.89)); // "1 234 567,89"

// Тест расчета
const result = calculateLifeInsurance(data, bankConfig, 5000000);
console.log('Премия:', result.total);
```

---

## 📁 Структура файлов

```
project/
├── calculator_v2.js (оригинал - оставить для совместимости)
│
├── Готовые модули (8 файлов):
│   ├── calculator-validation.js
│   ├── calculator-utils.js
│   ├── calculator-medical.js
│   ├── calculator-insurance-life.js
│   ├── calculator-insurance-property.js
│   ├── calculator-insurance-title.js
│   ├── calculator-installment.js
│   └── calculator-loader.js
│
└── Документация (5 файлов):
    ├── INDEX.md
    ├── INTEGRATION_GUIDE.md
    ├── CALCULATOR_MODULES_README.md
    ├── REFACTORING_PLAN.md
    └── REFACTORING_SUMMARY.md
```

---

## 🔗 Полезные ссылки

- **Начать работу:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **API функций:** [CALCULATOR_MODULES_README.md](CALCULATOR_MODULES_README.md)
- **Полный индекс:** [INDEX.md](INDEX.md)
- **Итоги работы:** [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)

---

## 💡 Рекомендации

1. **Не удаляйте** оригинальный `calculator_v2.js` до завершения всех модулей
2. **Тестируйте** на копии проекта перед production
3. **Используйте** `calculator-loader.js` для автоматической загрузки
4. **Проверяйте** консоль браузера на наличие ошибок
5. **Дождитесь** создания оставшихся 6 модулей для полного функционала

---

## 📞 Поддержка

При возникновении проблем:
1. Откройте консоль браузера (F12)
2. Проверьте, что все модули загружены
3. Убедитесь, что функции доступны через `window`
4. Обратитесь к [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)

---

## 📈 Прогресс

```
Этап 1: Базовые модули          ████████████████████ 100%
Этап 2: Модули страхования      ████████████████████ 100%
Этап 3: Документация            ████████████████████ 100%
Этап 4: Продукты IFL            ░░░░░░░░░░░░░░░░░░░░   0%
Этап 5: Вариант 2               ░░░░░░░░░░░░░░░░░░░░   0%
Этап 6: Главный координатор     ░░░░░░░░░░░░░░░░░░░░   0%
────────────────────────────────────────────────────────
ОБЩИЙ ПРОГРЕСС:                 ███████████░░░░░░░░░  57%
```

---

**Версия:** 1.0  
**Дата:** 04.03.2026  
**Статус:** Готово к тестированию базовых функций  
**Следующий этап:** Создание модулей IFL и варианта 2
