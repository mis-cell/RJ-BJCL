const fs = require('fs');
const code = fs.readFileSync('src/pages/SmsSaudaDesk.tsx', 'utf8');

const openDivs = (code.match(/<div(\s|>)/g) || []).length;
const closeDivs = (code.match(/<\/div>/g) || []).length;

console.log('Open divs:', openDivs);
console.log('Close divs:', closeDivs);
