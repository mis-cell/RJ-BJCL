import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2 } from "lucide-react";

interface SettlementSuccessModalProps {
  show: boolean;
  selectedPoNo?: string;
}

export const SettlementSuccessModal: React.FC<SettlementSuccessModalProps> = ({
  show,
  selectedPoNo,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-[#FDE7E6] border-3 border-emerald-600 shadow-[8px_8px_0_0_rgba(16,185,129,0.3)] p-6 max-w-md w-full text-center space-y-4"
          >
            <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-sans">
              📊 Synchronization Success 📊
            </h3>
            <div className="space-y-1.5 p-3.5 bg-emerald-50 border border-emerald-400 rounded-sm">
              <p className="text-xs text-slate-800 font-black">
                M.R. Settlement Sync Completed!
              </p>
              <p className="text-[10px] text-slate-600 leading-relaxed font-sans font-medium">
                The pending received quantities against{" "}
                <strong>PO #{selectedPoNo || "N/A"}</strong> have been recalculated &amp; updated on the main database.
              </p>
            </div>
            <div className="flex justify-center flex-col items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold text-emerald-700 animate-pulse uppercase">
                Inventory Stocks verified &amp; updated
              </span>
              <div className="h-1.5 w-32 bg-emerald-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.2, ease: "easeInOut" }}
                  className="h-full bg-emerald-600"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettlementSuccessModal;
