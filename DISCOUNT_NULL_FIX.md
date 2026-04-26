# Исправление пересчета базы для не-Сбербанка

## Проблема

Для банков кроме Сбербанка при снятии/установке галочек доп. рисков база пересчитывалась (падала).

**Пример**:
- База без доп. рисков: 7 353,29 ₽
- Добавляем доп. риск → база меняется (неправильно!)
- Убираем галочку → база снова меняется (неправильно!)

## Причина

При каждом вызове `refresh()` для не-Сбербанка мы устанавливали `state.discountPercent = null`.

Если `prevDiscountPercent` был не `null` (например, осталось значение от предыдущего расчета), то:
```javascript
prevDiscountPercent !== state.discountPercent  // например: 30 !== null = true
```

Это приводило к `discountChanged = true` и база пересчитывалась.

## Решение

### 1. Принудительная установка null при инициализации

```javascript
const state = ctx.variant2CustomState || { ... };

// ВАЖНО: Для не-Сбербанка всегда устанавливаем discountPercent = null
// Это нужно на случай если state был сохранен от предыдущего расчета с другим банком
if (!isSberbank) {
  state.discountPercent = null;
}
```

### 2. Использование промежуточной переменной

```javascript
// Сохраняем старое значение ДО изменения
const prevDiscountPercent = state.discountPercent;

// Вычисляем новое значение
let newDiscountPercent;
if (isSberbank) {
  newDiscountPercent = clampDiscountPercent(discountInput.value);
  if (newDiscountPercent === null) newDiscountPercent = 30;
} else {
  newDiscountPercent = null;
}

// Обновляем state
state.discountPercent = newDiscountPercent;

// Сравниваем старое и новое
const discountChanged = prevDiscountPercent !== newDiscountPercent;
```

## Отладка

В консоли теперь выводится:

```
=== REFRESH START ===
isSberbank: false
prevInsAmount: 3648641.81
prevDiscountPercent: null
Не Сбербанк: скидка всегда null
Проверка изменений: {
  ins: 3648641.81,
  prevInsAmount: 3648641.81,
  insChanged: false,
  prevDiscountPercent: null,
  newDiscountPercent: null,
  discountChanged: false,  ← ВАЖНО: должно быть false!
  needRecalcBase: false
}
Используем сохраненную базу
```

## Тест

**Входные данные** (любой банк кроме Сбербанка):
```
ВТБ 31.03.2023
осз 6 161 736
муж.03.05.1981
квартира гп 2017
```

**Ожидаемое поведение**:
1. Открываем конструктор → база 17 317,56 ₽
2. Добавляем доп. риск (отделка 200 000) → база остается 17 317,56 ₽
3. Убираем галочку → база остается 17 317,56 ₽
4. Добавляем другой доп. риск → база остается 17 317,56 ₽

**В консоли должно быть**:
- `isSberbank: false`
- `prevDiscountPercent: null`
- `newDiscountPercent: null`
- `discountChanged: false`
- `needRecalcBase: false`
- `Используем сохраненную базу`

## Тест для Сбербанка

**Входные данные**:
```
Сбербанк 15.01.2024
осз 5 000 000
муж. 01.01.1985
квартира гп 2020
```

**Ожидаемое поведение**:
1. Открываем конструктор → скидка 30%, база X
2. Меняем скидку на 40% → база пересчитывается (правильно!)
3. Добавляем доп. риск → база НЕ меняется (правильно!)
4. Меняем скидку на 35% → база пересчитывается (правильно!)

**В консоли должно быть**:
- `isSberbank: true`
- При изменении скидки: `discountChanged: true`, `needRecalcBase: true`
- При изменении галочек: `discountChanged: false`, `needRecalcBase: false`

## Версия

- Файлы: `calculator-variant2-ui.js`, `extension/calculator-variant2-ui.js`
- Версия расширения: `1.0.5`

## Инструкции

1. Переустановите расширение (версия 1.0.5)
2. Откройте консоль браузера (F12)
3. Выполните тесты выше
4. Проверьте что база не меняется при изменении галочек
