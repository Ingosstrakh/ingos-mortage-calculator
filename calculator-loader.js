// calculator-loader.js
// Главный загрузчик всех модулей калькулятора

/**
 * Этот файл загружает все модули калькулятора в правильном порядке
 * и обеспечивает обратную совместимость с существующим кодом
 */

(function() {
  'use strict';

  // Список модулей в порядке загрузки (учитываем зависимости)
  const modules = [
    // 1. Базовые утилиты (без зависимостей)
    'calculator-utils.js',
    
    // 2. Медицинский андеррайтинг (без зависимостей)
    'calculator-medical.js',
    
    // 3. Валидация (зависит от window.BANKS)
    'calculator-validation.js',
    
    // 4. Модули расчета страхования (зависят от utils и medical)
    'calculator-insurance-life.js',
    'calculator-insurance-property.js',
    'calculator-insurance-title.js',
    
    // 5. Рассрочка
    'calculator-installment.js',
    
    // 6. Продукты IFL (будет создан)
    // 'calculator-ifl-products.js',
    
    // 7. Вспомогательные функции варианта 2 (будет создан)
    // 'calculator-variant2-helpers.js',
    
    // 8. Конструктор варианта 2 (будет создан)
    // 'calculator-variant2-constructor.js',
    
    // 9. Вариант 2 (будет создан)
    // 'calculator-variant2.js',
    
    // 10. Вариант 3 (будет создан)
    // 'calculator-variant3.js',
    
    // 11. Главный координатор (будет создан)
    // 'calculator-main.js'
  ];

  /**
   * Динамическая загрузка скрипта
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log(`✓ Загружен модуль: ${src}`);
        resolve();
      };
      script.onerror = () => {
        console.error(`✗ Ошибка загрузки модуля: ${src}`);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Последовательная загрузка всех модулей
   */
  async function loadAllModules() {
    console.log('🚀 Начало загрузки модулей калькулятора...');
    
    try {
      for (const module of modules) {
        await loadScript(module);
      }
      
      console.log('✅ Все модули калькулятора успешно загружены!');
      
      // Проверяем доступность основных функций
      const requiredFunctions = [
        'validateParsedData',
        'formatMoneyRu',
        'getUnderwritingFactor',
        'calculateLifeInsurance',
        'calculatePropertyInsurance',
        'calculateTitleInsurance',
        'formatInstallmentResult'
      ];
      
      const missing = requiredFunctions.filter(fn => typeof window[fn] !== 'function');
      
      if (missing.length > 0) {
        console.warn('⚠️ Некоторые функции не найдены:', missing);
      } else {
        console.log('✓ Все основные функции доступны');
      }
      
      // Уведомляем о готовности
      if (typeof window.onCalculatorReady === 'function') {
        window.onCalculatorReady();
      }
      
      // Создаем событие для других скриптов
      window.dispatchEvent(new Event('calculatorReady'));
      
    } catch (error) {
      console.error('❌ Ошибка при загрузке модулей калькулятора:', error);
      throw error;
    }
  }

  // Автоматическая загрузка при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllModules);
  } else {
    loadAllModules();
  }

  // Экспортируем функцию загрузки для ручного вызова
  window.loadCalculatorModules = loadAllModules;

})();
