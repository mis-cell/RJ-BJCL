const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const imapImport = `import imaps from 'imap-simple';\nimport { simpleParser } from 'mailparser';\n`;
if (!code.includes('imap-simple')) {
    code = code.replace('import nodemailer from "nodemailer";', `import nodemailer from "nodemailer";\n${imapImport}`);
}

const imapRoute = `
  // Fetch Email Route via IMAP
  app.get("/api/fetch-emails", async (req, res) => {
    const config = {
      imap: {
        user: "rawjute@ballyjute.com",
        password: "Longest#2026@",
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000
      }
    };

    try {
      const connection = await imaps.connect(config);
      await connection.openBox('INBOX');
      
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: false,
        struct: true
      };
      
      const results = await connection.search(searchCriteria, fetchOptions);
      
      const emails = await Promise.all(results.map(async (res) => {
        const all = res.parts.find(part => part.which === '');
        const id = res.attributes.uid;
        const idHeader = "Imap-Id";
        
        let parsed;
        if (all) {
           parsed = await simpleParser(all.body);
        } else {
           const headerPart = res.parts.find(part => part.which === 'HEADER');
           const textPart = res.parts.find(part => part.which === 'TEXT');
           const rawEmail = (headerPart ? headerPart.body : '') + '\\n\\n' + (textPart ? textPart.body : '');
           parsed = await simpleParser(rawEmail);
        }

        return {
           id: id.toString(),
           subject: parsed.subject || 'No Subject',
           senderName: parsed.from?.value[0]?.name || parsed.from?.value[0]?.address || 'Unknown',
           senderEmail: parsed.from?.value[0]?.address || 'Unknown',
           date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
           snippet: parsed.text ? parsed.text.substring(0, 100) + '...' : '',
           body: parsed.text || parsed.html || '',
           unread: true,
           starred: false
        };
      }));

      connection.end();
      return res.json({ success: true, emails });
    } catch (err) {
      console.error("IMAP Fetch Error:", err);
      return res.status(500).json({ error: "IMAP Error: " + err.message });
    }
  });

  // Health Check`;

if (!code.includes('/api/fetch-emails')) {
    code = code.replace('  // Health Check', imapRoute);
    fs.writeFileSync('server.ts', code);
    console.log('Server updated with IMAP route');
} else {
    console.log('IMAP route already exists');
}
