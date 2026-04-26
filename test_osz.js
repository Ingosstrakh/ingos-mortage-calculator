global.window = global;
require('./config_banks.js');
require('./parser.js');

const text = 'ВТБ РТ муж 17.11.1993 кв 2000 9576080 ставка 2,6% кд 23.04.2024 3 риска';
const data = window.parseTextToObject(text);
console.log('bank:', data.bank);
console.log('osz:', data.osz);
console.log('borrowers:', JSON.stringify(data.borrowers));
