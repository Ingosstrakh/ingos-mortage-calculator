# Руководство по интеграции модульной структуры

## 📦 Созданные файлы

### Модули JavaScript (8 файлов):
```
calculator-validation.js       (5.3 KB)  - Валидация данных
calculator-utils.js            (3.7 KB)  - Утилиты
calculator-medical.js          (9.9 KB)  - Медицинский андеррайтинг
calculator-insurance-life.js   (11.8 KB) - Страхование жизни
calculator-insurance-property.js (2.9 KB) - Страхование имущества
calculator-insurance-title.js  (4.5 KB)  - Страхование титула
calculator-installment.js      (7.1 KB)  - Рассрочка
calculator-loader.js           (4.5 KB)  - Загрузчик модулей
────────────────────────────────────────
ИТОГО:                         49.7 KB
```

### Документация (4 файла):
```
REFACTORING_PLAN.md            (7.3 KB)  - План рефакторинга
CALCULATOR_MODULES_README.md   (9.3 KB)  - Руководство по использованию
REFACTORING_SUMMARY.md         (12.0 KB) - Итоги работы
INTEGRATION_GUIDE.md           (этот файл) - Руководство по интеграции
```

## 🚀 Быстрый старт

### Шаг 1: Размещение файлов

Разместите все модули в той же папке, где находится `calculator_v2.js`:

```
your-project/
├── calculator_v2.js           (оригинал - оставить для совместимости)
├── calculator-validation.js   (новый)
├── calculator-utils.js        (новый)
├── calculator-medical.js      (новый)
├── calculator-insurance-life.js (новый)
├── calculator-insurance-property.js (новый)
├── calculator-insurance-title.js (новый)
├── calculator-installment.js  (новый)
└── calculator-loader.js       (новый)
```

### Шаг 2: Обновление HTML

#### Вариант A: Автоматическая загрузка (рекомендуется)

Замените:
```html
<script src="calculator_v2.js"></script>
```

На:
```html
<script src="calculator-loader.js"></script>
```

#### Вариант B: Ручная загрузка

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
```

### Шаг 3: Проверка работоспособности

Откройте консоль браузера (F12) и проверьте:

```javascript
// Должны быть доступны все функции
console.log(typeof window.validateParsedData);        // "function"
console.log(typeof window.formatMoneyRu);             // "function"
console.log(typeof window.calculateLifeInsurance);    // "function"
console.log(typeof window.calculatePropertyInsurance); // "function"
console.log(typeof window.calculateTitleInsurance);   // "function"
```

## 🔍 Проверка загрузки

### При использовании loader.js

В консоли должны появиться сообщения:
```
🚀 Начало загрузки модулей калькулятора...
✓ Загружен модуль: calculator-utils.js
✓ Загружен модуль: calculator-medical.js
✓ Загружен модуль: calculator-validation.js
✓ Загружен модуль: calculator-insurance-life.js
✓ Загружен модуль: calculator-insurance-property.js
✓ Загружен модуль: calculator-insurance-title.js
✓ Загружен модуль: calculator-installment.js
✅ Все модули калькулятора успешно загружены!
✓ Все основные функции доступны
```

### Обработка события готовности

```javascript
// Способ 1: Callback
window.onCalculatorReady = function() {
  console.log('Калькулятор готов!');
  // Ваш код здесь
};

// Способ 2: Event listener
window.addEventListener('calculatorReady', function() {
  console.log('Калькулятор готов!');
  // Ваш код здесь
});
```

## 🧪 Тестирование

### Тест 1: Валидация

```javascript
const testData = {
  bank: 'Сбербанк',
  osz: 5000000,
  risks: { life: true, property: true, titul: false },
  borrowers: [{ age: 35, gender: 'муж', dob: '15.08.1988' }],
  objectType: 'flat'
};

const errors = validateParsedData(testData);
console.log('Ошибки валидации:', errors); // должно быть null
```

### Тест 2: Форматирование

```javascript
console.log(formatMoneyRu(1234567.89));        // "1234567,89"
console.log(formatMoneyRuGrouped(1234567.89)); // "1 234 567,89"
console.log(round2(123.456));                  // 123.46
```

### Тест 3: Медицинский андеррайтинг

```javascript
const factor = getUnderwritingFactor(35, 175, 80);
console.log('Коэффициент:', factor); // должно быть 1.00

