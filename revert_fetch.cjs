const fs = require('fs');
const glob = require('glob');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replacements = [
    { from: '`${import.meta.env.BASE_URL}api/check-email-connection`', to: '"/api/check-email-connection"' },
    { from: '`${import.meta.env.BASE_URL}api/fetch-emails`', to: '"/api/fetch-emails"' },
    { from: '`${import.meta.env.BASE_URL}api/send-email`', to: '"/api/send-email"' },
    { from: '`${import.meta.env.BASE_URL}api/chat`', to: '"/api/chat"' }
  ];

  replacements.forEach(r => {
    if (content.includes(r.from)) {
      content = content.replaceAll(r.from, r.to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log("Reverted base URL in", file);
  }
}

glob.sync('src/**/*.tsx').forEach(patchFile);
glob.sync('src/**/*.ts').forEach(patchFile);
