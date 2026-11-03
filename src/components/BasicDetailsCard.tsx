import React from 'react';
import { ClipboardList, Calendar } from 'lucide-react';
import SectionHeader from './SectionHeader';
import SearchableSelect from './SearchableSelect';

interface BasicDetailsProps {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSelectChange: (field: string, value: string) => void;
  brokers: string[];
  suppliers: string[];
  areas: string[];
  isUser010?: boolean;
}

export const BasicDetailsCard: React.FC<BasicDetailsProps> = ({
  formData,
  onChange,
  onSelectChange,
  brokers,
  suppliers,
  areas,
  isUser010 = false
}) => {
  return (
    <div className="bg-white rounded-[18px] p-5 shadow-md border border-[#D8D3C5] hover:border-[#F7AFA8]/40 hover:shadow-lg transition-all">
      <SectionHeader icon={ClipboardList} title="Basic Details" />

      {isUser010 ? (
        <div className="space-y-3">
          {/* Subtle session reference for User 010 */}
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 font-mono">
            <span className="font-semibold text-slate-600">Contract Session: <strong className="text-[#D94B5A]">{formData.session || '2026-2027'}</strong></span>
            <span>Order No: <strong className="text-slate-800 font-bold">{formData.sauda_no || 'Auto'}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* P.O. Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="po_type_user010" className="text-xs font-semibold text-slate-700">
                P.O. Type
              </label>
              <select
                id="po_type_user010"
                aria-label="P.O. Type"
                name="po_type"
                value={formData.po_type || 'Normal'}
                onChange={onChange}
                className="bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs cursor-pointer"
              >
                <option value="Normal">Normal</option>
                <option value="PTF">PTF</option>
                <option value="Direct">Direct</option>
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date_user010" className="text-xs font-semibold text-slate-700">
                Date
              </label>
              <input
                id="date_user010"
                aria-label="Date"
                type="date"
                name="date"
                value={formData.date || ''}
                onChange={onChange}
                className="w-full bg-white border border-[#FBCFCB] rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 transition-all shadow-2xs cursor-pointer"
              />
            </div>

            {/* Broker */}
            <SearchableSelect
              id="broker_user010"
              label="Broker"
              value={formData.broker || ''}
              onChange={(val) => onSelectChange('broker', val)}
              options={brokers}
              placeholder="SELECT OR TYPE BROKER..."
              isRequired={false}
              isAutoPopulated={false}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Session */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session_31" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Session</span>
              <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase">Auto</span>
            </label>
            <input
              id="session_31"
              aria-label="Session"
              type="text"
              name="session"
              value={formData.session || '2026-2027'}
              onChange={onChange}
              placeholder="e.g. 2026-2027"
              className="bg-[#FDE7E6] border border-sky-300 rounded-xl px-3.5 py-2 text-xs font-bold text-sky-950 outline-none focus:ring-2 focus:ring-sky-300 transition-all shadow-2xs font-mono"
            />
          </div>

          {/* Order No. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sauda_no_43" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Order No.</span>
              <span className="text-rose-600 font-black text-sm">*</span>
              {formData.sauda_no && (
                <span className="ml-auto text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase">
                  Auto
                </span>
              )}
            </label>
            <input
              id="sauda_no_43"
              aria-label="Order No."
              type="text"
              name="sauda_no"
              value={formData.sauda_no || ''}
              onChange={onChange}
              placeholder="e.g. BJCL/2026-2027/0153"
              required
              className="bg-[#FDE7E6] border-2 border-rose-300 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all shadow-2xs font-mono"
            />
          </div>

          {/* P.O. Type */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="po_type_57" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>P.O. Type</span>
              <span className="text-rose-600 font-black text-sm">*</span>
            </label>
            <select
              id="po_type_57"
              aria-label="P.O. Type"
              name="po_type"
              value={formData.po_type || 'Normal'}
              onChange={onChange}
              className="bg-[#FDE7E6] border-2 border-rose-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all shadow-2xs cursor-pointer"
            >
              <option value="Normal">Normal</option>
              <option value="PTF">PTF</option>
              <option value="Direct">Direct</option>
            </select>
          </div>

          {/* Contract Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date_73" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Date</span>
              <span className="text-rose-600 font-black text-sm">*</span>
              {formData.date && (
                <span className="ml-auto text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase">
                  Auto
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="date_73"
                aria-label="Date"
                type="date"
                name="date"
                value={formData.date || ''}
                onChange={onChange}
                className="w-full bg-[#FDE7E6] border-2 border-rose-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all shadow-2xs cursor-pointer"
              />
            </div>
          </div>

          {/* Broker */}
          <SearchableSelect
            label="Broker"
            value={formData.broker || ''}
            onChange={(val) => onSelectChange('broker', val)}
            options={brokers}
            placeholder="SELECT OR TYPE BROKER..."
            isRequired={true}
            isAutoPopulated={Boolean(formData.broker && (formData.sauda_no || formData.is_auto_filled))}
          />

          {/* Supplier */}
          <SearchableSelect
            label="Supplier"
            value={formData.supplier || ''}
            onChange={(val) => onSelectChange('supplier', val)}
            options={suppliers}
            placeholder="SELECT OR TYPE SUPPLIER..."
            isRequired={true}
            isAutoPopulated={Boolean(formData.supplier && (formData.sauda_no || formData.is_auto_filled))}
          />

          {/* Challan Supplier */}
          <SearchableSelect
            label="Challan Supplier"
            value={formData.challan_supplier || ''}
            onChange={(val) => onSelectChange('challan_supplier', val)}
            options={suppliers}
            placeholder="SELECT OR TYPE CHALLAN SUPPLIER..."
            isRequired={true}
            isAutoPopulated={Boolean(formData.challan_supplier && (formData.challan_supplier === formData.supplier || formData.is_auto_filled))}
          />

          {/* Area */}
          <SearchableSelect
            label="Area"
            value={formData.area || ''}
            onChange={(val) => onSelectChange('area', val)}
            options={areas}
            placeholder="SELECT OR TYPE AREA..."
            isRequired={true}
            isAutoPopulated={Boolean(formData.area && (formData.sauda_no || formData.is_auto_filled))}
          />
        </div>
      )}
    </div>
  );
};

export default BasicDetailsCard;
