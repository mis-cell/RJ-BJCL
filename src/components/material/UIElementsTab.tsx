import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Check,
  AlertCircle,
  X,
  Info,
  Clock,
  Sparkles,
  CloudSun,
  Lock,
  Compass,
  Cpu,
  Bookmark,
  Share2,
} from "lucide-react";

export default function UIElementsTab() {
  const [activeSubTab, setActiveSubTab] = useState<
    "badge" | "carousel" | "cards" | "modal" | "notifications" | "interactive_group"
  >("badge");

  // Carousel Slides
  const carouselSlides = [
    {
      title: "Jute Fiber Softening & Batching",
      desc: "Raw jute reed stalks processed with special softening agents prior to drawing stages.",
      image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?q=80&w=600&auto=format&fit=crop",
    },
    {
      title: "High-Speed Carding & Drawing",
      desc: "Streamlining loose fibers into structured sliver ribbons for consistency and grade alignment.",
      image: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?q=80&w=600&auto=format&fit=crop",
    },
    {
      title: "Precision Weaving & Sacking Loom",
      desc: "Robust high-speed looms weaving robust canvas packing and heavy-duty Jute Bales.",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop",
    },
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  // Modal active state
  const [showModal, setShowModal] = useState(false);

  // Live stack notifications/toasts state
  const [toasts, setToasts] = useState<{ id: string; type: string; text: string }[]>([]);

  const throwToast = (type: string, text: string) => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6 relative">
      {/* Top Selector Category Header */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-2xl overflow-x-auto scrollbar-none">
        {(
          [
            { id: "badge", label: "Badges & Progress" },
            { id: "carousel", label: "Carousel" },
            { id: "cards", label: "Cards & Widgets" },
            { id: "modal", label: "Modal Overlay" },
            { id: "notifications", label: "Live Notifications" },
            { id: "interactive_group", label: "Tabs & Tooltips" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 text-xs font-black uppercase whitespace-nowrap transition-all rounded-lg shrink-0 ${
              activeSubTab === tab.id
                ? "bg-white text-pink-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-6">
        
        {/* SECTION: Badges & Progress Indicators */}
        {activeSubTab === "badge" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Aesthetic System Badges</h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-pink-50 text-pink-700 text-[10px] font-black uppercase border border-pink-200 rounded-full tracking-wider">
                  Primary Theme
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200 rounded-full tracking-wider">
                  Info Hub
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200 rounded-full tracking-wider flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Live Stream
                </span>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-black uppercase border border-purple-200 rounded-full tracking-wider">
                  Secondary Accent
                </span>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase border border-amber-200 rounded-full tracking-wider">
                  Pending Audit
                </span>
                <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase border border-rose-300 rounded-full tracking-wider">
                  Critical Error
                </span>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Glow & Solid Varieties</h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-2.5 py-0.5 bg-pink-600 text-white text-[9px] font-black rounded uppercase tracking-widest">
                  NEW BATCH
                </span>
                <span className="px-2.5 py-0.5 bg-indigo-900 text-white text-[9px] font-black rounded uppercase tracking-widest">
                  ADMIN OVERRIDE
                </span>
                <span className="px-2.5 py-0.5 bg-slate-800 text-white text-[9px] font-black rounded uppercase tracking-widest">
                  ARCHIVED
                </span>
                <span className="px-2.5 py-0.5 bg-cyan-600 text-white text-[9px] font-black rounded uppercase tracking-widest">
                  ONLINE STATS
                </span>
                <span className="px-3 py-1 bg-emerald-950/20 text-emerald-300 text-[10px] font-bold uppercase rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Supabase Secure
                </span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Pagination & Infinite Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Interactive Pagination</h3>
                <div className="flex items-center gap-1.5">
                  <button className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-lg flex items-center justify-center transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {[1, 2, 3, 4, 15].map((page, idx) => (
                    <React.Fragment key={idx}>
                      {page === 15 && <span className="text-slate-400 px-1 text-xs font-black">...</span>}
                      <button
                        className={`h-8 w-8 text-xs font-black rounded-lg flex items-center justify-center transition-all ${
                          page === 2
                            ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                  <button className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-lg flex items-center justify-center transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Continuous Progress Loaders</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Drying Loom speed</span>
                      <span>85%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all duration-1000" style={{ width: "85%" }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    <div className="w-5 h-5 border-2 border-t-pink-500 border-r-pink-500 border-b-slate-100 border-l-slate-100 rounded-full animate-spin" />
                    <span>Background Indexer Thread Spinning...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Carousel Slide Display Banner */}
        {activeSubTab === "carousel" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Tactile Jute Milling Carousel</h3>
              <span className="text-xs font-black text-pink-600 tabular-nums">
                0{currentSlide + 1} / 0{carouselSlides.length}
              </span>
            </div>

            <div className="relative aspect-video md:h-80 w-full overflow-hidden rounded-xl border border-slate-100 shadow-inner flex items-end">
              <img
                src={carouselSlides[currentSlide].image}
                referrerPolicy="no-referrer"
                alt="Mill slide"
                className="absolute inset-0 object-cover w-full h-full brightness-50 hover:scale-105 transition-transform duration-[4000ms]"
              />
              <div className="relative w-full p-6 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <span className="px-2 py-0.5 bg-pink-500 text-[8px] font-black tracking-widest uppercase rounded">
                  MILL PROCESS
                </span>
                <h4 className="text-lg md:text-xl font-bold tracking-tight mt-1.5">
                  {carouselSlides[currentSlide].title}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  {carouselSlides[currentSlide].desc}
                </p>
              </div>

              {/* Slider Dots indicators */}
              <div className="absolute right-6 top-6 flex gap-1.5 z-10 bg-black/40 backdrop-blur-md p-1.5 rounded-full">
                {carouselSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentSlide ? "bg-pink-500 px-3" : "bg-white/40 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <p className="text-[10px] font-semibold text-slate-400">
                Uses standard layout rendering for offline visual speed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev === 0 ? carouselSlides.length - 1 : prev - 1))
                  }
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg Transition flex items-center justify-center shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev === carouselSlides.length - 1 ? 0 : prev + 1))
                  }
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg Transition flex items-center justify-center shadow-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Cards & Custom Widgets */}
        {activeSubTab === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Media Jute Mill Card */}
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm flex flex-col bg-slate-50/20">
              <div className="h-40 bg-slate-200 relative">
                <img
                  src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=400&auto=format&fit=crop"
                  referrerPolicy="no-referrer"
                  alt="Mill facility"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 bg-indigo-900/80 backdrop-blur-md px-2 py-0.5 text-[8px] font-black uppercase text-white tracking-wider rounded">
                  Bihar Mill No. 4
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Boring Road Warehousing</h4>
                  <p className="text-xs text-slate-400 mt-1 lines-clamp-2">
                    Primary transit hub storing over 40,000 metric tons of Type Grade A quality jute weave.
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs font-black border-t border-slate-100 pt-3">
                  <span className="text-pink-600">INSPECT STOCK</span>
                  <Compass className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Card 2: Social Media Profile Card (Robert Cotton Mock) */}
            <div className="border border-slate-100 rounded-xl p-5 shadow-sm bg-white flex flex-col text-center items-center justify-between">
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-pink-100 border-2 border-pink-500 overflow-hidden flex items-center justify-center">
                    <img
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=120&auto=format&fit=crop"
                      referrerPolicy="no-referrer"
                      alt="Robert Cotton"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">Robert Cotton</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">
                    Lead Mill Auditor
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full py-3 my-2 border-y border-slate-50 text-center">
                <div>
                  <span className="text-xs font-black text-slate-700 block">512</span>
                  <span className="text-[8px] text-slate-400 uppercase font-black">Audits</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 block">1.8k</span>
                  <span className="text-[8px] text-slate-400 uppercase font-black">PO Signs</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 block">98%</span>
                  <span className="text-[8px] text-slate-400 uppercase font-black">Quality</span>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <button className="flex-1 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-xs">
                  CONNECT
                </button>
                <button className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Card 3: Dynamic Weather Forecast Widget */}
            <div className="border border-slate-100 rounded-xl p-5 shadow-sm bg-gradient-to-b from-[#1a237e] to-[#283593] text-white flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-300">Mill Location Weather</span>
                  <h4 className="text-base font-bold mt-0.5">Kolkata, Bengal</h4>
                </div>
                <CloudSun className="h-7 w-7 text-amber-300 animate-pulse" />
              </div>

              <div className="my-4 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tighter">36°C</span>
                <span className="text-xs text-slate-300">Humidity: 84%</span>
              </div>

              <div className="space-y-2 text-[10px] font-extrabold uppercase border-t border-white/15 pt-3 text-slate-300">
                <div className="flex justify-between">
                  <span>Jute Drying Index</span>
                  <span className="text-emerald-400">Excellent (Risk 0)</span>
                </div>
                <div className="flex justify-between">
                  <span>Tomorrow Forecast</span>
                  <span>34°C - Rain Shower</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* SECTION: Modal Overlay Floating View */}
        {activeSubTab === "modal" && (
          <div className="p-10 text-center space-y-4 max-w-xl mx-auto border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
            <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Interactive Floating Modal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Launches a premium modern overlay dialog styled purely with Tailwind utilities. Perfect for details review.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-pink-500/10 active:scale-95"
            >
              LAUNCH MODAL DEMO
            </button>
          </div>
        )}

        {/* SECTION: Live Stack Toast Notifications */}
        {activeSubTab === "notifications" && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Trigger Floating System Alerts</h3>
              <p className="text-xs text-slate-500 mb-4">
                Toasts spawn modular dialogs stacked live at the top-right which auto-slide away. Click below to experience:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => throwToast("success", "Active Purchase Order has been validated by Robert Cotton.")}
                className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase border border-emerald-300 rounded-xl tracking-wider transition-all"
              >
                ● Success Alert
              </button>
              <button
                onClick={() => throwToast("error", "Database validation failure. Verify allowed_modules list configuration.")}
                className="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-[10px] uppercase border border-rose-300 rounded-xl tracking-wider transition-all"
              >
                ● Danger Alert
              </button>
              <button
                onClick={() => throwToast("info", "Financial system backup queued on station ID: PO-AUTO-G01.")}
                className="py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase border border-blue-300 rounded-xl tracking-wider transition-all"
              >
                ● Info Alert
              </button>
            </div>
          </div>
        )}

        {/* SECTION: Tooltips, Tabs, Interactive Navbar Previews */}
        {activeSubTab === "interactive_group" && (
          <div className="space-y-8">
            {/* Tooltips Display */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Sleek Hover Tooltips</h3>
              <div className="flex flex-wrap gap-8 items-center bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                <div className="relative group/tooltip">
                  <button className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-lg uppercase">
                    Hover For Mill ID
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 border border-slate-700 rounded-lg text-[9px] font-black text-white uppercase tracking-widest shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-50">
                    ID: PORT-JUTE-B07
                  </div>
                </div>

                <div className="relative group/tooltip2">
                  <span className="text-slate-500 font-black uppercase text-[10px] underline decoration-slate-300 cursor-help flex items-center gap-1">
                    What is S.O?
                    <Info className="h-3.5 w-3.5" />
                  </span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-300 shadow-xl opacity-0 pointer-events-none group-hover/tooltip2:opacity-100 transition-opacity max-w-[200px] z-50 leading-relaxed">
                    <span className="font-bold text-white uppercase block mb-1">Sauda Order</span>
                    A formal commercial booking outlining pricing and delivery metrics.
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Navbar Preview Header Panels */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Responsive System Navbars</h3>
              <div className="space-y-4">
                {/* Light Navbar */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center text-white font-black text-xs">
                      P
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800">
                      Material Admin
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span className="text-[10px] text-pink-600">Home</span>
                    <span className="hover:text-slate-800 cursor-pointer">Security</span>
                    <span className="hover:text-slate-800 cursor-pointer">Support</span>
                  </div>
                  <button className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg">
                    <Bell className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating actual system Modal Backdrop overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-pink-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-extrabold uppercase tracking-widest">
                  System Diagnostics Override
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="hover:scale-110 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
                  <Cpu className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Allowed Module Credentials</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This administrative overlay validates the permitted screens on user accounts. Make adjustments manually via the table manager.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                  <span>Server Connection</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    SECURE 256B
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-700 bg-white p-2 border border-slate-100 rounded">
                  PORT: 3000 / HOST: 0.0.0.0
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-[10px] uppercase rounded-lg hover:bg-slate-300 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  throwToast("success", "Credentials override locked successfully.");
                }}
                className="px-4 py-2 bg-pink-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
              >
                Accept Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CORNER TOAST ALERT FEEDBACK STACK */}
      <div className="fixed bottom-14 right-6 space-y-2.5 z-[250] pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-100 rounded-xl shadow-xl p-4 flex items-start gap-3.5 animate-in slide-in-from-right-10 duration-300"
          >
            {toast.type === "success" && (
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="h-4.5 w-4.5" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4.5 w-4.5" />
              </div>
            )}
            {toast.type === "info" && (
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Info className="h-4.5 w-4.5" />
              </div>
            )}

            <div className="flex-1 space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {toast.type === "success" && "System Done"}
                  {toast.type === "error" && "Alarm Warning"}
                  {toast.type === "info" && "Broadcast Info"}
                </span>
                <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {toast.text}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
