import React from 'react';
import { Truck } from 'lucide-react';
import SectionHeader from './SectionHeader';
import SearchableSelect from './SearchableSelect';

interface TransportationCardProps {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSelectChange?: (field: string, value: string) => void;
  unitOptions: string[];
  isUser010?: boolean;
}

export const TransportationCard: React.FC<TransportationCardProps> = ({
  formData,
  onChange,
  onSelectChange,
  unitOptions,
  isUser010 = false
}) => {
  return (
    <div className="bg-white rounded-[18px] p-5 shadow-md border border-[#D8D3C5] hover:border-[#F7AFA8]/40 hover:shadow-lg transition-all">
      <SectionHeader icon={Truck} title="Unit & Transportation Details" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* No. of Lorries */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="no_of_lorries_26" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>No. of Lorries </span>
            <span className="text-rose-600 font-black text-sm">*</span>
          </label>
          <input
            id="no_of_lorries_26"
            aria-label="No. of Lorries"
            type="number"
            min="1"
            name="no_of_lorries"
            value={formData.no_of_lorries ?? 1}
            onChange={onChange}
            required
            className="bg-[#FDE7E6] border-2 border-rose-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 text-right outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all shadow-2xs font-mono"
          />
        </div>
        {/* Unit Type - SEARCHABLE DROPDOWN */}
        <SearchableSelect
          label="Unit Type"
          value={formData.unit_type || 'BALES'}
          onChange={(val) => {
            if (onSelectChange) {
              onSelectChange('unit_type', val);
            } else {
              onChange({ target: { name: 'unit_type', value: val } } as any);
            }
          }}
          options={unitOptions}
          placeholder="SELECT OR TYPE UNIT..."
          isAutoPopulated={Boolean(formData.unit_type)}
          isRequired={true}
        />

        {/* Units/Lorry - NUMERIC INPUT */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="units_per_lorry_input" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Units/Lorry</span>
            </span>
            {(() => {
              const uType = String(formData.unit_type || '').toUpperCase().trim();
              if (uType.includes('DRUM')) {
                return (
                  <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300 font-bold uppercase">
                    50 KG/DRUM
                  </span>
                );
              }
              if (uType === 'BALES' || uType === 'BALE') {
                return (
                  <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300 font-bold uppercase">
                    147.5 KG/BALE
                  </span>
                );
              }
              if (uType.includes('P.BALE') || uType.includes('P. BALE') || uType.includes('P BALE')) {
                return (
                  <span className="text-[9px] bg-purple-50 text-purple-800 px-1.5 py-0.2 rounded border border-purple-300 font-bold uppercase">
                    MANUAL / P.BALES
                  </span>
                );
              }
              if (uType.includes('H.BALE') || uType.includes('H. BALE') || uType.includes('H BALE')) {
                return (
                  <span className="text-[9px] bg-purple-50 text-purple-800 px-1.5 py-0.2 rounded border border-purple-300 font-bold uppercase">
                    MANUAL / H.BALES
                  </span>
                );
              }
              if (uType.includes('LOOSE')) {
                return (
                  <span className="text-[9px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300 font-bold uppercase">
                    MANUAL / LOOSE
                  </span>
                );
              }
              return (
                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300 font-bold uppercase">
                  MANUAL
                </span>
              );
            })()}
          </label>
          <input
            id="units_per_lorry_input"
            aria-label="Units/Lorry"
            type="number"
            step="any"
            min="0"
            name="units_per_lorry"
            placeholder={String(formData.unit_type || '').toUpperCase().includes('LOOSE') ? 'Manual count' : 'e.g. 80'}
            value={formData.units_per_lorry !== undefined && formData.units_per_lorry !== null ? formData.units_per_lorry : ''}
            onChange={onChange}
            required={['BALES', 'BALE', 'DRUM', 'DRUMS'].includes(
              String(formData.unit_type || '').toUpperCase().trim()
            )}
            className="bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 text-right outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs font-mono"
          />
        </div>

        {/* Total Unit = No. of Lorries * Units/Lorry */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="total_unit_56" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Total Unit</span>
            <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase">
              {String(formData.unit_type || '').toUpperCase().includes('LOOSE') || String(formData.unit_type || '').toUpperCase().includes('P.BALE') || String(formData.unit_type || '').toUpperCase().includes('H.BALE')
                ? 'MANUAL / TOTAL'
                : 'Lorry × Units/Lorry'}
            </span>
          </label>
          <input
            id="total_unit_56"
            aria-label="Total Unit"
            type="number"
            name="total_unit"
            placeholder="0"
            value={formData.total_unit !== undefined && formData.total_unit !== null ? formData.total_unit : ''}
            onChange={onChange}
            className="bg-[#FDE7E6] border border-sky-300 rounded-xl px-3.5 py-2 text-xs font-bold text-sky-950 text-right outline-none focus:ring-2 focus:ring-sky-300 transition-all shadow-2xs font-mono"
          />
        </div>

        {/* Weight/Lorry = Units/Lorry * KG / 1000 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wt_per_lorry_68" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Wt/Lorry (MT)</span>
            <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase">Auto (MT)</span>
          </label>
          <input
            id="wt_per_lorry_68"
            aria-label="Wt/Lorry"
            type="number"
            step="any"
            name="wt_per_lorry"
            value={formData.wt_per_lorry ?? 0}
            onChange={onChange}
            required={['LOOSE', 'LOOSES'].includes(
              String(formData.unit_type || '').toUpperCase().trim()
            )}
            className="bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 text-right outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs font-mono"
          />
        </div>

        {/* Total Weight in Ton */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="total_wt_in_ton_98" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Total Wt. in Ton (MT)</span>
            <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase">Auto / Input</span>
          </label>
          <input
            id="total_wt_in_ton_98"
            aria-label="Total Wt. in Ton"
            type="number"
            step="any"
            name="total_wt_in_ton"
            placeholder="e.g. 10"
            value={formData.total_wt_in_ton ?? 0}
            onChange={onChange}
            className="bg-[#FDE7E6] border border-sky-300 rounded-xl px-3.5 py-2 text-xs font-bold text-sky-950 text-right outline-none focus:ring-2 focus:ring-sky-300 transition-all shadow-2xs font-mono"
          />
        </div>
      </div>
    </div>
  );
};

export default TransportationCard;