const ageLimit = getAgeLimitForLifeInsurance(55);
console.log('Лимит по возрасту:', ageLimit);
// { maxAmount: 25000000, requiresMedicalExam: false, message: "..." }
```

### Тест 4: Расчет страхования

```javascript
const bankConfig = window.BANKS['Сбербанк'];
const insuranceAmount = 5000000;

const lifeResult = calculateLifeInsurance(testData, bankConfig, insuranceAmount);
console.log('Страхование жизни:', lifeResult);

const propertyResult = calculatePropertyInsurance(testData, bankConfig, insuranceAmount);
console.log('Страхование имущества:', propertyResult);

const titleResult = calculateTitleInsurance(testData, bankConfig, insuranceAmount, true, '01.01.2025');
console.log('Страхование титула:', titleResult);
```

## 🐛 Устранение проблем

### Проблема: Функции не определены

**Симптом:**
```
Uncaught ReferenceError: calculateLifeInsurance is not defined
```

**Решение:**
1. Проверьте, что все модули загружены (консоль браузера)
2. Убедитесь, что путь к файлам правильный
3. Проверьте порядок загрузки модулей

### Проблема: Модули не загружаются

**Симптом:**
```
✗ Ошибка загрузки модуля: calculator-utils.js
```

**Решение:**
1. Проверьте, что файлы находятся в правильной папке
2. Проверьте права доступа к файлам
3. Откройте файл напрямую в браузере (должен показать код)

### Проблема: Старый код не работает

**Симптом:**
```
Uncaught TypeError: window.performCalculations is not a function
```

**Решение:**
Функция `performCalculations()` еще не перенесена в модули. Она будет в модуле `calculator-main.js` (в разработке). Пока используйте оригинальный `calculator_v2.js`.

## 📊 Совместимость

### Что работает сейчас:
✅ Валидация данных
✅ Форматирование
✅ Медицинский андеррайтинг
✅ Расчет страхования жизни
✅ Расчет страхования имущества
✅ Расчет страхования титула
✅ Форматирование рассрочки

### Что в разработке:
⏳ Расчет варианта 2 (с доп. рисками IFL)
⏳ Конструктор варианта 2 (UI)
⏳ Расчет варианта 3
⏳ Главный координатор (`performCalculations`, `handleClientRequest`)

## 🔄 Переход с оригинального файла

### Этап 1: Параллельная работа (текущий)

```html
<!-- Оригинальный файл для полного функционала -->
<script src="calculator_v2.js"></script>

<!-- Новые модули для тестирования -->
<script src="calculator-loader.js"></script>
```

### Этап 2: Постепенная миграция (после завершения всех модулей)

```html
<!-- Только новые модули -->
<script src="calculator-loader.js"></script>

<!-- Оригинальный файл закомментирован -->
<!-- <script src="calculator_v2.js"></script> -->
```

### Этап 3: Полная замена (финал)

```html
<!-- Только новые модули -->
<script src="calculator-loader.js"></script>
```

Удалить `calculator_v2.js` из проекта.

## 📝 Чек-лист интеграции

- [ ] Скопировать все 8 модулей в папку проекта
- [ ] Обновить HTML (добавить calculator-loader.js)
- [ ] Открыть страницу в браузере
- [ ] Проверить консоль на наличие ошибок
- [ ] Проверить доступность функций (см. раздел "Проверка работоспособности")
- [ ] Протестировать основные функции (см. раздел "Тестирование")
- [ ] Проверить работу существующего функционала
- [ ] Документировать изменения в проекте

## 🎯 Следующие шаги

1. **Протестировать текущие модули** в вашем проекте
2. **Дождаться создания оставшихся модулей**:
   - calculator-ifl-products.js
   - calculator-variant2-helpers.js
   - calculator-variant2-constructor.js
   - calculator-variant2.js
   - calculator-variant3.js
   - calculator-main.js
3. **Провести полное тестирование** после завершения всех модулей
4. **Заменить оригинальный файл** на модульную структуру

## 💡 Рекомендации

1. **Не удаляйте оригинальный файл** до полного завершения рефакторинга
2. **Тестируйте на копии проекта** перед внедрением в production
3. **Используйте Git** для отслеживания изменений
4. **Документируйте проблемы** и их решения
5. **Создайте резервную копию** перед интеграцией

## 📞 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что все файлы загружены
3. Проверьте версии браузера (рекомендуется современные версии)
4. Обратитесь к документации в CALCULATOR_MODULES_README.md

---

**Статус:** Готово к тестированию (8 из 14 модулей)
**Версия:** 1.0
**Дата:** 2024
