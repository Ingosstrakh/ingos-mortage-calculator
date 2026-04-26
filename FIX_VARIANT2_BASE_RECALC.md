# 🐛 Исправление: База варианта 2 не должна меняться при изменении доп. рисков

## Проблема

**Тест-кейс:** ВТБ 31.03.2023, ОСЗ 6 161 736, 23.07.1989 мужчина, квартира ГП 2017

**Симптом:** В конструкторе варианта 2 при снятии галочки с дополнительного риска база (имущество + жизнь + титул) менялась с 17 317,56 ₽ на 9 394,18 ₽

**Причина:** Функция `refresh()` в `calculator-variant2-ui.js` пересчитывала базовые риски (имущество, жизнь, титул) при ЛЮБОМ изменении, включая изменение галочек дополнительных рисков.

## Решение

Добавлена проверка и инициализация базы:

1. **При открытии конструктора** - база инициализируется один раз с текущими параметрами
2. **При изменении параметров** - база пересчитывается ТОЛЬКО если изменилась:
   - Страховая сумма
   - Процент скидки (только для Сбербанка)

При изменении только галочек дополнительных рисков база остается неизменной.

## Изменения в коде

### Файл: `calculator-variant2-ui.js`

**Было:**
```javascript
const refresh = () => {
  const ins = Number(modal.querySelector('#variant2-ins-amount').value) || 0;
  state.insuranceAmount = ins;
  
  // ... обновление state ...
  
  // ВСЕГДА пересчитываем базу
  const baseNow = computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, ins, state.discountPercent);
  const custom = computeMoyaPremiums(ins, state);
  // ...
}
```

**Стало:**
```javascript
const state = ctx.variant2CustomState || {
  insuranceAmount,
  discountPercent: isSberbank ? 30 : null,
  // ... другие поля ...
};
ctx.variant2CustomState = state;

// ВАЖНО: Инициализируем базу при первом открытии конструктора
if (!ctx.variant2Meta.base) {
  const initialDiscount = isSberbank ? 30 : null;
  ctx.variant2Meta.base = computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, insuranceAmount, initialDiscount);
}

// В функции refresh:
const refresh = () => {
  const ins = Number(modal.querySelector('#variant2-ins-amount').value) || 0;
  const prevInsAmount = state.insuranceAmount;
  const prevDiscountPercent = state.discountPercent;
  
  state.insuranceAmount = ins;
  
  // ... обновление state ...
  
  // Пересчитываем базу ТОЛЬКО если изменилась страховая сумма или скидка
  let baseNow;
  const needRecalcBase = (ins !== prevInsAmount) || (state.discountPercent !== prevDiscountPercent);
  
  if (needRecalcBase) {
    baseNow = computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, ins, state.discountPercent);
    ctx.variant2Meta.base = baseNow;
  } else {
    baseNow = ctx.variant2Meta.base || computeVariant2BasePremiums(ctx.parsedData, ctx.bankConfig, ins, state.discountPercent);
  }
  
  const custom = computeMoyaPremiums(ins, state);
  // ...
}
```

## Логика работы

### Когда база пересчитывается:
1. ✅ Изменение страховой суммы
2. ✅ Изменение процента скидки (только Сбербанк)

### Когда база НЕ пересчитывается:
1. ❌ Включение/выключение галочки "Моя квартира: отделка"
2. ❌ Включение/выключение галочки "Моя квартира: движимое имущество"
3. ❌ Включение/выключение галочки "Моя квартира: гражданская ответственность"
4. ❌ Изменение суммы дополнительных рисков

## Тестирование

### Тест 1: Изменение галочки доп. риска
**Шаги:**
1. Рассчитать: ВТБ 31.03.2023, ОСЗ 6 161 736, 23.07.1989 мужчина, квартира ГП 2017
2. Открыть конструктор варианта 2
3. Запомнить базу (имущество + жизнь + титул)
4. Снять галочку с любого доп. риска
5. Проверить базу

**Ожидаемый результат:** База остается неизменной

### Тест 2: Изменение страховой суммы
**Шаги:**
1. Открыть конструктор варианта 2
2. Запомнить базу
3. Изменить страховую сумму
4. Проверить базу

**Ожидаемый результат:** База пересчитывается

### Тест 3: Изменение скидки (Сбербанк)
**Шаги:**
1. Рассчитать для Сбербанка
2. Открыть конструктор варианта 2
3. Запомнить базу
4. Изменить процент скидки
5. Проверить базу

**Ожидаемый результат:** База пересчитывается с новой скидкой

## Статус

✅ **Исправлено**
- Файл `calculator-variant2-ui.js` обновлен
- Файл скопирован в `extension/calculator-variant2-ui.js`
- Готово к тестированию

## Дата исправления

5 марта 2026
