# Модульная структура калькулятора страховых премий

## 📋 Обзор

Файл `calculator_v2.js` (2969 строк) был разделен на логические модули для улучшения читаемости, поддержки и тестируемости кода.

## 📦 Созданные модули

### ✅ Базовые модули (готовы)

1. **calculator-validation.js** (~120 строк)
   - Валидация входных данных
   - Проверка банков, заемщиков, объектов недвижимости
   - Функция: `validateParsedData()`

2. **calculator-utils.js** (~100 строк)
   - Утилиты форматирования
   - Функции: `formatMoneyRu()`, `formatMoneyRuGrouped()`, `round2()`, `copyToClipboard()`, `clampDiscountPercent()`

3. **calculator-medical.js** (~200 строк)
   - Медицинский андеррайтинг
   - Таблица `UNDERWRITING_TABLE`
   - Функции: `getUnderwritingFactor()`, `getAgeLimitForLifeInsurance()`

### ✅ Модули расчета страхования (готовы)

4. **calculator-insurance-life.js** (~250 строк)
   - Расчет страхования жизни
   - Поддержка разных банков и тарифов
   - Функция: `calculateLifeInsurance()`

5. **calculator-insurance-property.js** (~70 строк)
   - Расчет страхования имущества
   - Функция: `calculatePropertyInsurance()`

6. **calculator-insurance-title.js** (~100 строк)
   - Расчет страхования титула
   - Специальная логика для ГПБ и ВТБ
   - Функция: `calculateTitleInsurance()`

### ✅ Дополнительные модули (готовы)

7. **calculator-installment.js** (~130 строк)
   - Форматирование результатов рассрочки
   - Функция: `formatInstallmentResult()`

8. **calculator-loader.js** (~100 строк)
   - Автоматическая загрузка всех модулей
   - Проверка зависимостей
   - События готовности

### ⏳ Модули в разработке

9. **calculator-ifl-products.js**
   - Расчет дополнительных рисков IFL
   - Бастион, Экспресс, Моя квартира, Личные вещи

10. **calculator-variant2-helpers.js**
    - Вспомогательные функции для увеличения сумм
    - Оптимизация разницы между вариантами

11. **calculator-variant2-constructor.js**
    - UI конструктор варианта 2
    - Модальное окно настройки

12. **calculator-variant2.js**
    - Основной расчет варианта 2
    - Интеграция доп. рисков

13. **calculator-variant3.js**
    - Расчет с кастомной скидкой

14. **calculator-main.js**
    - Главный координатор
    - Функции: `handleClientRequest()`, `performCalculations()`

## 🚀 Использование

### Вариант 1: Автоматическая загрузка

Подключите только загрузчик в HTML:

```html
<!-- Загрузчик автоматически подгрузит все модули -->
<script src="calculator-loader.js"></script>

<script>
  // Опционально: обработчик готовности
  window.onCalculatorReady = function() {
    console.log('Калькулятор готов к работе!');
  };
  
  // Или через событие
  window.addEventListener('calculatorReady', function() {
    console.log('Калькулятор готов!');
  });
</script>
```

### Вариант 2: Ручная загрузка модулей

```html
<!-- Базовые модули -->
<script src="calculator-utils.js"></script>
<script src="calculator-medical.js"></script>
<script src="calculator-validation.js"></script>

<!-- Модули расчета -->
<script src="calculator-insurance-life.js"></script>
<script src="calculator-insurance-property.js"></script>
<script src="calculator-insurance-title.js"></script>

<!-- Дополнительные модули -->
<script src="calculator-installment.js"></script>

<!-- Главный модуль (когда будет создан) -->
<!-- <script src="calculator-main.js"></script> -->
```

### Вариант 3: Использование с модулями ES6 (будущее)

```javascript
import { validateParsedData } from './calculator-validation.js';
import { formatMoneyRu, round2 } from './calculator-utils.js';
import { calculateLifeInsurance } from './calculator-insurance-life.js';
// ...
```

## 🔧 API функций

### Валидация
```javascript
const errors = validateParsedData(data);
if (errors) {
  console.error('Ошибки валидации:', errors);
}
```

### Форматирование
```javascript
const formatted = formatMoneyRu(1234567.89);
// "1234567,89"

const grouped = formatMoneyRuGrouped(1234567.89);
// "1 234 567,89"

const rounded = round2(123.456);
// 123.46
```

### Медицинский андеррайтинг
```javascript
const factor = getUnderwritingFactor(35, 175, 80);
// 1.00 или 1.25 или "МЕДО"

const ageLimit = getAgeLimitForLifeInsurance(55);
// { maxAmount: 25000000, requiresMedicalExam: false, message: "..." }
```

### Расчет страхования
```javascript
const lifeResult = calculateLifeInsurance(data, bankConfig, insuranceAmount);
// { total, totalWithoutDiscount, hasDiscount, borrowers, ... }

const propertyResult = calculatePropertyInsurance(data, bankConfig, insuranceAmount);
// { total, totalWithoutDiscount, hasDiscount }

const titleResult = calculateTitleInsurance(data, bankConfig, insuranceAmount, withLife, contractDate);
// { total, totalWithoutDiscount, hasDiscount }
```

## 📊 Статистика

| Модуль | Строк кода | Статус | Функций |
|--------|-----------|--------|---------|
| calculator-validation.js | ~120 | ✅ | 1 |
| calculator-utils.js | ~100 | ✅ | 6 |
| calculator-medical.js | ~200 | ✅ | 2 + таблица |
| calculator-insurance-life.js | ~250 | ✅ | 1 |
| calculator-insurance-property.js | ~70 | ✅ | 1 |
| calculator-insurance-title.js | ~100 | ✅ | 1 |
| calculator-installment.js | ~130 | ✅ | 1 |
| calculator-loader.js | ~100 | ✅ | 2 |
| **Итого (готово)** | **~1070** | **8/14** | **15** |
| **Оригинал** | **2969** | - | **33** |

## ✨ Преимущества новой структуры

1. **Модульность** - каждый файл отвечает за свою область
2. **Читаемость** - легко найти нужную функцию
3. **Тестируемость** - можно тестировать модули отдельно
4. **Поддержка** - проще вносить изменения
5. **Переиспользование** - модули можно использовать независимо
6. **Производительность** - загружаются только нужные модули
7. **Совместимость** - все функции экспортируются в `window`

## 🔄 Обратная совместимость

Все функции доступны через `window`, как и раньше:

```javascript
// Старый код продолжит работать
window.validateParsedData(data);
window.calculateLifeInsurance(data, bankConfig, amount);
window.formatMoneyRu(1234.56);
```

## 📝 Следующие шаги

1. ✅ Создать базовые модули (завершено)
2. ✅ Создать модули расчета страхования (завершено)
3. ⏳ Создать модули IFL продуктов
4. ⏳ Создать модули варианта 2
5. ⏳ Создать главный координатор
6. ⏳ Протестировать интеграцию
7. ⏳ Обновить HTML для использования новых модулей

## 🐛 Отладка

Загрузчик выводит информацию в консоль:

```
🚀 Начало загрузки модулей калькулятора...
✓ Загружен модуль: calculator-utils.js
✓ Загружен модуль: calculator-medical.js
...
✅ Все модули калькулятора успешно загружены!
✓ Все основные функции доступны
```

## 📞 Поддержка

При возникновении проблем проверьте:
1. Все ли модули загружены (консоль браузера)
2. Нет ли ошибок в консоли
3. Доступны ли глобальные объекты (`window.BANKS`, тарифы и т.д.)
