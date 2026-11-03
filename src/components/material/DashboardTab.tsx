import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  ArrowRight,
  Database,
  Users,
  Box,
  Layers,
  ChevronRight,
  Monitor,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// Mock revenue breakdown dataset matching 1700 total (Group A=400, B=300, C=300, D=200)
const revenueData = [
  { name: "Group A", value: 400, color: "#ec407a" },
  { name: "Group B", value: 300, color: "#5c6bc0" },
  { name: "Group C", value: 300, color: "#26c6da" },
  { name: "Group D", value: 200, color: "#66bb6a" },
];

export default function DashboardTab({
  dbStats = { poCount: 118, saudaCount: 42, activeUsers: 5 },
}) {
  const [reportRange, setReportRange] = useState<"today" | "week" | "month" | "year">("month");
  
  // Real-time server metric updates
  const [serverLoad, setServerLoad] = useState([
    { name: "1", cpu: 58, temp: 37, disk: 55 },
    { name: "2", cpu: 62, temp: 38, disk: 56 },
    { name: "3", cpu: 55, temp: 36, disk: 54 },
    { name: "4", cpu: 60, temp: 37, disk: 57 },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setServerLoad((prev) => {
        const next = [...prev.slice(1)];
        const cpuRand = Math.floor(Math.random() * 20) + 50; // 50 to 70%
        const tempRand = Math.floor(Math.random() * 5) + 35; // 35 to 40 deg
        const diskRand = Math.floor(Math.random() * 4) + 54; // 54 to 58
        next.push({ name: String(Date.now()), cpu: cpuRand, temp: tempRand, disk: diskRand });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Daily line list curves data (Double wave representing mobile, tablet and desktop traffic)
  const lineChartData = [
    { name: "01", Tablet: 5000, Mobile: 3200, Desktop: 6800 },
    { name: "03", Tablet: 4200, Mobile: 2900, Desktop: 5900 },
    { name: "05", Tablet: 4800, Mobile: 4100, Desktop: 6300 },
    { name: "07", Tablet: 3900, Mobile: 3400, Desktop: 5100 },
    { name: "09", Tablet: 4500, Mobile: 3000, Desktop: 5800 },
    { name: "11", Tablet: 5200, Mobile: 3600, Desktop: 6600 },
    { name: "13", Tablet: 4900, Mobile: 3800, Desktop: 6100 },
    { name: "15", Tablet: 4100, Mobile: 3300, Desktop: 5500 },
    { name: "17", Tablet: 5800, Mobile: 4200, Desktop: 7100 },
    { name: "19", Tablet: 5500, Mobile: 3700, Desktop: 6400 },
    { name: "21", Tablet: 6900, Mobile: 4900, Desktop: 7800 },
    { name: "23", Tablet: 6100, Mobile: 4000, Desktop: 7000 },
    { name: "25", Tablet: 5700, Mobile: 3800, Desktop: 6900 },
    { name: "27", Tablet: 6400, Mobile: 4500, Desktop: 7300 },
    { name: "29", Tablet: 7200, Mobile: 5100, Desktop: 8200 },
  ];

  return (
    <div className="space-y-6">
      {/* Upper Dashboard Selector bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(["today", "week", "month", "year"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReportRange(r)}
                className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider transition-all rounded-md ${
                  reportRange === r
                    ? "bg-white text-pink-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {r === "today" && "Today"}
                {r === "week" && "This Week"}
                {r === "month" && "This Month"}
                {r === "year" && "This Year"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5 text-pink-500" />
            <span className="tabular-nums">26 May 2026, Tuesday</span>
          </div>
          <button className="bg-[#3f51b5] text-white font-bold uppercase tracking-wider text-[10px] px-4 py-2 rounded-lg shadow-md hover:bg-[#303f9f] transition-colors">
            LATEST REPORTS
          </button>
        </div>
      </div>

      {/* Grid of 4 Main Widgets matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Widget 1: Support Tracker */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Support Tracker</span>
              <div className="text-4xl font-extrabold text-slate-800 tracking-tight mt-1">543</div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Tickets</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 rounded">•••</button>
          </div>

          <div className="my-6 flex justify-center relative">
            {/* Doughnut ring using SVG for precise matching of screenshot circular gauge */}
            <svg className="w-28 h-28 transform -rotate-90">
              <circle cx="56" cy="56" r="46" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
              <circle
                cx="56"
                cy="56"
                r="46"
                stroke="#ec407a"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - 0.64)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-slate-800 tracking-tighter">64%</span>
              <span className="text-[7.5px] uppercase font-black text-slate-400">Completed</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
            <div>
              <div className="text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                45
              </div>
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-tight">New</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                147
              </div>
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-tight">Open</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block" />
                351
              </div>
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-tight">Closed</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Revenue Breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Revenue Breakdown</span>
              <div className="text-xs font-semibold text-slate-400 mt-1">Operational Gross Division</div>
            </div>
            <button className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 rounded">•••</button>
          </div>

          <div className="my-2 flex justify-center relative h-32">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-slate-800">1700</span>
              <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Total</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-4">
            {revenueData.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="font-semibold text-slate-500 text-[10px] uppercase">{r.name}</span>
                </div>
                <span className="font-black tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3: App Performance */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">App Performance</span>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight flex gap-2">
                <span className="text-amber-500">■ Integration</span> 
                <span className="text-pink-500">■ SDK</span>
              </p>
            </div>
            <button className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 rounded">•••</button>
          </div>

          <div className="space-y-6 my-auto pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide">Integration Progress</span>
                <span className="font-extrabold text-slate-800">76%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000" style={{ width: "76%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide">SDK Package Health</span>
                <span className="font-extrabold text-slate-800">42%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full transition-all duration-1000" style={{ width: "42%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide">API Response Speed</span>
                <span className="font-extrabold text-slate-800">91%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-1000" style={{ width: "91%" }} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-400 uppercase font-black tracking-widest mt-2">
            <span>Diagnose Net</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Widget 4: Server Overview with Sparklines */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Server Overview</span>
              <div className="text-xs font-semibold text-slate-400 mt-1">Real-time Container Nodes</div>
            </div>
            <button className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 rounded">•••</button>
          </div>

          {/* 3 rows of sparklines matching style exactly */}
          <div className="space-y-4 my-4">
            {/* CPU Sparkline Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="w-24">
                <span className="text-[10px] font-black italic text-slate-400 block uppercase">CPU / 37°C</span>
                <span className="text-xs font-bold text-slate-700">{serverLoad[serverLoad.length-1]?.cpu}% @ 3.3Ghz</span>
              </div>
              <div className="flex-1 h-8 rounded-md overflow-hidden bg-blue-50/20 border border-blue-100/30 p-0.5">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <LineChart data={serverLoad}>
                    <Line type="monotone" dataKey="cpu" stroke="#3f51b5" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TEMP Sparkline Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="w-24">
                <span className="text-[10px] font-black italic text-slate-400 block uppercase">TEMP / 31°C</span>
                <span className="text-xs font-bold text-slate-700">{serverLoad[serverLoad.length-1]?.temp}°C Safe</span>
              </div>
              <div className="flex-1 h-8 rounded-md overflow-hidden bg-pink-50/20 border border-pink-100/30 p-0.5">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <LineChart data={serverLoad}>
                    <Line type="monotone" dataKey="temp" stroke="#ec407a" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DISK Sparkline Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="w-24">
                <span className="text-[10px] font-black italic text-slate-400 block uppercase">DISK / 21°C</span>
                <span className="text-xs font-bold text-slate-700">{serverLoad[serverLoad.length-1]?.disk}% Volume</span>
              </div>
              <div className="flex-1 h-8 rounded-md overflow-hidden bg-amber-50/20 border border-amber-100/30 p-0.5">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <LineChart data={serverLoad}>
                    <Line type="monotone" dataKey="disk" stroke="#ff9800" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-2 border border-dashed border-emerald-300 bg-emerald-50 text-emerald-800 text-[9px] font-black uppercase tracking-wider text-center rounded-lg">
            ● ALL HOST SYSTEMS SECURE
          </div>
        </div>

      </div>

      {/* Massive Daily Line Chart matching the dual-wave curves at the bottom */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Daily Line Chart</h3>
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Tablet
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
                Mobile
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1976d2] inline-block" />
                Desktop
              </span>
            </div>
          </div>
          
          <select  id="select_363" name="select" aria-label="select"className="bg-slate-50 border border-slate-200 text-xs font-bold p-1.5 px-3 rounded-lg outline-none">
            <option>Monthly</option>
            <option>Weekly</option>
            <option>Daily</option>
          </select>
        </div>

        <div className="h-72 w-full pr-4 text-xs font-semibold ">
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
            <AreaChart data={lineChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTablet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffb74d" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#ffb74d" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorMobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec407a" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#ec407a" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorDesktop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1976d2" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#1976d2" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[2000, 9500]} />
              <Tooltip cursor={{ stroke: "#e2e8f0" }} />
              <Area type="monotone" dataKey="Tablet" stroke="#ffb74d" strokeWidth={3} fillOpacity={1} fill="url(#colorTablet)" />
              <Area type="monotone" dataKey="Mobile" stroke="#ec407a" strokeWidth={3} fillOpacity={1} fill="url(#colorMobile)" />
              <Area type="monotone" dataKey="Desktop" stroke="#1976d2" strokeWidth={3} fillOpacity={1} fill="url(#colorDesktop)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Dynamic Jute Database Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Restored PO Headers</span>
            <span className="text-xl font-bold text-slate-800 tabular-nums">{dbStats.poCount} POs</span>
          </div>
        </div>
        
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Active Mill Staff</span>
            <span className="text-xl font-bold text-slate-800">{dbStats.activeUsers} Operators</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Database Connected</span>
            <span className="text-xl font-bold text-slate-800">Production Live</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex items-center gap-4 hover:shadow-sm transition-all">
          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <TrendingUp className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Satta (Sauda bookings)</span>
            <span className="text-xl font-bold text-amber-700">{dbStats.saudaCount} Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
