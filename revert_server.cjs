const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/app\.post\(\["\/api\/send-email", "\/Jute-Purchase-Automation\/api\/send-email"\],/g, 'app.post("/api/send-email",');
code = code.replace(/app\.get\(\["\/api\/fetch-emails", "\/Jute-Purchase-Automation\/api\/fetch-emails"\],/g, 'app.get("/api/fetch-emails",');
code = code.replace(/app\.get\(\["\/api\/check-email-connection", "\/Jute-Purchase-Automation\/api\/check-email-connection"\],/g, 'app.get("/api/check-email-connection",');
code = code.replace(/app\.use\(\["\/api\/chat", "\/Jute-Purchase-Automation\/api\/chat"\],/g, 'app.use("/api/chat",');
code = code.replace(/app\.get\(\["\/api\/health", "\/Jute-Purchase-Automation\/api\/health"\],/g, 'app.get("/api/health",');

fs.writeFileSync('server.ts', code);
console.log("Reverted server.ts routes.");
