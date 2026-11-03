import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Printer,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Compass,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
} from "lucide-react";

interface ExtraPagesTabProps {
  purchaseOrders: any[];
}

export default function ExtraPagesTab({ purchaseOrders = [] }: ExtraPagesTabProps) {
  const [activeExtraTab, setActiveExtraTab] = useState<
    "calendar" | "invoice" | "maps" | "timeline" | "status_screens"
  >("calendar");

  // INVOICE STATE
  const [selectedPoNo, setSelectedPoNo] = useState<string>(() => {
    return purchaseOrders.length > 0 ? purchaseOrders[0].po_no : "PO-183/26";
  });

  const activePo = purchaseOrders.find((po) => po.po_no === selectedPoNo) || purchaseOrders[0] || {
    po_no: "PO-183/26",
    po_date: "2026-05-26",
    broker: "DIRECT RAW JUTE",
    supplier: "VARIOUS RAW SUPPLIER",
    area: "BIHAR REGION",
    total_contract_mt: 36,
    total_units: 200,
    purchase_unit_name: "BALES",
    b_rate: 17200,
  };

  // Math for Invoice
  const totalBales = Number(activePo.total_units) || 200;
  const itemRate = Number(activePo.b_rate) || 17200;
  const grossAmount = (totalBales * itemRate) / 5; // standard mathematical pricing conversion for jute
  const taxSurcharge = grossAmount * 0.12; // 12% IGST Jute Product taxation
  const logisticsFee = (grossAmount * 0.03); // 3%
  const invoiceTotal = grossAmount + taxSurcharge + logisticsFee;

  // CALENDAR WIDGET STATE
  const [selectedDay, setSelectedDay] = useState(26);
  const calendarEvents: Record<number, { title: string; type: string }[]> = {
    4: [{ title: "Amad fiber arrival #101", type: "arrival" }],
    12: [{ title: "Quality audit, Bihar Mill", type: "audit" }],
    18: [{ title: "F.Y: 2026-2027 audit deadline", type: "deadline" }],
    26: [
      { title: "Supplier payment clearing", type: "payment" },
      { title: "Sauda review, DIRECT BROKER", type: "sauda" },
    ],
  };

  // Jute Crop Yield regional vector metadata of India shipping sectors
  const vectorsMap = [
    { id: "WB", name: "West Bengal Primary Sector", yield: "78,000 Metric Tons", color: "fill-emerald-200 hover:fill-emerald-400" },
    { id: "BH", name: "Bihar Jute Valley Sector", yield: "42,000 Metric Tons", color: "fill-emerald-100 hover:fill-emerald-300" },
    { id: "AS", name: "Assam Riparian Wetland", yield: "29,000 Metric Tons", color: "fill-indigo-150 hover:fill-indigo-400" },
  ];
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Print invoice modal simulation
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Category Selection triggers */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-xl overflow-x-auto scrollbar-none">
        {(
          [
            { id: "calendar", label: "Interactive Calendar" },
            { id: "invoice", label: "Invoice Generator" },
            { id: "maps", label: "Maps & Vectors" },
            { id: "timeline", label: "Workflow Timeline" },
            { id: "status_screens", label: "Splash & 404 Pages" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveExtraTab(tab.id)}
            className={`px-4 py-2 text-xs font-black uppercase whitespace-nowrap transition-all rounded-lg shrink-0 ${
              activeExtraTab === tab.id
                ? "bg-white text-pink-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-6">
        
        {/* SUBTAB 1: INTERACTIVE CALENDAR WIDGET */}
        {activeExtraTab === "calendar" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Grid days layout */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  May 2026
                </span>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-slate-200 rounded text-slate-600">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="p-1 hover:bg-slate-200 rounded text-slate-600">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase text-slate-400">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
                
                {/* Mock days logic */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const hasEvents = !!calendarEvents[day];
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`aspect-square rounded-xl text-xs font-bold font-mono transition-all relative flex items-center justify-center ${
                        isSelected
                          ? "bg-pink-600 text-white shadow-md shadow-pink-500/20 font-black scale-102"
                          : "bg-slate-50 hover:bg-slate-100/80 text-slate-700 border border-slate-100"
                      }`}
                    >
                      <span>{day}</span>
                      {hasEvents && !isSelected && (
                        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day events scheduler */}
            <div className="md:col-span-5 space-y-4 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-6 md:pt-0">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800">Events for May {selectedDay}, 2026</h4>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-3">
                {calendarEvents[selectedDay] ? (
                  calendarEvents[selectedDay].map((evt, i) => (
                    <div
                      key={i}
                      className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          evt.type === "arrival" ? "bg-amber-400" :
                          evt.type === "audit" ? "bg-blue-500" : "bg-pink-500"
                        }`} />
                        <span className="text-[9px] uppercase font-black text-slate-400 font-mono tracking-wider">
                          {evt.type} Schedule
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-snug">
                        {evt.title}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400 leading-normal border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                    No system appointments or audit delivery triggers registered on this day.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: MERCHANT INVOICE GENERATOR */}
        {activeExtraTab === "invoice" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Official Merchant Invoice</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                  Calculated against dynamic header specifications
                </span>
              </div>

              <div className="flex gap-2.5">
                <select
 id="selectedpono_206" name="selectedpono" aria-label="selectedpono"                  value={selectedPoNo}
                  onChange={(e) => setSelectedPoNo(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 text-xs font-bold font-mono outline-none"
                >
                  <option value="PO-183/26">Default Mock PO</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.po_no} value={po.po_no}>
                      {po.po_no} ({po.broker})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Invoice</span>
                </button>
              </div>
            </div>

            {/* Custom Invoice Layout sheet */}
            <div className="p-8 border border-slate-200/60 rounded-2xl bg-slate-50/50 space-y-6 max-w-2xl mx-auto " id="invoice-sheet">
              {/* Sheet header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-800 italic uppercase tracking-wider">JUTE MILLS ASSOCIATION Ltd</h4>
                  <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-widest">Enterprise PO-Auto Billing Platform</span>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-snug">
                    Netaji Subhash Road, Primary Exchange Hub Unit-1, Kolkata Exchange Registry, WB.
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="px-2.5 py-0.5 bg-pink-100 text-pink-800 text-[9px] font-black uppercase tracking-widest rounded">
                    APPROVED RECEIPT
                  </span>
                  <div className="text-xs font-black text-slate-700 font-mono mt-1.5">{activePo.po_no}</div>
                  <div className="text-[10px] text-slate-400 font-bold block">{activePo.po_date}</div>
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Addresses columns */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Billing Supplier</span>
                  <span className="font-extrabold text-slate-800 uppercase block">{activePo.supplier}</span>
                  <span className="text-slate-400 text-[10px] uppercase block">Regional Area: {activePo.area}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Coordinating Broker</span>
                  <span className="font-extrabold text-indigo-950 uppercase block">{activePo.broker}</span>
                  <span className="text-slate-400 text-[10px] uppercase block">Broker ID: {activePo.po_type || "Direct"}</span>
                </div>
              </div>

              {/* Pricing Math Grid block */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-250 text-slate-600 font-black uppercase text-[9px]">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right">Volume (Bales)</th>
                      <th className="p-2.5 text-right">Pricing (INR/m.T)</th>
                      <th className="p-2.5 text-right">Subtotal Gross</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="font-mono">
                      <td className="p-2.5">Raw Jute Fiber - Standard grade bales loom selection</td>
                      <td className="p-2.5 text-right tabular-nums">{totalBales}</td>
                      <td className="p-2.5 text-right tabular-nums">₹{(itemRate * 10).toLocaleString()}</td>
                      <td className="p-2.5 text-right tabular-nums">₹{grossAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mathematical totals block */}
              <div className="flex justify-end text-xs font-bold">
                <div className="w-64 space-y-1.5 border-t border-slate-200 pt-3">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross conversion:</span>
                    <span className="font-mono text-slate-700">₹{grossAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Logistics Clearing (3%):</span>
                    <span className="font-mono text-slate-700">₹{logisticsFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IGST Jute Tax (12%):</span>
                    <span className="font-mono text-slate-700">₹{taxSurcharge.toLocaleString()}</span>
                  </div>
                  <hr className="border-slate-150" />
                  <div className="flex justify-between text-sm font-extrabold text-[#1a237e]">
                    <span>Invoice Total:</span>
                    <span className="font-mono">₹{invoiceTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUBTAB 3: GOOGLE MAPS & REGIONAL VECTOR MAPS */}
        {activeExtraTab === "maps" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Google Maps Mock Interface card */}
              <div className="border border-slate-100 rounded-2xl p-5 shadow-xs bg-slate-50/10 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Mill Coordination Google Maps</h4>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Active Geocoded Locations</span>
                  </div>
                  <MapPin className="h-4.5 w-4.5 text-pink-600 animate-bounce" />
                </div>

                {/* Google map simulation container */}
                <div className="h-60 w-full rounded-2xl bg-[#cad3c8] relative overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                  {/* Mock map layout styling elements */}
                  <div className="absolute inset-x-0 h-4 bg-slate-100 rotate-12 opacity-80" />
                  <div className="absolute inset-y-0 w-4 bg-slate-100 -rotate-45 opacity-80" />
                  <div className="absolute left-1/3 top-1/2 w-4 h-4 rounded-full bg-indigo-500/20 border-2 border-indigo-400 animate-ping" />
                  
                  {/* Pin 1: Kolkata head registry office */}
                  <div className="absolute left-1/3 top-1/2 group/pin cursor-pointer">
                    <MapPin className="h-6 w-6 text-pink-600 drop-shadow" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] font-black uppercase p-2-rounded shadow-md pointer-events-none opacity-0 group-hover/pin:opacity-100 duration-150 whitespace-nowrap z-50">
                      Bengal Headquarters
                    </div>
                  </div>

                  {/* Pin 2: Bihar Boring Road Warehouse */}
                  <div className="absolute right-1/4 top-1/3 group/pin2 cursor-pointer">
                    <MapPin className="h-6 w-6 text-indigo-700 drop-shadow" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] font-black uppercase p-2-rounded shadow-md pointer-events-none opacity-0 group-hover/pin2:opacity-100 duration-150 whitespace-nowrap z-50">
                      Bihar Facility No. 4
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm p-2 rounded-lg border border-slate-100 shadow-lg text-[9px] font-black uppercase tracking-wider space-y-1">
                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block"/> Bengal Hub</div>
                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block"/> Bihar Depot</div>
                  </div>
                </div>
              </div>

              {/* Path Jute Yield Vector Map */}
              <div className="border border-slate-100 rounded-2xl p-5 shadow-xs bg-slate-50/10 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Regional Jute Yield Vector Map</h4>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Hover states query custom vector paths</span>
                </div>

                <div className="h-60 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-4 relative">
                  {/* Stylized vector SVG indicating regional production nodes */}
                  <svg viewBox="0 0 120 100" className="w-full h-full max-h-[180px]">
                    <g stroke="#94a3b8" strokeWidth="0.5">
                      {/* Path WB */}
                      <path d="M 50,45 L 65,30 L 80,45 L 85,75 L 75,90 L 60,65 Z" 
                            className={`transition-colors cursor-pointer ${hoveredRegion === "WB" ? "fill-emerald-400" : "fill-emerald-200"}`}
                            onMouseEnter={() => setHoveredRegion("WB")}
                            onMouseLeave={() => setHoveredRegion(null)} />
                      {/* Path BH */}
                      <path d="M 20,25 L 50,25 L 50,45 L 35,55 L 15,35 Z" 
                            className={`transition-colors cursor-pointer ${hoveredRegion === "BH" ? "fill-emerald-300" : "fill-emerald-100"}`}
                            onMouseEnter={() => setHoveredRegion("BH")}
                            onMouseLeave={() => setHoveredRegion(null)} />
                      {/* Path AS */}
                      <path d="M 80,45 L 95,30 L 115,40 L 100,60 L 85,75 Z" 
                            className={`transition-colors cursor-pointer ${hoveredRegion === "AS" ? "fill-indigo-300" : "fill-indigo-150"}`}
                            onMouseEnter={() => setHoveredRegion("AS")}
                            onMouseLeave={() => setHoveredRegion(null)} />
                    </g>
                  </svg>

                  {/* Dynamic Hover output */}
                  {hoveredRegion && (
                    <div className="absolute top-4 left-4 bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl max-w-xs animate-in fade-in duration-150">
                      {vectorsMap.find((v) => v.id === hoveredRegion)?.name && (
                        <>
                          <span className="text-[9px] uppercase font-black text-slate-400">Yield region</span>
                          <h5 className="text-xs font-bold text-white uppercase mt-0.5">{vectorsMap.find((v) => v.id === hoveredRegion)?.name}</h5>
                          <span className="text-[10px] font-mono text-emerald-400 font-extrabold block mt-1">Yield Output: {vectorsMap.find((v) => v.id === hoveredRegion)?.yield}</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 text-[8.5px] font-bold uppercase text-slate-400">
                    ● Click or Hover over regions to test vector paths
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUBTAB 4: DYNAMIC PIPELINE TIMELINE STEPPER */}
        {activeExtraTab === "timeline" && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800">PO Pipeline Verification Stepper</h3>
              <p className="text-xs text-slate-400 leading-normal mt-0.5">
                Tracks standard legal phases of jute contract lifecycles
              </p>
            </div>

            {/* Vertically stacked stepper tracker */}
            <div className="space-y-6 relative pl-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              
              {/* Step 1 */}
              <div className="relative">
                <span className="absolute -left-8 w-6.5 h-6.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm">
                  ✓
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-slate-700 uppercase">Phase 1: Sauda Order booked</h5>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase rounded">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Formal pricing and total quantity metrics structured against broker agreements.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <span className="absolute -left-8 w-6.5 h-6.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm">
                  ✓
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-slate-700 uppercase">Phase 2: Purchase Order Validated</h5>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase rounded">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Bale target loads and logistics multipliers geolocated on administrative ledger.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <span className="absolute -left-8 w-6.5 h-6.5 rounded-full bg-pink-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm animate-pulse">
                  3
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-slate-700 uppercase">Phase 3: Material Received (AMAD)</h5>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-black uppercase rounded">
                      In Progress
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Lorries arrive at Boring Road depot warehouse. Real-time scales record bale net weights.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative">
                <span className="absolute -left-8 w-6.5 h-6.5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-black text-[10px] shadow-none">
                  4
                </span>
                <div className="space-y-1 opacity-50">
                  <h5 className="text-xs font-black text-slate-700 uppercase">Phase 4: Inspection Quality Audit</h5>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Senior staff audits moisture levels, grade indices and locks final disbursement approval.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUBTAB 5: STATUS SPLASH & DUMMY ERROR LAYOUTS OVERLAYS */}
        {activeExtraTab === "status_screens" && (
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 text-center mb-4">Aesthetic Overlay Screens templates</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Splash Login Screen Mock representation */}
              <div className="border border-slate-200 p-6 rounded-2xl bg-white space-y-4 shadow-sm">
                <div className="h-4 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"/> <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mock Splash Screen preview</span></div>
                
                <div className="p-8 bg-slate-900 text-white rounded-xl text-center space-y-4 ">
                  <div className="space-y-1">
                    <h5 className="text-lg font-black italic tracking-tight text-white uppercase">Mill Console Vault</h5>
                    <span className="text-[7px] tracking-widest uppercase font-black text-slate-400">Station-ID: PO-AUTO-G01</span>
                  </div>
                  <div className="space-y-2 max-w-[180px] mx-auto">
                    <div className="p-1 px-3 bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 uppercase tracking-wider">••••• Secured</div>
                    <button className="w-full py-1.5 bg-pink-600 text-[8px] font-black uppercase tracking-widest rounded-lg">Authenticate</button>
                  </div>
                </div>
              </div>

              {/* 404 Error Screen representation */}
              <div className="border border-slate-200 p-6 rounded-2xl bg-white space-y-4 shadow-sm">
                <div className="h-4 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1a237e] inline-block"/> <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mock Error Screen preview</span></div>
                
                <div className="p-8 bg-[#f5f7fb] text-slate-800 rounded-xl text-center space-y-3  border border-slate-100">
                  <div className="text-3xl font-black text-[#1a237e] font-mono leading-none">404</div>
                  <div>
                    <h5 className="text-xs font-black uppercase text-slate-700">Audit Directory Out of Scope</h5>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">The required allowed modules register was not found.</p>
                  </div>
                  <button className="px-4 py-1.5 bg-[#1a237e] text-white text-[8px] font-black uppercase tracking-widest rounded-lg mx-auto">
                    Return to Hub
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
