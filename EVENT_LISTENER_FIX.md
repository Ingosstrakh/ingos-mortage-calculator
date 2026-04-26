# Исправление: Проблема с замыканиями в event listeners

## Проблема

Даже после глубокой копии контекста, проблема сохранялась. Из логов видно что после открытия конструктора для Сбербанка (`isSberbank: true`), он снова переключается на `isSberbank: false`.

**Причина**: Event listeners создавались ОДИН РАЗ при первом открытии конструктора (`if (!modal.__wired)`), и они захватывали `ctx` и `refresh` из ПЕРВОГО вызова через замыкание (closure). При последующих открытиях конструктора event listeners НЕ пересоздавались, но они все еще ссылались на старые `ctx` и `refresh` от первого открытия!

### Пример проблемы:

```javascript
// Первое открытие (ВТБ)
function openVariant2Constructor() {
  const ctx = { bankName: 'ВТБ' }; // Контекст ВТБ
  
  const refresh = () => {
    console.log(ctx.bankName); // Захватывает ctx через замыкание
  };
  
  if (!modal.__wired) {
    modal.__wired = true;
    input.addEventListener('input', refresh); // ❌ Listener захватывает ctx ВТБ
  }
}

// Второе открытие (Сбербанк)
function openVariant2Constructor() {
  const ctx = { bankName: 'Сбербанк' }; // Новый контекст Сбербанк
  
  const refresh = () => {
    console.log(ctx.bankName); // Новая функция с новым ctx
  };
  
  if (!modal.__wired) { // ❌ Пропускается! modal.__wired уже true
    // Listener НЕ обновляется
  }
  
  // Старый listener все еще ссылается на ctx ВТБ!
  // При вводе в input вызывается СТАРАЯ функция refresh с ctx ВТБ
}
```

## Решение

1. Сохраняем `ctx` в глобальной переменной `window.__CURRENT_CONSTRUCTOR_CTX__`
2. ВСЕГДА пересоздаем event listeners при открытии конструктора
3. Используем клонирование элементов для удаления старых listeners

### Было (неправильно):
```javascript
if (!modal.__wired) {
  modal.__wired = true;
  // Event listeners создаются ОДИН РАЗ
  input.addEventListener('input', refresh); // ❌ Захватывает старый ctx
}
```

### Стало (правильно):
```javascript
// Сохраняем ctx в глобальной переменной
window.__CURRENT_CONSTRUCTOR_CTX__ = ctx;

// ВСЕГДА удаляем старые listeners
if (modal.__wired) {
  // Клонируем элементы чтобы удалить все listeners
  const oldEl = modal.querySelector('#input');
  const newEl = oldEl.cloneNode(true);
  oldEl.parentNode.replaceChild(newEl, oldEl);
}

modal.__wired = true;

// Создаем НОВЫЕ listeners
modal.querySelector('#input').addEventListener('input', refresh); // ✅ Новый listener
```

## Как это работает

### 1. Глобальная переменная для контекста
```javascript
window.__CURRENT_CONSTRUCTOR_CTX__ = ctx;
```
Теперь `ctx` доступен из любого места, не через замыкание.

### 2. Клонирование элементов
```javascript
const oldEl = modal.querySelector('#variant2-discount');
const newEl = oldEl.cloneNode(true); // Копируем элемент
oldEl.parentNode.replaceChild(newEl, oldEl); // Заменяем старый на новый
```
Клонирование создает НОВЫЙ элемент без event listeners. Это самый надежный способ удалить все listeners.

### 3. Пересоздание listeners
```javascript
modal.querySelector('#variant2-discount').addEventListener('input', refresh);
```
Теперь это НОВЫЙ listener на НОВОМ элементе с НОВОЙ функцией `refresh`.

### 4. Использование глобального контекста
```javascript
const refresh = () => {
  const currentCtx = window.__CURRENT_CONSTRUCTOR_CTX__; // ✅ Всегда актуальный
  const isSberbank = currentCtx.bankConfig.bankName === 'Сбербанк';
  // ...
};
```

## Преимущества

### ✅ Актуальный контекст
Event listeners всегда используют актуальный контекст из `window.__CURRENT_CONSTRUCTOR_CTX__`.

### ✅ Нет старых замыканий
Клонирование элементов полностью удаляет старые listeners и их замыкания.

### ✅ Предсказуемое поведение
Каждое открытие конструктора создает новые listeners с новым контекстом.

### ✅ Изоляция
Невозможно случайно использовать контекст от предыдущего открытия.

## Технические детали

### Замыкания (Closures)
```javascript
function outer() {
  const x = 10;
  
  function inner() {
    console.log(x); // inner "захватывает" x через замыкание
  }
  
  return inner;
}

const fn = outer();
fn(); // 10 (x все еще доступен, хотя outer уже завершился)
```

### Проблема с замыканиями в event listeners
```javascript
// Первый вызов
const ctx1 = { bank: 'ВТБ' };
const refresh1 = () => console.log(ctx1.bank);
input.addEventListener('input', refresh1); // Захватывает ctx1

// Второй вызов
const ctx2 = { bank: 'Сбербанк' };
const refresh2 = () => console.log(ctx2.bank);
// Listener НЕ обновляется! Все еще использует refresh1 с ctx1

// При вводе в input:
// Вызывается refresh1, выводит "ВТБ" ❌
```

