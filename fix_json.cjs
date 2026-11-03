const glob = require('glob');
const fs = require('fs');

const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // The bad patterns:
  // ((localStorage.getItem("mill_inspection_print_logs" === 'undefined' ? null : JSON.parse((localStorage.getItem("mill_inspection_print_logs")) === "undefined" ? "[]" : (localStorage.getItem("mill_inspection_print_logs") || "[]")));
  // ((localStorage.getItem("printed_inspections" === 'undefined' ? null : JSON.parse((localStorage.getItem("printed_inspections")) === "undefined" ? "{}" : (localStorage.getItem("printed_inspections") || "{}")));
  // (trimmed.replace("ORIGINAL:", "" === 'undefined' ? null : JSON.parse(trimmed.replace("ORIGINAL:", "")).trim());
  
  content = content.replace(/\(\(localStorage\.getItem\("([^"]+)" === 'undefined' \? null : JSON\.parse\(\(localStorage\.getItem\("([^"]+)"\)\) === "undefined" \? "\[\]" : \(localStorage\.getItem\("([^"]+)"\) \|\| "\[\]"\)\)\);/g, 'JSON.parse(localStorage.getItem("$1") === "undefined" ? "[]" : (localStorage.getItem("$1") || "[]"));');
  content = content.replace(/\(\(localStorage\.getItem\("([^"]+)" === 'undefined' \? null : JSON\.parse\(\(localStorage\.getItem\("([^"]+)"\)\) === "undefined" \? "{}" : \(localStorage\.getItem\("([^"]+)"\) \|\| "{}"\)\)\);/g, 'JSON.parse(localStorage.getItem("$1") === "undefined" ? "{}" : (localStorage.getItem("$1") || "{}"));');
  
  content = content.replace(/\(trimmed\.replace\("ORIGINAL:", "" === 'undefined' \? null : JSON\.parse\(trimmed\.replace\("ORIGINAL:", ""\)\)\.trim\(\)\);/g, 'JSON.parse(trimmed.replace("ORIGINAL:", "").trim());');
  content = content.replace(/\(trimmed\.replace\("UPDATED:", "" === 'undefined' \? null : JSON\.parse\(trimmed\.replace\("UPDATED:", ""\)\)\.trim\(\)\);/g, 'JSON.parse(trimmed.replace("UPDATED:", "").trim());');
  
  // Undo all (X === 'undefined' ? null : JSON.parse(X)) => JSON.parse(X) for now to ensure compile. We will fix undefined via a simple string replacement.
  content = content.replace(/\(([a-zA-Z0-9_.]+) === 'undefined' \? null : JSON\.parse\(([a-zA-Z0-9_.]+)\)\)/g, 'JSON.parse($1)');
  // there are some with spaces or complex expressions: (customRaw === 'undefined' ? null : JSON.parse(customRaw))
  content = content.replace(/\(([^=]+) === 'undefined' \? null : JSON\.parse\(([^)]+)\)\)/g, 'JSON.parse($1)');

  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log("Reverted " + file);
  }
}
