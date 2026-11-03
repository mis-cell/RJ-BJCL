const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const targetStr = `                   <button className="bg-slate-50 hover:bg-slate-100 border border-slate-300 p-2.5 text-[10px] font-black uppercase text-left flex items-center justify-between group rounded-lg cursor-pointer transition-colors">
                      <span>Generate Stock Audit</span>
                      <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-slate-850" />
                   </button>
                   <button className="bg-slate-50 hover:bg-slate-100 border border-slate-300 p-2.5 text-[10px] font-black uppercase text-left flex items-center justify-between group rounded-lg cursor-pointer transition-colors">
                      <span>Export Ledger Report</span>
                      <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-slate-850" />
                   </button>`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, '');
    fs.writeFileSync('src/pages/Dashboard.tsx', code);
    console.log("Dummy buttons removed.");
} else {
    console.log("Target string not found.");
}
