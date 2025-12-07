// ==========================
// tariffs_property.js — обновлённый, финальный
// ==========================

// Базовые тарифы имущества
const PROPERTY_TARIFFS = {
  base: {
    flat: 0.10,      // квартира
    house_brick: 0.18,
    house_wood: 0.43
  },

  // Дом.РФ — особый тариф квартиры
  "Дом.РФ": {
    flat: 0.144,
    house_brick: 0.18,
    house_wood: 0.43
  },

  // Банк СПБ — особые тарифы
  "Банк СПБ": {
    flat: 0.1,      // квартира 0,1%
    house_brick: 0.18,  // дом кирпич 0,18%
    house_wood: 0.43    // дом дерево 0,43%
  },

  // МКБ — особые тарифы
  "МКБ": {
    flat: 0.154,    // квартира 0,154%
    house_brick: 0.18,  // дом кирпич 0,18%
    house_wood: 0.43    // дом дерево 0,43%
  }
};

// Если банк не указан в отдельном блоке → применяется base
function getPropertyTariff(bank, type) {
  if (PROPERTY_TARIFFS[bank] && PROPERTY_TARIFFS[bank][type] !== undefined) {
    return PROPERTY_TARIFFS[bank][type];
  }
  return PROPERTY_TARIFFS.base[type];
}

if (typeof window !== 'undefined') {
  window.PROPERTY_TARIFFS = PROPERTY_TARIFFS;
  window.getPropertyTariff = getPropertyTariff;
}

if (typeof module !== 'undefined') {
  module.exports = { PROPERTY_TARIFFS, getPropertyTariff };
}
