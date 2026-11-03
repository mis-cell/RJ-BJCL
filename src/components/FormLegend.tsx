import React from 'react';
import { Sparkles, Asterisk, Edit3 } from 'lucide-react';

interface FormLegendProps {
  className?: string;
  showCalculated?: boolean;
}

export const FormLegend: React.FC<FormLegendProps> = ({
  className = "",
  showCalculated = true
}) => {
  return (
    <div className={`bg-[#FDE7E6]/70 border border-[#FBCFCB] rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs text-xs font-semibold ${className}`}>
      <div className="flex items-center gap-1.5 text-[#171717] font-bold">
        <span className="uppercase text-[10px] tracking-wider text-[#404040]">Field Color Guide:</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        {/* Auto Populated */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#EAF4FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E3A8A] shadow-2xs">
            <Sparkles className="w-2.5 h-2.5" />
          </span>
          <span className="text-[11px] text-[#1E3A8A] font-bold">
            Light Blue: <span className="font-semibold text-[#1E3A8A]">Auto-populated / System-filled</span>
          </span>
        </div>

        {/* Mandatory */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#FFECEC] border border-[#FCA5A5] flex items-center justify-center text-[#991B1B] font-black text-[10px] shadow-2xs">
            *
          </span>
          <span className="text-[11px] text-[#991B1B] font-bold">
            Light Red: <span className="font-semibold text-[#991B1B]">Mandatory / Required Field</span>
          </span>
        </div>

        {/* User Input */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#FFFFFF] border border-[#CBD5E1] flex items-center justify-center text-[#404040] shadow-2xs">
            <Edit3 className="w-2.5 h-2.5" />
          </span>
          <span className="text-[11px] text-[#111111] font-bold">
            White: <span className="font-semibold text-[#404040]">Normal Manual Input</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default FormLegend;

