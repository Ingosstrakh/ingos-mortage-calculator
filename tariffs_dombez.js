// tariffs_dombez.js - Тарифы продукта "Дом без забот"

const T_DOMBEZ = {
  // Отделка и инженерное оборудование
  finish: {
    wood: [
      { min: 200000, max: 500000,  rate: 0.0065 },
      { min: 500001, max: 1000000, rate: 0.0060 },
      { min: 1000001, max: 3000000, rate: 0.0052 }
    ],
    stone: [
      { min: 200000, max: 500000,  rate: 0.0065 },
      { min: 500001, max: 1000000, rate: 0.0051 },
      { min: 1000001, max: 3000000, rate: 0.0043 }
    ]
  },

  // Движимое имущество
  movable: [
    { min: 100000, max: 1500000, rate: 0.006 }
  ],

  // Гражданская ответственность
  liability: [
    { min: 100000,  max: 500000,  rate: 0.0033 },
    { min: 500001,  max: 1000000, rate: 0.0022 },
    { min: 1000001, max: 2000000, rate: 0.0020 }
  ],

  // Коэффициент за печь/камин/сауну
  stoveCoefficient: 1.15,

  // Группы рисков
  groups: {
    group1: 0.002,
    group23: 0.001
  }
};

if (typeof window !== 'undefined') {
  window.T_DOMBEZ = T_DOMBEZ;
}

if (typeof module !== 'undefined') {
  module.exports = { T_DOMBEZ };
}
