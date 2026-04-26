global.window = global;
require('./config_banks.js');
require('./parser.js');

const text = 'ШАМИГУЛОВ АРТУР РИНАТОВИЧ 07.02.1977 2 600 000 жизнь недвижимость титул квартира 2016 05.06.2024 альфа банк 8%';
const d = window.parseTextToObject(text);
console.log('bank:', d.bank);
console.log('osz:', d.osz);
console.log('gender from borrowers:', d.borrowers.map(b => b.gender + ' ' + b.dob));
console.log('objectType:', d.objectType);
console.log('risks:', JSON.stringify(d.risks));
console.log('contractDate:', d.contractDate);
console.log('markupPercent:', d.markupPercent);
console.log('yearBuilt:', d.yearBuilt);