const fs = require('fs');
const path = require('path');

const filePath = 'src/pages/Reports.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// Find the boundaries of the else part of mapMode === 'cyber' conditional
// It starts right after the cyber div:
// "                    </div>\n                    ) : ("
const startMarker = "                    </div>\n                     ) : (";
const endMarker = "                     )}\n\n                   {/* Registry Breakdown under the Map */}";

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error("Could not find start marker of the Google Map block!");
  process.exit(1);
}

// Let's find the closing block of that condition which is followed by the registry breakdown
const breakdownMarker = "                   {/* Registry Breakdown under the Map */}";
const breakdownIndex = content.indexOf(breakdownMarker);
if (breakdownIndex === -1) {
  console.error("Could not find registry breakdown marker!");
  process.exit(1);
}

// Find the block closing parenthesis and curly brace before the registry breakdown marker
// Search backwards from breakdownIndex for "                    )}\n" or similar
let elseBlockEndIndex = -1;
const searchRange = content.substring(startIndex, breakdownIndex);
const closingIndexInRange = searchRange.lastIndexOf("                     )}");
if (closingIndexInRange === -1) {
  console.error("Could not find closing parenthesis for the else block!");
  process.exit(1);
}

elseBlockEndIndex = startIndex + closingIndexInRange + "                     )}".length;

const beforeBlock = content.substring(0, startIndex + "                    </div>\n                     ) : (".length);
const afterBlock = content.substring(elseBlockEndIndex);

const pigeonMapBlock = `
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
                                          ? "border-amber-400 bg-amber-950 text-amber-100 opacity-100 scale-105"
                                          : "border-slate-700 bg-slate-900/95 text-slate-300 opacity-80 group-hover/marker:opacity-100"
                                      )}>
                                         <MapPin className="h-2 w-2 text-rose-500 animate-pulse" />
                                         <span>{area.name}</span>
                                         <span className="text-gray-400 font-normal">({area.totalTons} MT)</span>
                                      </div>
                                   </div>
                                 </PigeonOverlay>
                               );
                            })}
                          </PigeonMap>
                       </div>
                    )`;

const updatedContent = beforeBlock + pigeonMapBlock + afterBlock;
fs.writeFileSync(filePath, updatedContent);
console.log("Successfully replaced the Google Maps module and placeholders with OpenStreetMap!");
