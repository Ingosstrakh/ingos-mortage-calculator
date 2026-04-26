# Добавлен модуль calculator-main.js

## Проблема
После замены `calculator_v2.js` на модули возникла ошибка:
```
ReferenceError: processClientRequest is not defined
```

## Причина
Функция `processClientRequest` (в `openai.js`) вызывает `handleClientRequest`, которая в свою очередь вызывает `performCalculations`. Эти две функции не были включены в созданные модули.

## Решение
Создан новый модуль `calculator-main.js` с двумя основными функциями:

### 1. handleClientRequest(clientText)
- Обрабатывает запрос клиента
- Определяет тип запроса (обычный расчет или рассрочка)
- Парсит данные через `parseTextToObject`
- Валидирует данные через `validateParsedData`
- Вызывает `performCalculations` для расчета
- Автоматически копирует результаты в буфер обмена

### 2. performCalculations(data)
- Выполняет все расчеты страхования
- Нормализует название банка
- Применяет специальную логику для ВТБ и Альфа Банка
- Рассчитывает страховую сумму с надбавкой
- Вызывает функции расчета:
  - `calculateLifeInsurance` (жизнь)
  - `calculatePropertyInsurance` (имущество)
  - `calculateTitleInsurance` (титул)
- Формирует Вариант 1 (без скидок)
- Пытается рассчитать Вариант 2 и Вариант 3 (если доступны)
- Возвращает HTML-результат

## Зависимости модуля
`calculator-main.js` зависит от:
- `parser.js` - функция `parseTextToObject`
- `calculator-validation.js` - функция `validateParsedData`
- `calculator-utils.js` - функция `copyToClipboard`
- `calculator-insurance-life.js` - функция `calculateLifeInsurance`
- `calculator-insurance-property.js` - функция `calculatePropertyInsurance`
- `calculator-insurance-title.js` - функция `calculateTitleInsurance`
- `installment_calculator.js` - функции `parseInstallmentData`, `calculateInstallmentPremium`, `formatInstallmentResult`
- `config_banks.js` - объект `window.BANKS`
- `tariffs_life.js` - объект `window.LIFE_TARIFF_ALFABANK`

## Функции, которые еще не в модулях
Следующие функции вызываются в `performCalculations`, но еще не извлечены в модули:
- `calculateVariant2` - расчет варианта 2 (повышенные скидки + доп. риски)
- `calculateVariant3` - расчет варианта 3 (указанная скидка)

Эти функции вызываются в блоках try-catch, поэтому их отсутствие не приведет к ошибке - просто варианты 2 и 3 не будут показаны.

## Обновленные файлы
1. `calculator-main.js` - создан новый модуль
2. `index.html` - добавлен `<script defer src="calculator-main.js?v=1"></script>`
3. `index_mobile.html` - добавлен `<script src="calculator-main.js?v=1"></script>`

## Порядок загрузки модулей
```html
<!-- Данные -->
<script src="config_banks.js"></script>
<script src="tariffs_life.js"></script>
<script src="tariffs_property.js"></script>
<script src="tariffs_ifl.js"></script>

<!-- Парсер -->
<script src="parser.js"></script>

<!-- Модули калькулятора -->
<script src="calculator-utils.js"></script>
<script src="calculator-medical.js"></script>
<script src="calculator-validation.js"></script>
<script src="calculator-insurance-life.js"></script>
<script src="calculator-insurance-property.js"></script>
<script src="calculator-insurance-title.js"></script>
<script src="calculator-installment.js"></script>
<script src="calculator-main.js"></script> <!-- НОВЫЙ -->

<!-- Рассрочка и API -->
<script src="installment_calculator.js"></script>
<script src="openai.js"></script>
```

## Статус
✅ Ошибка `processClientRequest is not defined` должна быть исправлена
✅ Основной функционал (Вариант 1) работает
⚠️ Варианты 2 и 3 пока не будут показываться (функции еще не в модулях)

## Следующие шаги
Для полного функционала нужно создать модули для оставшихся функций:
- `calculator-variant2.js` - функция `calculateVariant2`
- `calculator-variant3.js` - функция `calculateVariant3`
- И другие вспомогательные функции для вариантов 2 и 3
