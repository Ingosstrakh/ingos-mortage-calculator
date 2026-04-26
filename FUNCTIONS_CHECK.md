# Проверка покрытия функций

## Всего функций в calculator_v2.js: 33

### ✅ Перенесены в модули (15 функций):

| № | Функция | Модуль | Статус |
|---|---------|--------|--------|
| 1 | `validateParsedData()` | calculator-validation.js | ✅ |
| 2 | `formatMoneyRu()` | calculator-utils.js | ✅ |
| 3 | `formatMoneyRuGrouped()` | calculator-utils.js | ✅ |
| 4 | `round2()` | calculator-utils.js | ✅ |
| 5 | `copyToClipboard()` | calculator-utils.js | ✅ |
| 6 | `getObjectTypeName()` | calculator-utils.js | ✅ |
| 7 | `clampDiscountPercent()` | calculator-utils.js | ✅ |
| 8 | `getUnderwritingFactor()` | calculator-medical.js | ✅ |
| 9 | `getAgeLimitForLifeInsurance()` | calculator-medical.js | ✅ |
| 10 | `calculateLifeInsurance()` | calculator-insurance-life.js | ✅ |
| 11 | `calculatePropertyInsurance()` | calculator-insurance-property.js | ✅ |
| 12 | `calculateTitleInsurance()` | calculator-insurance-title.js | ✅ |
| 13 | `formatInstallmentResult()` | calculator-installment.js | ✅ |
| 14 | `loadAllModules()` | calculator-loader.js | ✅ (новая) |
| 15 | `loadScript()` | calculator-loader.js | ✅ (новая) |

### ⏳ НЕ перенесены (18 функций) - нужно создать модули:

#### Группа 1: Главный координатор (2 функции)
| № | Функция | Планируемый модуль |
|---|---------|-------------------|
| 16 | `handleClientRequest()` | calculator-main.js |
| 17 | `performCalculations()` | calculator-main.js |

#### Группа 2: Конструктор варианта 2 (6 функций)
| № | Функция | Планируемый модуль |
|---|---------|-------------------|
| 18 | `ensureVariant2ConstructorModal()` | calculator-variant2-constructor.js |
| 19 | `openVariant2Constructor()` | calculator-variant2-constructor.js |
| 20 | `closeVariant2Constructor()` | calculator-variant2-constructor.js |
| 21 | `getMoyaRateBySum()` | calculator-variant2-constructor.js |
| 22 | `getMoyaLimits()` | calculator-variant2-constructor.js |
| 23 | `computeMoyaPremiums()` | calculator-variant2-constructor.js |

#### Группа 3: Вариант 2 (3 функции)
| № | Функция | Планируемый модуль |
|---|---------|-------------------|
| 24 | `calculateVariant2()` | calculator-variant2.js |
| 25 | `computeVariant2BasePremiums()` | calculator-variant2.js |
| 26 | `renderVariant2RisksHtml()` | calculator-variant2.js |

#### Группа 4: Вариант 3 (1 функция)
| № | Функция | Планируемый модуль |
|---|---------|-------------------|
| 27 | `calculateVariant3()` | calculator-variant3.js |

#### Группа 5: Вспомогательные функции варианта 2 (5 функций)
| № | Функция | Планируемый модуль |
|---|---------|-------------------|
| 28 | `increaseMoyaKvartiraSumsForDifference()` | calculator-variant2-helpers.js |
| 29 | `increaseBastionSumsForDifference()` | calculator-variant2-helpers.js |
| 30 | `increaseExpressSumsForDifference()` | calculator-variant2-helpers.js |
| 31 | `addAdditionalRisksForMoyaKvartira()` | calculator-variant2-helpers.js |
| 32 | `upgradeExpressPack()` | calculator-variant2-helpers.js |

#### Группа 6: Продукты IFL (3 функции)
| № | Функция | Планируемый модуль |
|---|---------|-------------------|
| 33 | `getAdditionalRiskDetails()` | calculator-ifl-products.js |
| 34 | `calculateIFLAdditionalRisk()` | calculator-ifl-products.js |
| 35 | `calculateLichnieVeshchi()` | calculator-ifl-products.js |

## 📊 Итоговая статистика:

```
Всего функций:              33
Перенесено в модули:        15 (45%)
Осталось перенести:         18 (55%)
```

## ✅ Вывод:

**Все функции учтены!** Ни одна функция не забыта.

- 15 функций уже перенесены в созданные модули
- 18 функций запланированы для переноса в 6 модулей (в разработке)

## 📋 План создания оставшихся модулей:

1. **calculator-ifl-products.js** (3 функции)
2. **calculator-variant2-helpers.js** (5 функций)
3. **calculator-variant2-constructor.js** (6 функций)
4. **calculator-variant2.js** (3 функции)
5. **calculator-variant3.js** (1 функция)
6. **calculator-main.js** (2 функции)

**Итого:** 20 функций (18 из оригинала + 2 новые в loader)
