const fs = require('fs');
const f = 'src/pages/Reports.tsx';
let c = fs.readFileSync(f, 'utf8');

const target = `                               {selectedAreaDetail.pos.map((p, idx) => (
                                  <div key={p.po_id || idx} className="p-2 text-[9.5px] hover:bg-slate-100 border-l-[3px] border-l-slate-300">
                                    <div className="flex justify-between items-start font-mono">
                                       <span className="font-extrabold text-blue-900 border-b border-dashed border-slate-300 text-[10px] leading-tight select-all">#{p.po_no}</span>
                                       <span className="text-gray-400 text-[8px] italic">{p.po_date ? new Date(p.po_date).toLocaleDateString('en-GB') : ''}</span>
                                    </div>
                                    <div className="mt-1 font-bold text-slate-800 truncate" title={p.supplier}>{p.supplier || 'DIRECT'}</div>
                                    <div className="flex justify-between items-center text-[8.5px] text-gray-400 font-mono mt-1 font-bold">
                                       <span className="font-normal truncate tracking-widest max-w-[130px]">BROK: {p.broker || 'DIRECT'}</span>
                                       <span className="text-indigo-900 font-extrabold">{p.total_contract_mt ? \`\${p.total_contract_mt} MT\` : '--'}</span>
                                    </div>
                                  </div>
                               ))}`;

const replacement = `                               {selectedAreaDetail.pos.map((p, idx) => (
                                  <div key={p.po_id || idx} className="p-2 text-[9.5px] hover:bg-slate-100 border-l-[3px] border-l-slate-300">
                                    <div className="flex justify-between items-start font-mono">
                                       <span className="font-extrabold text-blue-900 border-b border-dashed border-slate-300 text-[10px] leading-tight select-all">#{p.po_no}</span>
                                       <span className="text-gray-400 text-[8px] italic">{p.po_date ? new Date(p.po_date).toLocaleDateString('en-GB') : ''}</span>
                                    </div>
                                    <div className="mt-1 font-bold text-slate-800 truncate flex justify-between gap-1 items-baseline">
                                       <span className="truncate max-w-[130px] font-bold text-slate-800" title={p.supplier}>{p.supplier || 'DIRECT'}</span>
                                       <span className="text-indigo-900 font-black shrink-0 font-mono">{p.total_contract_mt ? \`\${p.total_contract_mt} MT\` : '--'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-[8.2px] font-mono mt-1 font-bold text-slate-500 bg-white p-1 border border-slate-100 rounded-sm">
                                       <div className="truncate">AREA: <span className="text-teal-600 font-extrabold">{p.area || 'DIRECT SOURCING'}</span></div>
                                       <div className="truncate font-bold">GRADE: <span className="text-rose-600 font-extrabold">{p.grade_name || 'STANDARD'}</span></div>
                                    </div>
                                    <div className="text-[7.5px] text-gray-400 italic mt-0.5 font-mono">
                                       Broker: {p.broker || 'DIRECT'}
                                    </div>
                                  </div>
                               ))}`;

// Pre-clean line endings for comparison
const normalize = s => s.replace(/\r\n/g, '\n').trim();
const normalizedContent = c.replace(/\r\n/g, '\n');

// Standard label replacements
c = normalizedContent
  .replace('Purchase order listings ({selectedAreaDetail.pos.length})', 'Detailed Listings ({selectedAreaDetail.pos.length})')
  .replace('Select an area from the Map or Sourcing registry list to load live Purchase lists.', 'Select overlay agency from the Map or Sourcing registry list to load live purchase lists.')
  .replace('{selectedAreaDetail.count} Vouchers', '{selectedAreaDetail.count} Lines')
  .replace("block text-[7.5px] text-gray-400 font-bold uppercase\">POs</span>", "block text-[7.5px] text-gray-400 font-bold uppercase\">PO Items</span>");

// Fallback logic if white spaces differ slightly
let startIndex = c.indexOf('selectedAreaDetail.pos.map');
if (startIndex !== -1) {
  // Let's find index of corresponding closes
  let closeIndex = c.indexOf('))}', startIndex);
  if (closeIndex !== -1) {
    const originalPart = c.substring(startIndex, closeIndex + 4);
    c = c.substring(0, startIndex) + replacement.trim() + c.substring(closeIndex + 4);
    console.log('Successfully replaced matching loop part!');
  }
}

fs.writeFileSync(f, c);
console.log('Done script execution.');
