import React, { useState } from "react";
import bjlAsset from "../../assets/asset_bjl.png";

const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);

const CLOUDINARY_BG_URL = "https://res.cloudinary.com/x6tw39wi/image/upload/v1785928946/icon_vffvx9.png";

interface AuthScreenProps {
  onLogin: (year: string, user: string, pass: string) => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [year, setYear] = useState("2026-2027");
  const [username, setUsername] = useState("ADMIN");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bgSrc, setBgSrc] = useState(CLOUDINARY_BG_URL);

  return (
    <div className="min-h-screen w-screen bg-[#e2dac8] flex items-center justify-center p-2 sm:p-4 font-sans select-none overflow-hidden">
      {/* Centered Master Card Container - Enforces strict Landscape aspect ratio (1462/962) */}
      
      {/* ================= DESKTOP LOGIN ================= */}
      {isMobile === false && (
        <div className="relative w-full max-w-[1360px] aspect-[1462/962] max-h-[92vh] bg-[#f5f5f5] rounded-[20px] sm:rounded-[30px] lg:rounded-[36px] border border-[#c5ba9e] shadow-[0_25px_60px_rgba(0,0,0,0.22)] overflow-hidden my-auto transition-all">

          {/* Desktop Background Image */}
          <img
            src={bgSrc}
            alt="Bally Jute Company Limited Background"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
            onError={() => {
              if (bgSrc === CLOUDINARY_BG_URL) {
                setBgSrc(bjlAsset);
              }
            }}
          />

          {/* Desktop Login Container */}
          <div className="absolute top-[33.5%] left-[73.2%] -translate-x-1/2 z-10 w-[88%] max-w-[330px] sm:max-w-[360px] lg:max-w-[385px]">

            <div className="w-full bg-white/95 backdrop-blur-md p-4 sm:p-5 lg:p-6 rounded-[18px] sm:rounded-[20px] shadow-xl border border-[#CBD5E1] transition-all">

              <div className="text-center mb-3">
                <h2 className="text-lg sm:text-xl font-bold text-[#171717] tracking-tight">
                  Bally Jute Company Limited Login
                </h2>

                <p className="text-[10px] sm:text-[11px] text-[#404040] font-semibold mt-0.5">
                  RAW JUTE PURCHASE DESK
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onLogin(year, username, password);
                }}
                className="space-y-2.5 sm:space-y-3"
              >

                {/* Financial Session */}
                <div>
                  <label
                    htmlFor="financial_session_374"
                    className="text-[9px] sm:text-[10px] font-bold text-[#404040] uppercase tracking-wider block mb-1"
                  >
                    Financial Session
                  </label>

                  <select
                    id="financial_session_374"
                    name="financial_session"
                    aria-label="Financial Session"
                    className="w-full p-2.5 sm:p-3 rounded-[9px] sm:rounded-[10px] border border-[#CBD5E1] bg-white text-xs sm:text-sm font-semibold text-[#111111] outline-none focus:border-[#D94B5A] focus:ring-2 focus:ring-[#D94B5A]/20 transition-all appearance-none cursor-pointer"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="2026-2027">
                      Session 2026-2027 (Current)
                    </option>
                    <option value="2025-2026">
                      Session 2025-2026
                    </option>
                  </select>
                </div>

                {/* Username */}
                <div>
                  <label
                    htmlFor="username_389"
                    className="text-[9px] sm:text-[10px] font-bold text-[#404040] uppercase tracking-wider block mb-1"
                  >
                    Username
                  </label>

                  <input
                    id="username_389"
                    name="username"
                    aria-label="Username"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-[9px] sm:rounded-[10px] border border-[#CBD5E1] bg-white text-xs sm:text-sm font-medium text-[#111111] placeholder:text-[#64748B] outline-none focus:border-[#D94B5A] focus:ring-2 focus:ring-[#D94B5A]/20 transition-all"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">

                    <label
                      htmlFor="password_413"
                      className="text-[9px] sm:text-[10px] font-bold text-[#404040] uppercase tracking-wider block"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[9px] sm:text-[10px] text-[#D94B5A] font-semibold hover:underline cursor-pointer"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>

                  </div>

                  <input
                    id="password_413"
                    name="password"
                    aria-label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-[9px] sm:rounded-[10px] border border-[#CBD5E1] bg-white text-xs sm:text-sm font-medium text-[#111111] placeholder:text-[#64748B] outline-none focus:border-[#D94B5A] focus:ring-2 focus:ring-[#D94B5A]/20 transition-all"
                    required
                  />
                </div>

                {/* Forgot Password */}
                <div className="flex justify-end pt-0.5">
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Please contact the System Administrator (L5) to reset your operator credentials.");
                    }}
                    className="text-[10px] sm:text-[11px] text-[#404040] hover:text-[#D94B5A] font-medium transition-colors"
                  >
                    Forgot Password?
                  </a>
                </div>

                {/* Login */}
                <button
                  type="submit"
                  className="w-full p-3 sm:p-3.5 mt-1 rounded-[9px] sm:rounded-[10px] bg-[#D94B5A] hover:bg-[#E85A5A] text-white font-bold text-xs sm:text-sm tracking-wide border-none cursor-pointer transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  Login
                </button>

              </form>
            </div>
          </div>
        </div>
      )}


      {/* ================= MOBILE LOGIN ================= */}
      {isMobile === true && (
        <div className="min-h-screen w-full bg-[#f5f5f5] flex items-center justify-center px-5 py-8">

          {/* Mobile Login Card */}
          <div className="w-full max-w-[420px] bg-[#f0e9e0] p-5 rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-[#d6caa8]">

            {/* Header */}
            <div className="text-center mb-6">

              <h2 className="text-2xl font-bold text-[#F7AFA8] tracking-tight">
                Bally Jute Company Limited Login
              </h2>

              <p className="text-xs text-[#5A6855] font-medium mt-1">
                Enter your operational credentials
              </p>

            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onLogin(year, username, password);
              }}
              className="space-y-4"
            >

              {/* Financial Session */}
              <div>
                <label
                  htmlFor="mobile_financial_session"
                  className="text-[11px] font-bold text-[#5A6855] uppercase tracking-wider block mb-1.5"
                >
                  Financial Session
                </label>

                <select
                  id="mobile_financial_session"
                  name="financial_session"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full h-12 px-3 rounded-[10px] border border-[#ccc] bg-white text-sm font-semibold text-slate-800 outline-none focus:border-[#2e5b25] focus:ring-2 focus:ring-[#2e5b25]/20 appearance-none"
                >
                  <option value="2026-2027">
                    Session 2026-2027 (Current)
                  </option>

                  <option value="2025-2026">
                    Session 2025-2026
                  </option>
                </select>
              </div>


              {/* Username */}
              <div>
                <label
                  htmlFor="mobile_username"
                  className="text-[11px] font-bold text-[#5A6855] uppercase tracking-wider block mb-1.5"
                >
                  Username
                </label>

                <input
                  id="mobile_username"
                  name="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 px-3 rounded-[10px] border border-[#ccc] bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#2e5b25] focus:ring-2 focus:ring-[#2e5b25]/20"
                  required
                />
              </div>


              {/* Password */}
              <div>

                <div className="flex justify-between items-center mb-1.5">

                  <label
                    htmlFor="mobile_password"
                    className="text-[11px] font-bold text-[#5A6855] uppercase tracking-wider"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-[#2e5b25] font-semibold"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>

                </div>

                <input
                  id="mobile_password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-3 rounded-[10px] border border-[#ccc] bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#2e5b25] focus:ring-2 focus:ring-[#2e5b25]/20"
                  required
                />

              </div>


              {/* Forgot Password */}
              <div className="flex justify-end">

                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(
                      "Please contact the Bally Jute IT administrator to reset your account password or verify permissions."
                    );
                  }}
                  className="text-xs text-[#5D6B58] font-medium"
                >
                  Forgot Password?
                </a>

              </div>


              {/* Login Button */}
              <button
                type="submit"
                className="w-full h-12 rounded-[10px] bg-[#2e5b25] hover:bg-[#23471c] text-white font-bold text-sm tracking-wide shadow-md active:scale-[0.99] transition-all"
              >
                Login
              </button>

            </form>

          </div>
        </div>
      )}

      
    </div>
  );
}
