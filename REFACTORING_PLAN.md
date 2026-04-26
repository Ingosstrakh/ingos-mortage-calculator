# План рефакторинга calculator_v2.js

## Текущее состояние
Файл `calculator_v2.js` содержит ~2969 строк кода со всем функционалом калькулятора страховых премий.

## Предлагаемая структура модулей

### 1. **calculator-validation.js** ✅ (Создан)
Валидация входных данных
- `validateParsedData()` - проверка всех входных данных перед расчетами

### 2. **calculator-utils.js** ✅ (Создан)
Утилиты и форматирование
- `formatMoneyRu()` - форматирование без группировки
- `formatMoneyRuGrouped()` - форматирование с группировкой
- `round2()` - округление до 2 знаков
- `copyToClipboard()` - копирование в буфер обмена
- `getObjectTypeName()` - названия типов объектов
- `clampDiscountPercent()` - ограничение процента скидки

### 3. **calculator-medical.js** ✅ (Создан)
Медицинский андеррайтинг
- `UNDERWRITING_TABLE` - таблица коэффициентов
- `getUnderwritingFactor()` - получение коэффициента по росту/весу/возрасту
- `getAgeLimitForLifeInsurance()` - проверка лимитов по возрасту

### 4. **calculator-insurance-life.js** (Нужно создать)
Расчет страхования жизни
- `calculateLifeInsurance()` - основная функция расчета жизни
- Логика выбора тарифов по банкам
- Применение скидок и минимумов

### 5. **calculator-insurance-property.js** (Нужно создать)
Расчет страхования имущества
- `calculatePropertyInsurance()` - расчет имущества
- Определение типа объекта
- Применение скидок

### 6. **calculator-insurance-title.js** (Нужно создать)
Расчет страхования титула
- `calculateTitleInsurance()` - расчет титула
- Специальная логика для ГПБ и ВТБ

### 7. **calculator-variant2.js** (Нужно создать)
Расчет варианта 2 с дополнительными рисками
- `calculateVariant2()` - основная функция варианта 2
- `computeVariant2BasePremiums()` - базовые премии со скидками
- `renderVariant2RisksHtml()` - формирование HTML вывода
- Логика выбора продуктов IFL

### 8. **calculator-variant2-constructor.js** (Нужно создать)
UI конструктор варианта 2 (Моя квартира)
- `ensureVariant2ConstructorModal()` - создание модального окна
- `openVariant2Constructor()` - открытие конструктора
- `closeVariant2Constructor()` - закрытие конструктора
- `getMoyaRateBySum()` - получение ставки по сумме
- `getMoyaLimits()` - получение лимитов
- `computeMoyaPremiums()` - расчет премий Моя квартира

### 9. **calculator-ifl-products.js** (Нужно создать)
Расчет дополнительных рисков IFL
- `calculateIFLAdditionalRisk()` - расчет доп. риска по продукту
- `getAdditionalRiskDetails()` - детали доп. риска для вывода
- `calculateLichnieVeshchi()` - расчет "Личные вещи"
- Логика для Бастион, Экспресс, Моя квартира

### 10. **calculator-variant2-helpers.js** (Нужно создать)
Вспомогательные функции для увеличения сумм в варианте 2
- `increaseMoyaKvartiraSumsForDifference()` - увеличение сумм Моя квартира
- `increaseBastionSumsForDifference()` - увеличение сумм Бастион
- `increaseExpressSumsForDifference()` - увеличение сумм Экспресс
- `addAdditionalRisksForMoyaKvartira()` - добавление доп. рисков
- `upgradeExpressPack()` - выбор более дорогого пакета

### 11. **calculator-variant3.js** (Нужно создать)
Расчет варианта 3 с указанной скидкой
- `calculateVariant3()` - расчет с кастомной скидкой

### 12. **calculator-installment.js** (Нужно создать)
Расчет рассрочки
- `formatInstallmentResult()` - форматирование результатов рассрочки
- Логика обработки данных рассрочки

### 13. **calculator-main.js** (Нужно создать)
Главный модуль - координатор
- `handleClientRequest()` - основная точка входа
- `performCalculations()` - выполнение всех расчетов
- Формирование итогового вывода
- Интеграция всех модулей

### 14. **calculator-v2-new.js** (Нужно создать)
Новый главный файл, который импортирует все модули
- Импорт всех модулей
- Экспорт в window для обратной совместимости

## Преимущества новой структуры

1. **Модульность** - каждый модуль отвечает за свою область
2. **Читаемость** - легче найти нужную функцию
3. **Тестируемость** - можно тестировать модули отдельно
4. **Поддержка** - проще вносить изменения
5. **Переиспользование** - модули можно использовать независимо

## Порядок создания модулей

1. ✅ calculator-validation.js (Создан)
2. ✅ calculator-utils.js (Создан)
3. ✅ calculator-medical.js (Создан)
4. ✅ calculator-insurance-life.js (Создан)
5. ✅ calculator-insurance-property.js (Создан)
6. ✅ calculator-insurance-title.js (Создан)
7. ✅ calculator-installment.js (Создан)
8. ✅ calculator-loader.js (Создан - загрузчик модулей)
9. ⏳ calculator-ifl-products.js (Нужно создать)
10. ⏳ calculator-variant2-helpers.js (Нужно создать)
11. ⏳ calculator-variant2-constructor.js (Нужно создать)
12. ⏳ calculator-variant2.js (Нужно создать)
13. ⏳ calculator-variant3.js (Нужно создать)
14. ⏳ calculator-main.js (Нужно создать - главный координатор)

## Обратная совместимость

Все функции будут экспортироваться в `window` для сохранения совместимости с существующим кодом.
