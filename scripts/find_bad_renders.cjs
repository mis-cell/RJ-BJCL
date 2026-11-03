const fs = require('fs');
const content = fs.readFileSync('src/pages/MaterialInspection.tsx', 'utf8');

const regex = /\{([a-zA-Z0-9_]+)\}/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const lineNo = content.substring(0, match.index).split('\n').length;
  const word = match[1];
  // Check context (approx. 40 chars before and after)
  const start = Math.max(0, match.index - 40);
  const end = Math.min(content.length, match.index + match[0].length + 40);
  const context = content.substring(start, end).replace(/\n/g, ' ');
  console.log(`Line ${lineNo}: {${word}} | Context: ...${context}...`);
}
