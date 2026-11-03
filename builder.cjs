const fs = require('fs');
const path = require('path');

const filePath = 'src/pages/Reports.tsx';
let c = fs.readFileSync(filePath, 'utf8');

c = c.replace(/\r\n/g, '\n');

const searchMarker = "        {/* --- 2. SAUDA ANALYZE (OUT) --- */}";
const markerIndex = c.indexOf(searchMarker);
if (markerIndex === -1) {
  console.error("Could not find sauda analyze marker!");
  process.exit(1);
}

const beforeSlice = c.substring(0, markerIndex);

const replacement = `        {/* --- 2. SAUDA ANALYZE (OUT) --- */}
        {reportType === 'sauda_analyze' && (
          <div className="bg-[#d4d0c8] border-2 border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] p-4 space-y-4" id="report-sauda-container">
             
             {/* Styled micro KPI belts */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
               <div className="bg-white border border-slate-300 p-2.5 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-sm font-black text-blue-950 tracking-tight leading-none mb-1">{saudaAggregates.count}</p>
                   <p className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest">Sauda Contracts</p>
                 </div>
                 <div className="bg-blue-50 p-1.5 border border-blue-100 rounded">
                   <ClipboardList className="h-4 w-4 text-blue-900" />
                 </div>
               </div>

               <div className="bg-white border border-slate-300 p-2.5 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-sm font-black text-indigo-900 tracking-tight leading-none mb-1">{saudaAggregates.totalWeight.toLocaleString()} T</p>
                   <p className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest">Total Weight Out</p>
                 </div>
                 <div className="bg-indigo-50 p-1.5 border border-indigo-100 rounded">
                   <Scale className="h-4 w-4 text-indigo-900" />
                 </div>
               </div>

               <div className="bg-white border border-slate-300 p-2.5 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-sm font-black text-emerald-850 tracking-tight leading-none mb-1">{saudaAggregates.totalUnits.toLocaleString()}</p>
                   <p className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest">Aggregate Units</p>
                 </div>
                 <div className="bg-emerald-50 p-1.5 border border-emerald-100 rounded">
                   <Layers className="h-4 w-4 text-emerald-800" />
                 </div>
               </div>

               <div className="bg-white border border-slate-305 p-2.5 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-sm font-black text-amber-900 tracking-tight leading-none mb-1">₹ {saudaAggregates.avgRate.toLocaleString()}</p>
                   <p className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest">Weighted Avg Rate / Ql</p>
                 </div>
                 <div className="bg-amber-50 p-1.5 border border-amber-100 rounded">
                   <TrendingUp className="h-4 w-4 text-amber-700" />
                 </div>
               </div>
             </div>

             {/* Interactive charts and layout */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Recharts Bar Chart Container */}
                <div className="lg:col-span-2 bg-white border border-gray-400 p-3 rounded-sm space-y-2 flex flex-col justify-between shadow-sm">
                   <div>
                     <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Top Brokers by Contract Weight (Metric Tons)</h4>
                     <p className="text-[8px] text-gray-400 italic">Distribution metrics based on live registered sauda logs</p>
                   </div>
                   
                   <div className="h-56 mt-2 font-mono text-[9px] select-none">
                     {saudaChartData.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-dashed border-gray-200">
                          <span>No transaction records found</span>
                       </div>
                     ) : (
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={saudaChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                           <XAxis dataKey="name" tick={{ fontSize: 7.5 }} />
                           <YAxis tick={{ fontSize: 7.5 }} />
                           <RechartsTooltip contentStyle={{ fontSize: 9 }} />
                           <Bar dataKey="weight" fill="#4f46e5" radius={[2, 2, 0, 0]}>
                             {saudaChartData.map((entry, index) => {
                               const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
                               return <Cell key={\`cell-\${index}\`} fill={colors[index % colors.length]} />;
                             })}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     )}
                   </div>
                </div>

                {/* Right side helper summary panel for Sauda */}
                <div className="lg:col-span-1 bg-white border border-gray-400 p-3 rounded-sm flex flex-col justify-between shadow-sm">
                   <div className="space-y-3">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Sauda Sourcing Statistics</h4>
                        <p className="text-[8px] text-gray-400 italic">Analytical summary of contract registry</p>
                      </div>

                      <div className="bg-slate-50 border p-2 space-y-2 text-[9px]">
                         <div>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Prime Broker</span>
                            <span className="font-extrabold text-slate-800 text-[10px] block truncate">
                               {saudaChartData[0]?.name || 'DIRECT'} ({saudaChartData[0]?.weight || 0} MT)
                            </span>
                         </div>
                         <div className="border-t pt-1.5 flex justify-between gap-1">
                            <div>
                               <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Brokers count</span>
                               <span className="font-extrabold text-slate-700 block">{saudaChartData.length} active</span>
                            </div>
                            <div className="text-right">
                               <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Scale sum mass</span>
                               <span className="font-extrabold text-indigo-900 block">{saudaAggregates.totalWeight.toLocaleString()} MT</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 p-2 text-[8.5px] text-amber-900 leading-normal rounded-sm">
                         💡 <strong>Sourcing Insight:</strong> Sauda contracts are fully mapped against live buyer commitments. Keep tracking weight discrepancies periodically.
                      </div>
                   </div>

                   <button 
                     id="download-sauda-ins"
                     onClick={() => {
                        window.print();
                     }}
                     className="w-full mt-2 bg-[#d4d0c8] py-1 border border-white hover:bg-white text-[9.5px] font-black uppercase shadow-[1px_1px_0_0_black]"
                   >
                     🖨️ Print Active sauda screen
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* --- 3. MAP WISE P.O --- */}
        {reportType === 'map_wise_po' && (
          <div className="space-y-4">
             {/* Map Page Header Info block */}
             <div className="bg-[#c0c0c0] p-3 border border-black/10 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
               <div>
                  <h4 className="text-[11px] font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                    <Globe className="h-4 w-4 text-slate-900 animate-spin-slow" />
                    <span>Inbound Jute Agency Geospatial Sourcing Terminal</span>
                  </h4>
                  <p className="text-[8px] text-slate-500 italic mt-0.5">Select an Agency Pin on the geographical terminal or select an item below to inspect secondary Area and individual Grade contracts</p>
               </div>
               
               <div className="bg-slate-800 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] border border-slate-700 px-3 py-1 text-white font-mono text-[9px] font-black tracking-widest flex items-center gap-3">
                 <span>ACTIVE AGENCIES: <span className="text-amber-400">{areaGroupedPo.length}</span></span>
                 <span className="text-slate-500">//</span>
                 <span>GLOBAL MT TONS: <span className="text-sky-400">{poData.reduce((acc,p) => acc + (Number(p.total_contract_mt)||0), 0).toFixed(2)} MT</span></span>
               </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Real-time OpenStreetMap Sourcing Tracker or Cyber Abstract Terminal */}
                <div className="lg:col-span-8 space-y-3 flex flex-col justify-between overflow-hidden">
                   {/* Map controls panel */}
                   <div className="bg-[#c0c0c0] p-1 border border-gray-400 rounded-sm flex items-center justify-between shadow-sm flex-wrap gap-1.5 text-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap font-sans">
                         <span className="text-[8.5px] font-black uppercase text-slate-700 font-mono tracking-wider px-2">Map Interface Mode:</span>
                         <button 
                           onClick={() => setMapMode('street')}
                           className={cn(
                             "px-2 py-0.5 text-[8.5px] font-bold uppercase border border-gray-400 shadow-[1px_1px_0_0_white]",
                             mapMode === 'street' ? "bg-indigo-900 text-white border-indigo-950 shadow-none font-black" : "bg-[#d4d0c8] hover:bg-white text-slate-800"
                           )}
                         >
                            🗺️ OpenStreetMap Std
                         </button>
                         <button 
                           onClick={() => setMapMode('voyager')}
                           className={cn(
                             "px-2 py-0.5 text-[8.5px] font-bold uppercase border border-gray-400 shadow-[1px_1px_0_0_white]",
                             mapMode === 'voyager' ? "bg-indigo-900 text-white border-indigo-950 shadow-none font-black" : "bg-[#d4d0c8] hover:bg-white text-slate-800"
                           )}
                         >
                            🎨 Voyager Accent
                         </button>
                         <button 
                           onClick={() => setMapMode('cyber')}
                           className={cn(
                             "px-2 py-0.5 text-[8.5px] font-bold uppercase border border-gray-400 shadow-[1px_1px_0_0_white]",
                             mapMode === 'cyber' ? "bg-slate-900 text-teal-400 border-slate-950 shadow-none font-black" : "bg-[#d4d0c8] hover:bg-white text-slate-800"
                           )}
                         >
                            🛰️ Cyber Radar
                         </button>
                      </div>

                      <div className="text-[7.5px] italic text-right px-2 text-slate-600 hidden sm:block font-bold">
                         {mapMode === 'street' && '🗺️ OpenStreetMap Live Standard'}
                         {mapMode === 'voyager' && '🎨 CartoDB Voyager Accent Theme'}
                         {mapMode === 'cyber' && '📡 Simulated Geodesic Cyber Radar'}
                      </div>
                   </div>

                   {mapMode === 'cyber' ? (
                      <div className="bg-slate-950 border-2 border-slate-800 h-[380px] w-full relative rounded-sm overflow-hidden shadow-inner flex flex-col justify-between p-3 select-none">
                     
                     {/* Cyber Tech Grid Background overlay */}
                     <div className="absolute inset-0 bg-transparent flex flex-col pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                     
                     {/* Compass Dial Indicator background */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-slate-850/15 pointer-events-none flex items-center justify-center">
                       <span className="w-48 h-48 rounded-full border border-dotted border-slate-850/20"></span>
                     </div>

                     {/* Radar sweep retro sweep bar */}
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/5 to-transparent skew-x-12 animate-pulse pointer-events-none"></div>

                     {/* Grid Coordinates display */}
                     <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-500 font-mono tracking-tight shrink-0 z-10">
                       <span className="uppercase">[Sensing Array Sector: Grid-3B]</span>
                       <span className="text-center font-extrabold uppercase animate-pulse text-sky-400 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
                         LIVE PO FEED CONSOLE ACCURATE
                       </span>
                     </div>

                     {/* Interactive Glowing Pins inside the geographic frame */}
                     <div className="flex-1 w-full relative min-h-[290px]">
                       {areaGroupedPo.map((area, idx) => {
                          const { x, y } = getDeterministicCoords(area.name);
                          const isSelected = selectedArea === area.name;
                          return (
                            <div 
                              key={area.name} 
                              className="absolute transition-all duration-350 cursor-pointer group"
                              style={{ left: \`\${x}%\`, top: \`\${y}%\` }}
                              onClick={() => {
                                setSelectedArea(area.name);
                              }}
                            >
                               {/* Pulsing glow halo represent supply volume */}
                               <span className={cn(
                                 "absolute -left-3 -top-3 w-8 h-8 rounded-full border opacity-20 pointer-events-none transition-all scale-100 group-hover:scale-125 duration-300",
                                 isSelected ? "bg-amber-400 border-amber-300 scale-150 opacity-40 animate-ping" : "bg-sky-500 border-sky-400"
                               )}></span>

                               {/* Pin Core component */}
                               <div className="relative flex items-center justify-center">
                                 <span className={cn(
                                   "w-3 h-3 rounded-full border border-white relative z-10 flex items-center justify-center transition-all shadow-md",
                                   isSelected ? "bg-amber-400 scale-125 ring-2 ring-black" : "bg-sky-600 group-hover:bg-sky-400"
                                 )}>
                                   <span className="w-1 h-1 bg-white rounded-full"></span>
                                 </span>
                                 
                                 {/* Floating Pin popup Label */}
                                 <div className={cn(
                                   "absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 border text-white font-mono text-[8px] font-black p-1 shadow-md rounded-sm z-30 transition-all uppercase flex gap-1.5 items-center",
                                   isSelected 
                                     ? "border-amber-300 bg-amber-950/95 text-amber-100 ring-1 ring-amber-500 scale-105" 
                                     : "border-slate-700 bg-slate-900/90 text-slate-300 opacity-90 group-hover:opacity-100 group-hover:border-sky-400"
                                 )}>
                                    <MapPin className={cn("h-2.5 w-2.5", isSelected ? "text-amber-300" : "text-sky-400")} />
                                    <span>{area.name}</span>
                                    <span className="text-indigo-300/90 pr-0.5 font-bold">({area.totalTons} MT)</span>
                                 </div>
                               </div>
                            </div>
                          );
                       })}
                     </div>

                     {/* Interactive HUD Instructions / Indicator keys */}
                     <div className="flex justify-between items-end border-t border-slate-800/80 pt-2 shrink-0 z-10 select-none">
                       <div className="flex gap-4 text-[7px] font-bold text-slate-500 font-mono">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block"></span>
                            <span>INACTIVE SELECTION</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping"></span>
                            <span className="text-slate-300">ACTIVE REGION TARGET</span>
                          </div>
                       </div>
                       <div className="text-[7.5px] font-extrabold text-slate-400 font-mono block">
                         AUTO MATRIX COORDINATES VERIFIED
                       </div>
                     </div>
                   </div>
                    ) : (
                       /* Live Free OpenStreetMap / Voyager Map Container with dynamic centering */
                       <div className="relative border border-slate-400 h-[380px] w-full rounded-sm overflow-hidden bg-slate-100 shadow-inner" style={{ height: '380px' }}>
                          <PigeonMap
                            center={center}
                            zoom={zoom}
                            onBoundsChanged={({ center: newCenter, zoom: newZoom }) => {
                              setCenter(newCenter);
                              setZoom(newZoom);
                            }}
                            provider={mapMode === 'voyager' ? voyagerProvider : osmProvider}
                            height={380}
                          >
                            {areaGroupedPo.map(area => {
                               const coords = getAreaCoordinates(area.name);
                               const isSelected = selectedArea === area.name;
                               return (
                                 <PigeonOverlay
                                   key={area.name}
                                   anchor={[coords.lat, coords.lng]}
                                   offset={[0, 0]}
                                 >
                                   <div 
                                     onClick={() => setSelectedArea(area.name)}
                                     className="relative group/marker cursor-pointer flex flex-col items-center select-none"
                                     style={{ transform: 'translate(-50%, -100%)' }}
                                   >
                                      {/* Pulsing ring halo */}
                                      <span className={cn(
                                        "absolute -left-3 -top-3 w-8 h-8 rounded-full border opacity-20 pointer-events-none transition-all scale-100 group-hover/marker:scale-125 duration-300",
                                        isSelected ? "bg-amber-400 border-amber-300 scale-150 opacity-40 animate-ping" : "bg-teal-500 border-teal-400 opacity-0"
                                      )}></span>
                                      
                                      {/* Drop shadow indicator */}
                                      <div className="w-1.5 h-1.5 bg-slate-900 rounded-full blur-[1px] opacity-45 translate-y-[2px]"></div>

                                      {/* Pin icon display */}
                                      <div className={cn(
                                        "w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-all -translate-y-[2px]",
                                        isSelected ? "bg-amber-500 scale-110" : "bg-teal-600 hover:bg-teal-500"
                                      )}>
                                        <MapPin className="h-2.5 w-2.5 text-white" />
                                      </div>

                                      {/* Floating tooltip overlay label */}
                                      <div className={cn(
                                        "absolute whitespace-nowrap bg-slate-950 border text-white font-mono text-[8px] font-black px-1.5 py-0.5 shadow-md rounded z-30 transition-all uppercase flex gap-1 items-center -translate-y-9",
                                        isSelected
                                          ? "border-amber-400 bg-amber-955 text-amber-100 opacity-100 scale-105"
                                          : "border-slate-700 bg-slate-900/95 text-slate-300 opacity-80 group-hover/marker:opacity-100"
                                      )}>
                                         <MapPin className="h-2 w-2 text-rose-500 animate-pulse" />
                                         <span>{area.name}</span>
                                         <span className="text-gray-450 font-normal font-sans">({area.totalTons} MT)</span>
                                      </div>
                                   </div>
                                 </PigeonOverlay>
                               );
                            })}
                          </PigeonMap>
                       </div>
                    )}

                   {/* Registry Breakdown under the Map */}
                   <div className="bg-white border border-gray-400 p-2.5 rounded-sm flex flex-col justify-between shadow-sm">
                     <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider mb-2">Agency-wise Sourcing Registry</span>
                     <div className="max-h-[148px] overflow-auto border border-gray-200">
                        <table className="w-full text-left text-[9px] border-collapse relative">
                          <thead className="bg-[#e4e0d8] font-bold sticky top-0 border-b border-gray-300">
                             <tr>
                               <th className="p-1 px-2 border-r border-gray-300">AGENCY SOURCING ZONE</th>
                               <th className="p-1 text-center border-r border-gray-300 w-24">PO COUNT</th>
                               <th className="p-1 text-right border-r border-gray-300 w-28">WEIGHT IN MT</th>
                               <th className="p-1 text-right w-24">% RATIO MAP</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                             {areaGroupedPo.map((areaItem, idx) => {
                               const isActive = selectedArea === areaItem.name;
                               return (
                                 <tr 
                                   key={idx} 
                                   onClick={() => setSelectedArea(areaItem.name)}
                                   className={cn(
                                     "hover:bg-[#ffffd0]/60 cursor-pointer font-bold select-none h-7",
                                     isActive ? "bg-amber-100 text-amber-955 font-black border-l-2 border-amber-600" : "even:bg-white/60"
                                   )}
                                 >
                                    <td className="p-1 px-2 font-mono uppercase font-black truncate max-w-[170px]" title={areaItem.name}>
                                       {areaItem.name}
                                    </td>
                                    <td className="p-1 text-center font-mono text-slate-400">
                                       {areaItem.count} POs
                                    </td>
                                    <td className="p-1 px-2 text-right font-mono text-indigo-950">
                                       {areaItem.totalTons.toLocaleString()} MT
                                    </td>
                                    <td className="p-1 px-2 text-right">
                                       <span className="text-[8.5px] bg-[#bfdbfe]/30 font-black px-1 rounded inline-block text-blue-900">{areaItem.percentage}%</span>
                                    </td>
                                 </tr>
                               );
                             })}
                             {areaGroupedPo.length === 0 && (
                               <tr>
                                 <td colSpan={4} className="p-4 text-center text-gray-400 italic">No agency records in the DB master list.</td>
                               </tr>
                             )}
                          </tbody>
                        </table>
                     </div>
                   </div>
                </div>

                {/* Drill Down side-sheet details */}
                <div id="area-drilldown-sheet" className="lg:col-span-4 bg-white border border-gray-400 p-3 flex flex-col justify-between rounded-sm shadow-sm font-sans">
                   <div className="space-y-4 overflow-hidden flex-1 flex flex-col">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Agency & Grade Sourcing Audit</h4>
                        <p className="text-[8.5px] text-gray-450 italic mb-1">Details representing currently selected Sourcing Agency</p>
                      </div>

                      {selectedAreaDetail ? (
                        <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                           <div className="bg-slate-50 border border-slate-200 p-2 text-[10px]">
                              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none mb-1 font-mono">Inspected Target Agency</span>
                              <span className="text-sm font-black text-amber-955 uppercase tracking-tight block truncate">{selectedAreaDetail.name}</span>
                              
                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/50 font-mono text-[9px]">
                                 <div className="bg-white border p-1 block">
                                    <span className="block text-[7.5px] text-gray-400 font-bold uppercase">PO Items</span>
                                    <span className="font-black text-rose-700">{selectedAreaDetail.count} Lines</span>
                                 </div>
                                 <div className="bg-white border p-1 block">
                                    <span className="block text-[7.5px] text-gray-450 font-bold uppercase">Scale Sum</span>
                                    <span className="font-black text-indigo-950">{selectedAreaDetail.totalTons} MT</span>
                                 </div>
                              </div>
                           </div>

                           <span className="text-[8px] font-extrabold text-slate-400 uppercase font-mono block mb-1">Detailed Listings ({selectedAreaDetail.pos.length})</span>
                           <div className="flex-1 overflow-auto border border-gray-200 bg-slate-50">
                             <div className="divide-y divide-slate-200">
                               {selectedAreaDetail.pos.map((p, idx) => (
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
                               ))}
                             </div>
                           </div>
                        </div>
                      ) : (
                        <div className="h-56 flex flex-col justify-center items-center text-gray-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-sm p-4">
                           <MapPin className="h-6 w-6 text-slate-300 mb-1" />
                           <span className="text-center text-[9px]">Select overlay agency from the Map or Sourcing registry list to load live purchase lists.</span>
                        </div>
                      )}
                   </div>

                   <button 
                     onClick={() => {
                        if (areaGroupedPo.length > 0) {
                           setSelectedArea(areaGroupedPo[0].name);
                        } else {
                           setSelectedArea(null);
                        }
                     }}
                     className="w-full mt-3 bg-[#d4d0c8] py-1.5 border border-white hover:bg-white text-[9.5px] font-bold uppercase shadow-[1px_1px_0_0_black]"
                   >
                     Select Default Prime Agency
                   </button>
                </div>
             </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1 select-none text-gray-450 border-t border-gray-300 mt-2">
           <div className="flex items-center gap-3">
              <History className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest italic leading-none text-gray-500">Live Connection Stable // Operational Control Console Enabled // Database Realtime Sourced</span>
           </div>
           
           <span className="text-[9.5px] font-black italic text-indigo-700 bg-white/60 px-2 py-0.5 border border-slate-300 uppercase shrink-0 font-mono">
             ERP REQ PORTLET: SECURE
           </span>
        </div>
      </div>
    </LegacyLayout>
  );
}
`;

fs.writeFileSync(filePath, beforeSlice + replacement);
console.log("Reconstructed Reports.tsx layout with correct PigeonMap and Broker chart blocks! Ready to serve!");
