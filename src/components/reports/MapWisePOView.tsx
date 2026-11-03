import React, { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Map as PigeonMap, Overlay as PigeonOverlayOriginal } from 'pigeon-maps';
import { cn } from '../../lib/utils';
import {
  voyagerProvider,
  osmProvider,
  getAreaCoordinates,
  AreaGroupedPoItem
} from './types';

const PigeonOverlay = PigeonOverlayOriginal as any;

interface MapWisePOViewProps {
  poData: any[];
  poDetails: any[];
  agencyList: any[];
  gradeList: any[];
}

export const MapWisePOView: React.FC<MapWisePOViewProps> = ({
  poData,
  poDetails,
  agencyList,
  gradeList
}) => {
  const [mapMode, setMapMode] = useState<'street' | 'voyager' | 'cyber'>('street');
  const [sourcingGroupMode, setSourcingGroupMode] = useState<'area' | 'agency' | 'both'>('agency');
  const [center, setCenter] = useState<[number, number]>([24.5, 84.5]);
  const [zoom, setZoom] = useState<number>(5.5);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Group PO data by area / agency / both
  const areaGroupedPo = useMemo<AreaGroupedPoItem[]>(() => {
    const groups: Record<string, { name: string; count: number; totalTons: number; pos: any[] }> = {};
    let grandTons = 0;

    poData.forEach(p => {
      // Get logical clean Area from purchase_master (p.area)
      const areaName = (p.area || '').trim().toUpperCase() || 'DIRECT SOURCING';

      // Get Agency from purchase_detail_master (poDetails) and agency_master (agencyList)
      const matchingDetails = poDetails.filter(d => d.po_no === p.po_no);
      let fetchedAgencyName = 'MAIN AGENCY';
      if (matchingDetails.length > 0) {
        const detailWithAgency = matchingDetails.find(d => d.agency_code);
        if (detailWithAgency && detailWithAgency.agency_code) {
          const code = String(detailWithAgency.agency_code).trim();
          const matchedAg = agencyList.find(a => String(a.agency_code).trim().toUpperCase() === code.toUpperCase());
          fetchedAgencyName = matchedAg ? matchedAg.agency_name : code;
        } else {
          fetchedAgencyName = (p.purchase_unit_name || p.agency_name || p.agency_code || 'MAIN AGENCY').trim();
        }
      } else {
        fetchedAgencyName = (p.purchase_unit_name || p.agency_name || p.agency_code || 'MAIN AGENCY').trim();
      }
      const agencyName = fetchedAgencyName.toUpperCase();

      // Decide group name based on chosen sourcingGroupMode
      let groupName = '';
      if (sourcingGroupMode === 'area') {
        groupName = areaName;
      } else if (sourcingGroupMode === 'agency') {
        groupName = agencyName;
      } else {
        groupName = `${areaName} - ${agencyName}`;
      }
      
      // Calculate individual PO weight using detail lines first if present
      let calculatedWt = 0;
      if (matchingDetails.length > 0) {
        calculatedWt = matchingDetails.reduce((sum, d) => sum + (Number(d.weight_mt) || Number(d.weight) || 0), 0);
      }
      if (calculatedWt === 0) {
        calculatedWt = Number(p.total_contract_mt) || 0;
      }
      if (calculatedWt === 0) {
        const totalUnits = Number(p.total_units) || (Number(p.total_lorries) * Number(p.units_per_lorry)) || 0;
        const weightUnitKgs = Number(p.weight_unit_kgs) || 50;
        calculatedWt = (totalUnits * weightUnitKgs) / 1000;
        if (calculatedWt === 0) {
          calculatedWt = Number(p.total_lorries) * (Number(p.weight_per_lorry) || 0);
        }
      }

      grandTons += calculatedWt;

      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          count: 0,
          totalTons: 0,
          pos: []
        };
      }

      groups[groupName].count++;
      groups[groupName].totalTons += calculatedWt;

      let gradeName = 'STANDARD GRADE';
      if (matchingDetails.length > 0) {
        const firstDetail = matchingDetails[0];
        const gradeObj = gradeList.find(g => g.grade_code === firstDetail.grade_code);
        gradeName = gradeObj ? gradeObj.grade_name : (firstDetail.grade_code || 'STANDARD GRADE');
      }

      groups[groupName].pos.push({
        po_no: p.po_no,
        po_id: p.po_id,
        po_date: p.po_date,
        area: areaName,
        agency_name: agencyName,
        grade_name: gradeName,
        supplier: p.supplier || 'DIRECT',
        broker: p.broker || 'DIRECT',
        total_contract_mt: calculatedWt
      });
    });

    return Object.values(groups).map(g => ({
      ...g,
      percentage: grandTons > 0 ? parseFloat(((g.totalTons / grandTons) * 100).toFixed(1)) : 0,
      totalTons: parseFloat(g.totalTons.toFixed(3))
    })).sort((a, b) => b.totalTons - a.totalTons);
  }, [poData, poDetails, gradeList, agencyList, sourcingGroupMode]);

  // Set default selection if none
  useEffect(() => {
    if (areaGroupedPo.length > 0 && !selectedArea) {
      setSelectedArea(areaGroupedPo[0].name);
    }
  }, [areaGroupedPo, selectedArea]);

  const getDeterministicCoords = (name: string) => {
    let hash1 = 0;
    let hash2 = 0;
    for (let i = 0; i < name.length; i++) {
      hash1 = name.charCodeAt(i) + ((hash1 << 5) - hash1);
      hash2 = name.charCodeAt(i) + ((hash2 << 7) - hash2);
    }
    const x = Math.min(85, Math.max(15, Math.abs(hash1) % 65 + 18));
    const y = Math.min(80, Math.max(15, Math.abs(hash2) % 65 + 15));
    return { x, y };
  };

  const selectedAreaDetail = useMemo(() => {
    if (!selectedArea) return null;
    return areaGroupedPo.find(a => a.name === selectedArea) || null;
  }, [areaGroupedPo, selectedArea]);

  const mapCenter = useMemo(() => {
    if (areaGroupedPo.length === 0) return { lat: 24.5, lng: 84.5 };
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;
    areaGroupedPo.forEach(area => {
      const coords = getAreaCoordinates(area.name);
      sumLat += coords.lat;
      sumLng += coords.lng;
      count++;
    });
    return { lat: sumLat / count, lng: sumLng / count };
  }, [areaGroupedPo]);

  // Sync center and zoom when selectedArea changes
  useEffect(() => {
    if (selectedArea) {
      const coords = getAreaCoordinates(selectedArea);
      setCenter([coords.lat, coords.lng]);
      setZoom(7.5);
    } else {
      setCenter([mapCenter.lat, mapCenter.lng]);
      setZoom(5.5);
    }
  }, [selectedArea, mapCenter]);

  return (
    <div className="space-y-4">
      {/* Map Page Header Option Bar */}
      <div className="bg-white p-2 border border-slate-200 shadow-sm rounded-lg flex items-center justify-start gap-3 flex-wrap">
        {/* Sourcing Stats Box on Left Side */}
        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md shadow-sm text-white font-mono text-[8.5px] font-black tracking-wider flex items-center gap-2">
          <span>
            ACTIVE {sourcingGroupMode === 'area' ? 'AREAS' : sourcingGroupMode === 'agency' ? 'AGENCIES' : 'REGIONS'}:
            <span className="text-emerald-400 ml-1">
              {areaGroupedPo.length}
            </span>
          </span>
          <span className="text-slate-500">•</span>
          <span>
            GLOBAL MT TONS:
            <span className="text-cyan-400 ml-1">
              {poData.reduce((acc, p) => acc + (Number(p.total_contract_mt) || 0), 0).toFixed(2)} MT
            </span>
          </span>
        </div>

        {/* Divider */}
        <span className="text-slate-300 hidden lg:inline">|</span>

        {/* Map Modes */}
        <div className="flex items-center gap-1.5 flex-wrap font-sans">
          <button
            onClick={() => setMapMode('street')}
            className={cn(
              "px-3 py-1.5 text-[8.5px] font-bold uppercase border rounded-md transition-all duration-150 cursor-pointer",
              mapMode === 'street'
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm font-black"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800"
            )}
          >
            🗺️ OPENSTREETMAP STD
          </button>

          <button
            onClick={() => setMapMode('voyager')}
            className={cn(
              "px-3 py-1.5 text-[8.5px] font-bold uppercase border rounded-md transition-all duration-150 cursor-pointer",
              mapMode === 'voyager'
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm font-black"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800"
            )}
          >
            🎨 VOYAGER ACCENT
          </button>

          <button
            onClick={() => setMapMode('cyber')}
            className={cn(
              "px-3 py-1.5 text-[8.5px] font-bold uppercase border rounded-md transition-all duration-150 cursor-pointer",
              mapMode === 'cyber'
                ? "bg-slate-900 text-cyan-400 border-slate-900 shadow-sm font-black"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
            )}
          >
            📡 CYBER RADAR
          </button>
        </div>

        {/* Divider */}
        <span className="text-slate-300 hidden md:inline">|</span>

        {/* Sourcing Category Modes */}
        <div className="flex items-center gap-1.5 flex-wrap font-sans">
          <button
            onClick={() => setSourcingGroupMode('area')}
            className={cn(
              "px-3 py-1.5 text-[8.5px] font-bold uppercase border rounded-md transition-all duration-150 cursor-pointer",
              sourcingGroupMode === 'area'
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm font-black"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800"
            )}
          >
            🗺️ AREA WISE
          </button>

          <button
            onClick={() => setSourcingGroupMode('agency')}
            className={cn(
              "px-3 py-1.5 text-[8.5px] font-bold uppercase border rounded-md transition-all duration-150 cursor-pointer",
              sourcingGroupMode === 'agency'
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm font-black"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800"
            )}
          >
            🏢 AGENCY WISE
          </button>

          <button
            onClick={() => setSourcingGroupMode('both')}
            className={cn(
              "px-3 py-1.5 text-[8.5px] font-bold uppercase border rounded-md transition-all duration-150 cursor-pointer",
              sourcingGroupMode === 'both'
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm font-black"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800"
            )}
          >
            🏷️ ALL (COMBINED)
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Real-time Map Sourcing Tracker or Cyber Abstract Terminal */}
        <div className="w-full space-y-3 flex flex-col justify-between overflow-hidden">
          {mapMode === 'cyber' ? (
            <div className="bg-slate-950 border-2 border-slate-800 h-[450px] w-full relative rounded-sm overflow-hidden shadow-inner flex flex-col justify-between p-3">
              {/* Cyber Tech Grid Background overlay */}
              <div
                className="absolute inset-0 bg-transparent flex flex-col pointer-events-none opacity-[0.06]"
                style={{
                  backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
                }}
              />
              
              {/* Compass Dial Indicator background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-slate-800/15 pointer-events-none flex items-center justify-center">
                <span className="w-48 h-48 rounded-full border border-dotted border-slate-800/20" />
              </div>

              {/* Radar sweep retro sweep bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/5 to-transparent skew-x-12 animate-pulse pointer-events-none" />

              {/* Grid Coordinates display */}
              <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-500 font-mono tracking-tight shrink-0 z-10">
                <span className="uppercase">[Sensing Array Sector: Grid-3B]</span>
                <span className="text-center font-extrabold uppercase animate-pulse text-sky-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
                  LIVE PO FEED CONSOLE ACCURATE
                </span>
              </div>

              {/* Interactive Glowing Pins inside the geographic frame */}
              <div className="flex-1 w-full relative min-h-[290px]">
                {areaGroupedPo.map((area) => {
                  const { x, y } = getDeterministicCoords(area.name);
                  const isSelected = selectedArea === area.name;
                  return (
                    <div 
                      key={area.name} 
                      className="absolute transition-all duration-350 cursor-pointer group"
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => setSelectedArea(area.name)}
                    >
                      <span className={cn(
                        "absolute -left-3 -top-3 w-8 h-8 rounded-full border opacity-20 pointer-events-none transition-all scale-100 group-hover:scale-125 duration-300",
                        isSelected ? "bg-amber-400 border-amber-300 scale-150 opacity-40 animate-ping" : "bg-sky-500 border-sky-400"
                      )} />

                      <div className="relative flex items-center justify-center">
                        <span className={cn(
                          "w-3 h-3 rounded-full border border-white relative z-10 flex items-center justify-center transition-all shadow-md",
                          isSelected ? "bg-amber-400 scale-125 ring-2 ring-black" : "bg-sky-600 group-hover:bg-sky-400"
                        )}>
                          <span className="w-1 h-1 bg-white rounded-full" />
                        </span>
                        
                        <div className={cn(
                          "absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 border text-white font-mono text-[10px] font-black p-1.5 px-2.5 shadow-md rounded-sm z-30 transition-all uppercase flex gap-2 items-center",
                          isSelected 
                            ? "border-amber-300 bg-amber-950/95 text-amber-100 ring-1 ring-amber-500 scale-105" 
                            : "border-slate-700 bg-slate-900/90 text-slate-300 opacity-90 group-hover:opacity-100 group-hover:border-sky-400"
                        )}>
                          <MapPin className={cn("h-3.5 w-3.5 animate-pulse", isSelected ? "text-amber-300" : "text-sky-400")} />
                          <span className="font-sans font-black tracking-wider text-[11px]">{area.name}</span>
                          <span className={cn("font-bold px-1 py-0.5 rounded text-[9.5px]", isSelected ? "bg-amber-900/60 text-amber-200 animate-pulse" : "bg-sky-950 text-sky-300")}>{area.count} P.O.</span>
                          <span className="text-emerald-400 font-extrabold font-mono text-[10px]">({parseFloat(area.totalTons.toFixed(1))} MT)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive HUD Instructions / Indicator keys */}
              <div className="flex justify-between items-end border-t border-slate-800/80 pt-2 shrink-0 z-10">
                <div className="flex gap-4 text-[7px] font-bold text-slate-500 font-mono">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                    <span>INACTIVE SELECTION</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping" />
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
            <div className="relative border border-slate-400 h-[450px] w-full rounded-sm overflow-hidden bg-slate-100 shadow-inner" style={{ height: '450px' }}>
              <PigeonMap
                center={center}
                zoom={zoom}
                onBoundsChanged={({ center: newCenter, zoom: newZoom }) => {
                  setCenter(newCenter);
                  setZoom(newZoom);
                }}
                provider={mapMode === 'voyager' ? voyagerProvider : osmProvider}
                height={450}
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
                        className="relative group/marker cursor-pointer flex flex-col items-center"
                        style={{ transform: 'translate(-50%, -100%)' }}
                      >
                        <span className={cn(
                          "absolute w-12 h-12 rounded-full border opacity-25 pointer-events-none transition-all scale-100 group-hover/marker:scale-125 duration-300 -translate-y-4",
                          isSelected ? "bg-amber-400 border-amber-300 scale-150 opacity-40 animate-ping" : "bg-teal-500 border-teal-400 opacity-0"
                        )} />
                        
                        <div className="w-2.5 h-1.5 bg-slate-900 rounded-full blur-[1px] opacity-40 translate-y-[2px]" />

                        <div className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-sm border-2 shadow-md transition-all transform hover:-translate-y-0.5",
                          isSelected 
                            ? "bg-amber-600 border-amber-300 text-white font-extrabold scale-105 z-40" 
                            : "bg-teal-800 border-teal-500 text-teal-50 hover:bg-teal-700 scale-100 z-10"
                        )}>
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-200 animate-bounce" />
                          <div className="flex flex-col text-left leading-none font-sans">
                            <span className="text-[11px] font-black tracking-tight uppercase whitespace-nowrap">{area.name}</span>
                            <span className="text-[9.5px] font-mono opacity-90 mt-0.5 flex gap-1.5 items-center whitespace-nowrap font-bold">
                              <span>{area.count} P.O.</span>
                              <span className="opacity-45">|</span>
                              <span className="text-yellow-300 font-extrabold">{parseFloat(area.totalTons.toFixed(1))} MT</span>
                            </span>
                          </div>
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
            <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider mb-2">
              {sourcingGroupMode === 'area' && 'Area-wise Jute Sourcing Registry'}
              {sourcingGroupMode === 'agency' && 'Agency-wise Jute Sourcing Registry'}
              {sourcingGroupMode === 'both' && 'Area & Agency Combined Sourcing Registry'}
            </span>
            <div className="max-h-[148px] overflow-auto border border-gray-200">
              <table className="w-full text-left text-[9px] border-collapse relative">
                <thead className="bg-[#e4e0d8] font-bold sticky top-0 border-b border-gray-300">
                  <tr>
                    <th className="p-1 px-2 border-r border-gray-300">{sourcingGroupMode === 'area' ? 'SOURCING AREA' : sourcingGroupMode === 'agency' ? 'SOURCING AGENCY' : 'AREA & AGENCY COMBINED'}</th>
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
                          "hover:bg-[#ffffd0]/60 cursor-pointer font-bold h-7",
                          isActive ? "bg-amber-100 text-amber-900 font-black border-l-2 border-amber-600" : "even:bg-white/60"
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
        <div id="area-drilldown-sheet" className="w-full bg-white border border-gray-400 p-3 flex flex-col justify-between rounded-sm shadow-sm font-sans">
          <div className="space-y-4 overflow-hidden flex-1 flex flex-col">
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                {sourcingGroupMode === 'area' ? 'Area & Sourcing Grade Detail Audit' : sourcingGroupMode === 'agency' ? 'Agency & Sourcing Grade Detail Audit' : 'Combined Area/Agency Grade Audit'}
              </h4>
              <p className="text-[8.5px] text-gray-500 italic mb-1">
                {sourcingGroupMode === 'area' ? 'Details representing currently selected Sourcing Area' : sourcingGroupMode === 'agency' ? 'Details representing currently selected Sourcing Agency' : 'Details representing currently selected Sourcing Area & Agency'}
              </p>
            </div>

            {selectedAreaDetail ? (
              <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-50 border border-slate-200 p-2 text-[10px]">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none mb-1 font-mono">
                    {sourcingGroupMode === 'area' ? 'Inspected Target Area' : sourcingGroupMode === 'agency' ? 'Inspected Target Agency' : 'Inspected Combined Segment'}
                  </span>
                  <span className="text-sm font-black text-amber-900 uppercase tracking-tight block truncate">
                    {selectedAreaDetail.name}
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/50 font-mono text-[9px]">
                    <div className="bg-white border p-1 block">
                      <span className="block text-[7.5px] text-gray-400 font-bold uppercase">PO Items</span>
                      <span className="font-black text-rose-700">{selectedAreaDetail.count} Lines</span>
                    </div>
                    <div className="bg-white border p-1 block">
                      <span className="block text-[7.5px] text-gray-500 font-bold uppercase">Scale Sum</span>
                      <span className="font-black text-indigo-950">{selectedAreaDetail.totalTons} MT</span>
                    </div>
                  </div>
                </div>

                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-mono block mb-1">Detailed Listings ({selectedAreaDetail.pos.length})</span>
                <div className="flex-1 overflow-auto border border-gray-200 bg-slate-50 max-h-[300px]">
                  <div className="divide-y divide-slate-200">
                    {selectedAreaDetail.pos.map((p, idx) => (
                      <div key={p.po_id || idx} className="p-2 text-[9.5px] hover:bg-slate-100 border-l-[3px] border-l-slate-300">
                        <div className="flex justify-between items-start font-mono">
                          <span className="font-extrabold text-blue-900 border-b border-dashed border-slate-300 text-[10px] leading-tight select-all">#{p.po_no}</span>
                          <span className="text-gray-400 text-[8px] italic">{p.po_date ? new Date(p.po_date).toLocaleDateString('en-GB') : ''}</span>
                        </div>
                        <div className="mt-1 font-bold text-slate-800 truncate flex justify-between gap-1 items-baseline">
                          <span className="truncate max-w-[130px] font-bold text-slate-800" title={p.supplier}>{p.supplier || 'DIRECT'}</span>
                          <span className="text-indigo-900 font-black shrink-0 font-mono">{p.total_contract_mt ? `${p.total_contract_mt} MT` : '--'}</span>
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
            className="w-full mt-3 bg-[#FBCFCB] py-1.5 border border-white hover:bg-white text-[9.5px] font-bold uppercase shadow-[1px_1px_0_0_black]"
          >
            Select Default Prime Agency
          </button>
        </div>
      </div>
    </div>
  );
};