### Решение через клонирование
```javascript
// Удаляем старый элемент со всеми listeners
const oldInput = document.querySelector('#input');
const newInput = oldInput.cloneNode(true);
oldInput.parentNode.replaceChild(newInput, oldInput);

// Теперь можем добавить новый listener
newInput.addEventListener('input', refresh2); // ✅
```

### Альтернативы

#### removeEventListener (не работает)
```javascript
input.removeEventListener('input', refresh); // ❌ Не работает если не сохранили ссылку
```
Нужно сохранять ссылку на функцию, что сложно.

#### AbortController (современный способ)
```javascript
const controller = new AbortController();
input.addEventListener('input', refresh, { signal: controller.signal });
controller.abort(); // Удаляет listener
```
Но не поддерживается в старых браузерах.

#### Клонирование (наш выбор)
```javascript
const newEl = oldEl.cloneNode(true);
oldEl.parentNode.replaceChild(newEl, oldEl);
```
Работает везде, удаляет ВСЕ listeners.

## Workflow

### Сценарий 1: ВТБ → Сбербанк
```
1. Открываем конструктор для ВТБ
   - ctx = { bank: 'ВТБ' }
   - window.__CURRENT_CONSTRUCTOR_CTX__ = ctx
   - Создаем listeners с refresh()
   
2. Закрываем конструктор

3. Открываем конструктор для Сбербанка
   - ctx = { bank: 'Сбербанк' }
   - window.__CURRENT_CONSTRUCTOR_CTX__ = ctx (перезаписываем!)
   - Клонируем все input элементы (удаляем старые listeners)
   - Создаем НОВЫЕ listeners с НОВОЙ функцией refresh()
   
4. Вводим данные в input
   - Вызывается НОВАЯ функция refresh()
   - Она читает window.__CURRENT_CONSTRUCTOR_CTX__ (Сбербанк)
   - isSberbank = true ✅
```

### Сценарий 2: Множественные изменения
```
1. Открываем конструктор для ВТБ
2. Меняем галочку "отделка"
   - Вызывается refresh()
   - Читает window.__CURRENT_CONSTRUCTOR_CTX__ (ВТБ)
   - isSberbank = false ✅
   
3. Меняем сумму
   - Вызывается refresh()
   - Читает window.__CURRENT_CONSTRUCTOR_CTX__ (ВТБ)
   - isSberbank = false ✅
   
4. Все вызовы используют правильный контекст ✅
```

## Измененные файлы

1. `calculator-variant2-ui.js` - добавлено клонирование элементов и глобальный контекст
2. `extension/calculator-variant2-ui.js` - то же самое для расширения
3. `extension/manifest.json` - версия обновлена до 1.2.3

## Версия

- Расширение: `1.2.3`
- Дата: 5 марта 2026

## Тестирование

### Тест 1: ВТБ → Сбербанк → изменения
1. Рассчитайте ВТБ
2. Откройте конструктор ВТБ
3. Проверьте в консоли: `isSberbank: false` ✅
4. Закройте конструктор
5. Рассчитайте Сбербанк
6. Откройте конструктор Сбербанка
7. Проверьте в консоли: `isSberbank: true` ✅
8. Измените скидку
9. Проверьте: все вызовы refresh() показывают `isSberbank: true` ✅

### Тест 2: Проверка глобального контекста
```javascript
// После открытия конструктора для ВТБ
console.log(window.__CURRENT_CONSTRUCTOR_CTX__.bankConfig.bankName);
// "ВТБ" ✅

// После открытия конструктора для Сбербанка
console.log(window.__CURRENT_CONSTRUCTOR_CTX__.bankConfig.bankName);
// "Сбербанк" ✅
```

### Тест 3: Множественные refresh()
1. Откройте конструктор для Сбербанка
2. Измените несколько полей подряд
3. Проверьте логи: все вызовы refresh() должны показывать `isSberbank: true`
4. НЕ должно быть переключений на `isSberbank: false` ✅

## Логи для проверки

После исправления в консоли должно быть:

```
Открываем конструктор для банка: Сбербанк isSberbank: true
=== REFRESH START ===
isSberbank: true
prevInsAmount: 67000000
prevDiscountPercent: 30
Сбербанк: значение из input: 30
База: {propertyPremiumV2: 46900, lifePremiumV2: 0, titlePremiumV2: 93800}

// Изменяем галочку
=== REFRESH START ===
isSberbank: true ✅ (НЕ false!)
prevInsAmount: 67000000
prevDiscountPercent: 30
База: {propertyPremiumV2: 46900, lifePremiumV2: 0, titlePremiumV2: 93800}

// Изменяем сумму
=== REFRESH START ===
isSberbank: true ✅ (НЕ false!)
prevInsAmount: 67000000
prevDiscountPercent: 30
База: {propertyPremiumV2: 46900, lifePremiumV2: 0, titlePremiumV2: 93800}
```

## Заключение

Проблема была в замыканиях (closures) в event listeners. Event listeners создавались один раз и захватывали контекст от первого открытия конструктора. Решение: клонирование элементов для удаления старых listeners и использование глобальной переменной для хранения актуального контекста.

**Переустановите расширение (версия 1.2.3) и протестируйте!**
