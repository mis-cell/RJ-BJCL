import React from 'react';

export interface TemporaryArrivalWeightCardProps {
  formData: any;
  onChange: (e: any) => void;
}

export const TemporaryArrivalWeightCard: React.FC<TemporaryArrivalWeightCardProps> = ({
  formData,
  onChange
}) => {
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState<string>('');

  const getDisplayWeight = (fieldName: string, alwaysShowZero: boolean = false): string => {
    if (focusedField === fieldName) {
      return editingValue;
    }
    const raw = formData[fieldName];
    const num = Number(raw);
    if (raw === '' || raw === null || raw === undefined || isNaN(num)) {
      return alwaysShowZero ? '0.000' : '';
    }
    if (num === 0) {
      return alwaysShowZero ? '0.000' : '';
    }
    return num.toFixed(3);
  };

  const handleWeightFocus = (fieldName: string, e: React.FocusEvent<HTMLInputElement>) => {
    setFocusedField(fieldName);
    const num = Number(formData[fieldName]);
    setEditingValue(!isNaN(num) && num > 0 ? num.toFixed(3) : '');
    const target = e.target;
    setTimeout(() => target.select(), 0);
  };

  const handleWeightChange = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
      setEditingValue(val);
      onChange({
        target: {
          name: fieldName,
          value: val
        }
      });
    }
  };

  const handleWeightBlur = (fieldName: string) => {
    const parsed = parseFloat(editingValue);
    const finalNum = !isNaN(parsed) && parsed > 0 ? Number(parsed.toFixed(3)) : 0;
    onChange({
      target: {
        name: fieldName,
        value: finalNum > 0 ? finalNum.toFixed(3) : ''
      }
    });
    setFocusedField(null);
  };

  return (
    <div className="w-full rounded-xl border border-[#F7AFA8] bg-white shadow-md overflow-hidden mt-5">
      {/* Header */}
      <div className="bg-[#D94B5A] text-white px-4 py-2 border-b border-[#F06D6C]">
        <h3 className="text-sm font-bold tracking-wide uppercase">
          Weight Information
        </h3>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-300">
        {/* 1st: Mill Weight */}
        <div className="p-3 space-y-2">
          <h4 className="text-[11px] font-bold text-[#D94B5A] border-b border-gray-300 pb-1 uppercase">
            MILL WEIGHT
          </h4>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">MILL GROSS</span>
            <input
              id="supplier_challan_gross_1960"
              aria-label="supplier challan gross"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="supplier_challan_gross"
              value={getDisplayWeight('supplier_challan_gross')}
              onFocus={(e) => handleWeightFocus('supplier_challan_gross', e)}
              onChange={(e) => handleWeightChange('supplier_challan_gross', e)}
              onBlur={() => handleWeightBlur('supplier_challan_gross')}
              className="w-24 h-7 border rounded border-gray-300 bg-white px-2 text-right font-bold font-mono"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">MILL TARE</span>
            <input
              id="supplier_tare_weight_2003"
              aria-label="supplier tare weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="supplier_tare_weight"
              value={getDisplayWeight('supplier_tare_weight')}
              onFocus={(e) => handleWeightFocus('supplier_tare_weight', e)}
              onChange={(e) => handleWeightChange('supplier_tare_weight', e)}
              onBlur={() => handleWeightBlur('supplier_tare_weight')}
              className="w-24 h-7 border rounded border-gray-300 bg-white px-2 text-right font-bold font-mono"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">MILL NET <span className="text-rose-600 font-black text-sm">*</span></span>
            <input
              id="supplier_net_weight_1917"
              aria-label="supplier net weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="supplier_net_weight"
              value={getDisplayWeight('supplier_net_weight', true)}
              onFocus={(e) => handleWeightFocus('supplier_net_weight', e)}
              onChange={(e) => handleWeightChange('supplier_net_weight', e)}
              onBlur={() => handleWeightBlur('supplier_net_weight')}
              required
              className="w-24 h-7 border rounded border-gray-300 bg-[#FDE7E6]/70 px-2 text-right font-bold font-mono"
            />
          </div>

        </div>

        {/* 2nd: Challan Weight */}
        <div className="p-3 space-y-2">
          <h4 className="text-[11px] font-bold text-[#D94B5A] border-b border-gray-300 pb-1 uppercase">
            CHALLAN WEIGHT (PARTY)
          </h4>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">CHALLAN GROSS <b> (Party)</b></span>
            <input
              id="actual_gross_weight_1948"
              aria-label="actual gross weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="actual_gross_weight"
              value={getDisplayWeight('actual_gross_weight')}
              onFocus={(e) => handleWeightFocus('actual_gross_weight', e)}
              onChange={(e) => handleWeightChange('actual_gross_weight', e)}
              onBlur={() => handleWeightBlur('actual_gross_weight')}
              className="w-24 h-7 border rounded border-gray-300 bg-white px-2 text-right font-bold font-mono"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">CHALLAN TARE <b> (Party)</b></span>
            <input
              id="actual_tare_weight_1991"
              aria-label="actual tare weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="actual_tare_weight"
              value={getDisplayWeight('actual_tare_weight')}
              onFocus={(e) => handleWeightFocus('actual_tare_weight', e)}
              onChange={(e) => handleWeightChange('actual_tare_weight', e)}
              onBlur={() => handleWeightBlur('actual_tare_weight')}
              className="w-24 h-7 border rounded border-gray-300 bg-white px-2 text-right font-bold font-mono"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">CHALLAN NET <b> (Party)</b> <span className="text-rose-600 font-black text-sm">*</span></span>
            <input
              id="challan_material_weight_1905"
              aria-label="challan material weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="challan_material_weight"
              value={getDisplayWeight('challan_material_weight', true)}
              onFocus={(e) => handleWeightFocus('challan_material_weight', e)}
              onChange={(e) => handleWeightChange('challan_material_weight', e)}
              onBlur={() => handleWeightBlur('challan_material_weight')}
              required
              className="w-24 h-7 border rounded border-gray-300 bg-[#FDE7E6]/70 px-2 text-right font-bold font-mono"
            />
          </div>
        </div>

        {/* 3rd: Electronic Weight */}
        <div className="p-3 space-y-2">
          <h4 className="text-[11px] font-bold text-[#D94B5A] border-b border-gray-300 pb-1 uppercase">
            ELECTRONIC WEIGHT
          </h4>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">ELECTRONIC GROSS</span>
            <input
              id="electronic_gross_weight_1972"
              aria-label="electronic gross weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="electronic_gross_weight"
              value={getDisplayWeight('electronic_gross_weight')}
              onFocus={(e) => handleWeightFocus('electronic_gross_weight', e)}
              onChange={(e) => handleWeightChange('electronic_gross_weight', e)}
              onBlur={() => handleWeightBlur('electronic_gross_weight')}
              className="w-24 h-7 border rounded border-gray-300 bg-white px-2 text-right font-bold font-mono"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">ELECTRONIC TARE</span>
            <input
              id="electronic_tare_weight_2015"
              aria-label="electronic tare weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="electronic_tare_weight"
              value={getDisplayWeight('electronic_tare_weight')}
              onFocus={(e) => handleWeightFocus('electronic_tare_weight', e)}
              onChange={(e) => handleWeightChange('electronic_tare_weight', e)}
              onBlur={() => handleWeightBlur('electronic_tare_weight')}
              className="w-24 h-7 border rounded border-gray-300 bg-white px-2 text-right font-bold font-mono"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold">ELECTRONIC NET <span className="text-rose-600 font-black text-sm">*</span></span>
            <input
              id="electronic_net_weight_1929"
              aria-label="electronic net weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              name="electronic_net_weight"
              value={getDisplayWeight('electronic_net_weight', true)}
              onFocus={(e) => handleWeightFocus('electronic_net_weight', e)}
              onChange={(e) => handleWeightChange('electronic_net_weight', e)}
              onBlur={() => handleWeightBlur('electronic_net_weight')}
              required
              className="w-24 h-7 border rounded border-gray-300 bg-[#FDE7E6]/70 px-2 text-right font-bold font-mono"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 bg-gray-50 px-4 py-2 flex justify-center items-center gap-3">
        <span className="text-[11px] font-bold text-[#D94B5A] uppercase">
          Final Weight (M.Ton)
        </span>

        <input
          id="weight_reduced_2034"
          aria-label="final weight"
          type="text"
          inputMode="decimal"
          placeholder="0.000"
          name="weight_reduced"
          value={getDisplayWeight('weight_reduced', true)}
          onFocus={(e) => handleWeightFocus('weight_reduced', e)}
          onChange={(e) => handleWeightChange('weight_reduced', e)}
          onBlur={() => handleWeightBlur('weight_reduced')}
          className="w-32 h-8 border border-red-300 rounded bg-white text-right px-2 font-black font-mono text-red-700"
        />
      </div>
    </div>
  );
};
