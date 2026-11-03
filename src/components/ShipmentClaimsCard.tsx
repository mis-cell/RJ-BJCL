import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import SectionHeader from './SectionHeader';

interface ShipmentClaimsCardProps {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ShipmentClaimsCard: React.FC<ShipmentClaimsCardProps> = ({ formData, onChange }) => {
  return (
    <div className="bg-white rounded-[18px] p-5 shadow-md border border-[#D8D3C5] hover:border-[#F7AFA8]/40 hover:shadow-lg transition-all">
      <SectionHeader icon={Calendar} title="Shipment & Claims" />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Shipment Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shipment_date_19" className="text-xs font-semibold text-slate-700">Shipment Date</label>
          <input id="shipment_date_19" aria-label="Shipment Date" type="date"
            name="shipment_date"
            value={formData.shipment_date || ''}
            onChange={onChange}
            required
            className="bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs cursor-pointer"
          />
        </div>

        {/* Shipment Days */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shipment_days_31" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Days</span>
            <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase">Auto</span>
          </label>
          <input
            id="shipment_days_31" aria-label="Days"
            type="number"
            name="shipment_days"
            value={formData.shipment_days ?? 0}
            onChange={onChange}
            className="bg-[#FDE7E6] border border-sky-300 rounded-xl px-3.5 py-2 text-xs font-bold text-sky-950 text-right outline-none focus:ring-2 focus:ring-sky-300 transition-all shadow-2xs"
          />
        </div>

        {/* Penalty Per Day */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shipment_penalty_43" className="text-xs font-semibold text-slate-700">Penalty/Day</label>
          <input id="shipment_penalty_43" aria-label="Penalty/Day" type="number"
            step="0.01"
            name="shipment_penalty"
            value={formData.shipment_penalty ?? 0}
            onChange={onChange}
            className="bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 text-right outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs"
          />
        </div>

        {/* Marks Claim */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="marks_claim_56" className="text-xs font-semibold text-slate-700">Marks Claim</label>
          <input id="marks_claim_56" aria-label="Marks Claim" type="number"
            step="0.01"
            name="marks_claim"
            value={formData.marks_claim ?? 0}
            onChange={onChange}
            className="bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 text-right outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs"
          />
        </div>

        {/* Quantity Claim */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quantity_claim_69" className="text-xs font-semibold text-slate-700">Quantity Claim</label>
          <input id="quantity_claim_69" aria-label="Quantity Claim" type="number"
            step="0.01"
            name="quantity_claim"
            value={formData.quantity_claim ?? 0}
            onChange={onChange}
            className="bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 text-right outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs"
          />
        </div>
      </div>
    </div>
  );
};

export default ShipmentClaimsCard;
