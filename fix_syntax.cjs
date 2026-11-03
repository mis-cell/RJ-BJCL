const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDesk.tsx', 'utf8');
code = code.replace(/originalState = \(trimmed\.replace\("ORIGINAL:", "" === 'undefined' \? null : JSON\.parse\(trimmed\.replace\("ORIGINAL:", ""\)\)\.trim\(\)\);/g, 'originalState = JSON.parse(trimmed.replace("ORIGINAL:", "").trim());');
code = code.replace(/updatedState = \(trimmed\.replace\("UPDATED:", "" === 'undefined' \? null : JSON\.parse\(trimmed\.replace\("UPDATED:", ""\)\)\.trim\(\)\);/g, 'updatedState = JSON.parse(trimmed.replace("UPDATED:", "").trim());');
fs.writeFileSync('src/pages/AdminDesk.tsx', code);
