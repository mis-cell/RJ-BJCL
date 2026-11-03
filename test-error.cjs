const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace('<head>', '<head><script>window.addEventListener("error", function(e) { console.error("GLOBAL ERROR:", e.error && e.error.stack ? e.error.stack : e.message); });</script>');
fs.writeFileSync('index.html', code);
