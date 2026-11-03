import React from "react";
import { ShieldCheck, ArrowLeft, Plus, RefreshCw } from "lucide-react";

export interface InspectionActionBarProps {
  viewMode: "dashboard" | "form";
  onBack: () => void;
  onOpenNewForm: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const InspectionActionBar: React.FC<InspectionActionBarProps> = ({
  viewMode,
  onBack,
  onOpenNewForm,
  onRefresh,
  loading,
}) => {
  return (
    <div className="bg-[#F7AFA8] border-b border-[#F06D6C] px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-800/40 border border-emerald-400/40 flex items-center justify-center text-amber-300 shadow-inner">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-white tracking-wide">
            {viewMode === "form" ? "Mill Inspection Information Entry" : "INSPECTION MODULE REGISTER"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {viewMode === "form" && (
          <div className="relative z-10 flex items-center gap-3">
            <button
              type="button"
              className="px-3.5 py-1.5 bg-[#D94B5A] hover:bg-[#D94B5A] text-amber-300 border border-[#F06D6C] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
              title="Back to Sauda Desk (Esc)"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 text-amber-300" />
              <span>Back</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
