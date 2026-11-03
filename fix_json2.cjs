const glob = require('glob');
const fs = require('fs');

const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace JSON.parse(X) with JSON.parse(X === "undefined" ? "null" : X)
  // only for simple variables (no parenthesis or function calls inside, except some properties)
  content = content.replace(/JSON\.parse\(([a-zA-Z0-9_.]+)\)/g, 'JSON.parse($1 === "undefined" ? "null" : $1)');

  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log("Fixed " + file);
  }
}
