import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Scale, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  trend?: string;
  color?: string;
  cardVariant?: 'standard' | 'procurement' | 'financial' | 'quality' | 'pending' | 'critical';
  onClick?: () => void;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'text-[#111111]',
  cardVariant = 'standard',
  onClick
}: StatCardProps) {
  const isInteractive = !!onClick;

  const bgClasses = {
    standard: "bg-white border-[#CBD5E1]",
    procurement: "bg-[#FDE7E6] border-[#FBCFCB]",
    financial: "bg-[#FFF2CC] border-[#FFE08A]",
    quality: "bg-white border-[#FBCFCB]",
    pending: "bg-[#FFFBEB] border-[#FFE08A]",
    critical: "bg-rose-50 border-rose-200"
  }[cardVariant];

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 shadow-2xs relative group rounded-xl border overflow-hidden flex flex-col justify-between min-h-[105px] transition-all",
        bgClasses,
        isInteractive ? "cursor-pointer hover:border-[#D94B5A] hover:shadow-xs active:scale-[0.98]" : ""
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110 text-[#D94B5A]">
        <Icon className="h-16 w-16" />
      </div>
      <div className="flex justify-between items-start mb-3 z-10">
         <div className="p-2 bg-white/80 border border-[#CBD5E1] rounded-lg shadow-2xs">
            <Icon className="h-5 w-5 text-[#D94B5A]" />
         </div>
         {trend && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs border",
              trend.includes('+') ? "text-[#166534] bg-[#DCFCE7] border-[#86EFAC]" :
              trend.includes('-') ? "text-[#991B1B] bg-rose-50 border-rose-200" : "text-[#92400E] bg-[#FFF2CC] border-[#FFE08A]"
            )}>
               {trend.includes('+') ? <ArrowUpRight className="h-3 w-3" /> : 
                trend.includes('-') ? <ArrowDownRight className="h-3 w-3" /> : <Scale className="h-3 w-3" />}
               {trend}
            </span>
         )}
      </div>
      <div className="space-y-1 z-10 mt-auto">
        <h3 className="text-[11px] uppercase font-bold text-[#404040] tracking-wider">
          {label}
        </h3>
        <div className={cn("text-2xl font-black tabular-nums tracking-tight text-[#111111]", color)}>
          {value}
        </div>
      </div>
      {isInteractive && (
         <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-4 w-4 text-[#D94B5A]" />
         </div>
      )}
    </div>
  );
}
