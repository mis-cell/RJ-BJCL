import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Lock, Info, Check, X, AlertTriangle } from "lucide-react";

interface SystemNoticeModalProps {
  message: string;
  onClose: () => void;
  title?: string;
  actionRequiredText?: string;
  statusText?: string;
}

export const SystemNoticeModal: React.FC<SystemNoticeModalProps> = ({
  message,
  onClose,
  title = "SYSTEM NOTICE",
  actionRequiredText = "ACTION REQUIRED",
}) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-auto max-w-md min-w-[280px] bg-[#faf8f3] rounded-xl shadow-xl border-2 border-amber-400/80 overflow-hidden relative font-sans text-slate-800"
        >
          {/* Top Header Bar */}
          <div className="bg-gradient-to-r from-[#750718] via-[#4a0d25] to-[#1e0b3a] text-white px-3.5 py-2 flex justify-between items-center border-b border-amber-400/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                <span className="text-white font-black text-xs leading-none">!</span>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white">
                  {title}
                </h3>
                {actionRequiredText && (
                  <span className="text-amber-300 text-[9px] font-bold tracking-wider uppercase opacity-90 hidden sm:inline">
                    // {actionRequiredText}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md border border-white/20 bg-white/10 hover:bg-white/25 text-white/90 flex items-center justify-center transition-all cursor-pointer ml-3"
              title="Close"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Main Body */}
          <div className="p-4 sm:p-5 bg-[#f8f6f0] flex flex-col items-center text-center">
            {/* Notice Message Payload */}
            <p className="text-slate-800 font-semibold text-xs sm:text-sm leading-relaxed my-1 px-1">
              {message}
            </p>

            {/* Action Footer Buttons */}
            <div className="w-full pt-3 mt-3 border-t border-amber-200/80 flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-[#750718] via-[#4a0d25] to-[#1e0b3a] hover:from-[#88081c] hover:to-[#280d4c] text-white font-bold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer border border-amber-400/40"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>OK / Close</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
