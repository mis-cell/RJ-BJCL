import React from 'react';
import {
  BarChart3,
  FileText,
  Truck,
  Droplets,
  Coins,
  Scale,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PoHistogramTabViewProps {
  po: any;
  dbArrivals: any[];
  dbInspections: any[];
  dbPayments: any[];
  dbSettlements: any[];
}

export const PoHistogramTabView: React.FC<PoHistogramTabViewProps> = ({
  po,
  dbArrivals,
  dbInspections,
  dbPayments,
  dbSettlements,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#FBCFCB] rounded-xl p-4 shadow-xs">
        <h3 className="text-sm font-serif font-black text-[#D94B5A] mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-700" />
          <span>Turnaround Days & Progress Timeline (Histogram)</span>
        </h3>

        {/* Horizontal Progress Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 py-4">
          {[
            {
              title: '1. Sauda Entry',
              date: po.po_date || po.created_at?.slice(0, 10),
              icon: FileText,
              status: 'complete',
              val: `${parseFloat(po.total_contract_mt || 0).toFixed(2)} MT`,
            },
            {
              title: '2. Temp Arrival',
              date: dbArrivals[0]?.date || dbArrivals[0]?.arrival_date || 'Pending',
              icon: Truck,
              status: dbArrivals.length > 0 ? 'complete' : 'pending',
              val: `${dbArrivals.reduce((s, a) => s + (parseFloat(a.final_weight_mt || a.received_weight_mt || 0) || 0), 0).toFixed(2)} MT`,
            },
            {
              title: '3. Mill Inspection',
              date: dbInspections[0]?.mr_date || dbInspections[0]?.created_at?.slice(0, 10) || 'Pending',
              icon: Droplets,
              status: dbInspections.length > 0 ? 'complete' : 'pending',
              val: `${dbInspections.length} MR(s)`,
            },
            {
              title: '4. Payment',
              date: dbPayments[0]?.payment_date || dbPayments[0]?.created_at?.slice(0, 10) || 'Pending',
              icon: Coins,
              status: dbPayments.length > 0 ? 'complete' : 'pending',
              val: `₹${dbPayments.reduce((s, p) => s + (parseFloat(p.amount_paid || p.payable_net_amount || 0) || 0), 0).toLocaleString()}`,
            },
            {
              title: '5. Settlement',
              date: dbSettlements[0]?.created_at?.slice(0, 10) || 'Pending',
              icon: Scale,
              status: dbSettlements.length > 0 ? 'complete' : 'pending',
              val: dbSettlements.length > 0 ? 'Audited' : 'Pending',
            },
          ].map((step) => (
            <div
              key={step.title}
              className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 flex flex-col justify-between text-center relative"
            >
              <div className="flex justify-center mb-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-xs",
                    step.status === 'complete'
                      ? "bg-[#D94B5A] text-white"
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  <step.icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-xs font-bold text-[#D94B5A]">{step.title}</span>
              <span className="text-[10px] font-mono text-emerald-800 font-extrabold my-1">
                {step.val}
              </span>
              <span className="text-[9.5px] font-sans text-slate-500">{step.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
