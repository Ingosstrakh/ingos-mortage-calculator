// config_banks.js
// Финальная конфигурация банков для ипотечного калькулятора Ингосстрах

window.BANKS = {
  "Абсолют Банк": {
    aliases: ["абсолют", "абсолют банк"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Ак Барс": {
    aliases: ["ак барс", "ак-барс", "акбарс"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Альфа Банк": {
    aliases: ["альфа", "альфабанк", "альфа банк"],
    add_percent: null, // клиент вводит сам
    allow_discount_property: false, // запрещена
    allow_discount_life: false      // запрещена
  },

  "ВТБ": {
    aliases: ["втб", "втб банк", "открытие", "банк открытие"],
    add_percent: 10,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Дом.РФ": {
    aliases: ["дом.рф", "дом рф", "дом. рф"],
    add_percent: 0,
    allow_discount_property: false, // запрещена
    allow_discount_life: false      // запрещена
  },

  "Зенит": {
    aliases: ["зенит"],
    add_percent: 10,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "ИТБ / ТКБ": {
    aliases: ["итб", "ткб", "ткб/итб", "итб/ткб"],
    add_percent: 10,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Металлинвест": {
    aliases: ["металлинвест", "металлинвестбанк"],
    add_percent: 10,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "МТС Банк": {
    aliases: ["мтс", "мтс банк"],
    add_percent: 10,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "ПСБ (Промсвязьбанк)": {
    aliases: ["псб", "промсвязьбанк", "псб банк"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Райффайзенбанк": {
    aliases: ["райфайзен", "райффайзен", "raiffaisen"],
    add_percent: 10,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Росбанк / Т-Банк": {
    aliases: ["росбанк", "т банк", "т-банк", "t bank"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "РСХБ": {
    aliases: ["рсхб", "россельхоз", "россельхозбанк"],
    add_percent: 10,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Сбербанк": {
    aliases: ["сбер", "сбербанк", "sber"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Тимер Банк": {
    aliases: ["тимер", "тимер банк"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "УБРИР": {
    aliases: ["убрир", "у б р и р", "ubr"],
    add_percent: null, // клиент вводит сам
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Уралсиб": {
    aliases: ["уралсиб"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  },

  "Юникредит Банк": {
    aliases: ["юникредит", "unicredit", "uni credit"],
    add_percent: 0,
    allow_discount_property: true,
    allow_discount_life: true
  }
};
