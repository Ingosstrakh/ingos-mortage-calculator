// config_banks.js — исправлённый (lifeModel добавлены)
const BANKS = {
  "Абсолют": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "Альфа Банк": {
    markup: 0,
    manualMarkup: true,
    allowDiscountLife: false,
    allowDiscountProperty: false,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "Ак Барс": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "ВТБ": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "Дом.РФ": {
    markup: 0,
    allowDiscountLife: false,
    allowDiscountProperty: false,
    titleFromMarkedUpSum: false,
    lifeModel: "DOMRF"
  },

  "Зенит": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "ИТБ": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "Металлинвест": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "МТС": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "Открытие (ВТБ)": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "Промсвязьбанк": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "Райффайзен": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "Росбанк / Т-Банк": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "РСХБ": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "RSHB"
  },

  "Сбербанк": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "Тимер Банк": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "ТКБ": {
    markup: 10,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: true,
    lifeModel: "BASE"
  },

  "УБРИР": {
    markup: 0,
    manualMarkup: true,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "Уралсиб": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  },

  "Энергобанк": {
    markup: 0,
    allowDiscountLife: true,
    allowDiscountProperty: true,
    titleFromMarkedUpSum: false,
    lifeModel: "BASE"
  }
};

if (typeof window !== 'undefined') window.BANKS = BANKS;
if (typeof module !== 'undefined') module.exports = BANKS;