import React from 'react';
import { getAgenciesForArea } from '../../services/areaLogicService';

interface TransportDocInfoCardProps {
  formData: any;
  handleChange: (e: any) => void;
  areas: any[];
  unitList: string[];
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  setDetails: React.Dispatch<React.SetStateAction<any[]>>;
}

export const TransportDocInfoCard: React.FC<TransportDocInfoCardProps> = ({
  formData,
  handleChange,
  areas,
  unitList,
  setFormData,
  setDetails
}) => {
  return (
    <div className="w-full rounded-xl border border-[#F7AFA8] bg-white shadow-xs overflow-visible relative z-10 mt-3">
      {/* Header */}
      <div className="bg-[#F7AFA8] px-4 py-1.5 rounded-t-[11px]">
        <h3 className="text-white text-xs font-bold tracking-wide uppercase">
          Transport & Document Information
        </h3>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">

          {/* ================= LEFT ================= */}
          <div className="space-y-1.5">

            {/* Consignment */}
            <div>
              <label htmlFor="consignment_note_no_1368" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                Consignment Note No.
              </label>

              <input
                id="consignment_note_no_1368"
                aria-label="Consignment Note No."
                type="text"
                name="consignment_note_no"
                value={formData.consignment_note_no}
                onChange={handleChange}
                readOnly={formData.jci === 'No'}
                tabIndex={-1}
                className={`w-full h-7 rounded border px-2 text-xs font-semibold outline-none ${formData.jci === 'No' ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:border-[#F7AFA8]"}`}
              />
            </div>

            {/* DI */}
            <div>
              <label htmlFor="di_no_1385" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                D.I. Details
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  id="di_no_1385"
                  aria-label="D.I. Details"
                  type="text"
                  name="di_no"
                  placeholder="DI Number"
                  value={formData.di_no}
                  onChange={handleChange}
                  readOnly={formData.jci === 'No'}
                  tabIndex={-1}
                  className={`w-full h-7 rounded border px-2 text-xs font-semibold outline-none ${formData.jci === 'No' ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:border-[#F7AFA8]"}`}
                />

                <input
                  id="di_date_1394"
                  aria-label="di date"
                  type="date"
                  name="di_date"
                  value={formData.di_date}
                  onChange={handleChange}
                  readOnly={formData.jci === 'No'}
                  tabIndex={-1}
                  className={`w-full h-7 rounded border px-2 text-xs font-semibold outline-none ${formData.jci === 'No' ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:border-[#F7AFA8]"}`}
                />
              </div>
            </div>

            {/* Invoice */}
            <div>
              <label htmlFor="invoice_no_1413" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                Invoice Details
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  id="invoice_no_1413"
                  aria-label="Invoice Details"
                  type="text"
                  name="invoice_no"
                  placeholder="Invoice Number"
                  value={formData.invoice_no}
                  onChange={handleChange}
                  readOnly={formData.jci === 'No'}
                  tabIndex={-1}
                  className={`w-full h-7 rounded border px-2 text-xs font-semibold outline-none ${formData.jci === 'No' ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:border-[#F7AFA8]"}`}
                />

                <input
                  id="invoice_date_1422"
                  aria-label="invoice date"
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleChange}
                  readOnly={formData.jci === 'No'}
                  tabIndex={-1}
                  className={`w-full h-7 rounded border px-2 text-xs font-semibold outline-none ${formData.jci === 'No' ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:border-[#F7AFA8]"}`}
                />
              </div>
            </div>

            {/* PTF */}
            <div>
              <label htmlFor="ptf_1439" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                P.T.F
              </label>

              <select
                id="ptf_1439"
                aria-label="P.T.F"
                name="ptf"
                value={formData.ptf}
                onChange={handleChange}
                className="w-full h-7 rounded border border-gray-300 px-2 text-xs font-semibold"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Lorry */}
            <div>
              <label htmlFor="lorry_returned_1458" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                Lorry Returned
              </label>

              <div className="grid grid-cols-2 gap-2">
                <select
                  id="lorry_returned_1458"
                  aria-label="Lorry Returned"
                  name="lorry_returned"
                  value={formData.lorry_returned}
                  onChange={handleChange}
                  className="h-7 rounded border border-gray-300 px-2 text-xs font-semibold"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>

                <select
                  id="lorry_returned_other_mill_1468"
                  aria-label="lorry returned other mill"
                  name="lorry_returned_other_mill"
                  value={formData.lorry_returned_other_mill}
                  onChange={handleChange}
                  tabIndex={-1}
                  className="h-7 rounded border border-gray-300 px-2 text-xs font-semibold"
                >
                  <option value="No">Ret. Other Mill : No</option>
                  <option value="Yes">Ret. Other Mill : Yes</option>
                </select>
              </div>
            </div>

            {/* Arrival Area */}
            <div>
              <label htmlFor="arrival_area_code_1489" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                Arrival Area <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex gap-2">
                <input
                  id="arrival_area_code_1489"
                  aria-label="Arrival Area Code"
                  type="text"
                  name="arrival_area_code"
                  placeholder="Code"
                  value={formData.arrival_area_code || ''}
                  onChange={(e) => {
                    const codeVal = e.target.value;
                    const matchedArea = areas.find(
                      a => String(a.area_code || a.code || '').trim().toUpperCase() === codeVal.trim().toUpperCase()
                    );
                    const matchedName = matchedArea ? matchedArea.area_name : (formData.arrival_area_name || '');

                    if (matchedName) {
                      const validAgencies = getAgenciesForArea(matchedName);
                      const validSet = new Set([
                        ...validAgencies.map(a => a.AGENCY_NAME.toUpperCase()),
                        ...validAgencies.map(a => a.AGENCY_CODE.toUpperCase())
                      ]);
                      setDetails(prev => prev.map(d => {
                        const agName = (d.agency_name || '').trim().toUpperCase();
                        const agCode = (d.agency_code || '').trim().toUpperCase();
                        if ((agName && !validSet.has(agName)) || (agCode && !validSet.has(agCode))) {
                          return { ...d, agency_name: '', agency_code: '' };
                        }
                        return d;
                      }));
                    }

                    setFormData(prev => ({
                      ...prev,
                      arrival_area_code: codeVal,
                      arrival_area_name: matchedArea ? matchedArea.area_name : prev.arrival_area_name
                    }));
                  }}
                  className="w-16 h-7 rounded border border-gray-300 bg-white text-center text-xs font-bold font-mono uppercase focus:border-[#F7AFA8]"
                />

                <select
                  id="arrival_area_name_1497"
                  aria-label="Arrival area name"
                  name="arrival_area_name"
                  value={formData.arrival_area_name || ''}
                  onChange={(e) => {
                    const areaVal = e.target.value;
                    const matchedArea = areas.find(a => a.area_name === areaVal);

                    const validAgencies = areaVal ? getAgenciesForArea(areaVal) : [];
                    const validSet = new Set([
                      ...validAgencies.map(a => a.AGENCY_NAME.toUpperCase()),
                      ...validAgencies.map(a => a.AGENCY_CODE.toUpperCase())
                    ]);

                    setDetails(prev => prev.map(d => {
                      const agName = (d.agency_name || '').trim().toUpperCase();
                      const agCode = (d.agency_code || '').trim().toUpperCase();
                      if ((agName && !validSet.has(agName)) || (agCode && !validSet.has(agCode))) {
                        return { ...d, agency_name: '', agency_code: '' };
                      }
                      return d;
                    }));

                    setFormData(prev => ({
                      ...prev,
                      arrival_area_name: areaVal,
                      arrival_area_code: matchedArea ? (matchedArea.area_code || matchedArea.code) : prev.arrival_area_code
                    }));
                  }}
                  required
                  className="flex-1 h-7 rounded border border-gray-300 px-2 text-xs font-semibold"
                >
                  <option value="">-- SELECT AREA --</option>

                  {areas.map(a => (
                    <option key={a.id || a.area_code || a.area_name} value={a.area_name}>
                      {a.area_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* ================= RIGHT ================= */}
          <div className="space-y-1.5">

            {/* Unit */}
            <div>
              <label htmlFor="unit_code_1541" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                Unit <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex gap-2">
                <input
                  id="unit_code_1541"
                  aria-label="Unit"
                  type="text"
                  name="unit_code"
                  value={formData.unit_code}
                  readOnly
                  required
                  className="w-16 h-7 rounded border border-gray-300 bg-slate-100 text-center text-xs font-bold"
                />

                <select
                  id="unit_name_1549"
                  aria-label="unit name"
                  name="unit_name"
                  required
                  value={formData.unit_name || "BALES"}
                  onChange={(e) => {
                    const uVal = e.target.value;

                    const codeMap: Record<string, string> = {
                      BALES: "I",
                      LOOSE: "II",
                      DRUMS: "2",
                      "P.BALES": "4",
                      "H.BALES": "5",
                    };

                    setFormData(prev => ({
                      ...prev,
                      unit_name: uVal,
                      unit_code:
                        codeMap[uVal] ||
                        prev.unit_code ||
                        "1",
                    }));
                  }}
                  className="flex-1 h-7 rounded border border-gray-300 px-2 text-xs font-semibold"
                >
                  {Array.from(
                    new Set(
                      [...unitList, formData.unit_name].filter(Boolean)
                    )
                  ).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Way Bill */}
            <div>
              <label htmlFor="way_bill_no_1596" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                Way Bill
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  id="way_bill_no_1596"
                  aria-label="Way Bill"
                  type="text"
                  name="way_bill_no"
                  value={formData.way_bill_no}
                  onChange={handleChange}
                  placeholder="Way Bill No."
                  readOnly={formData.jci === 'No'}
                  tabIndex={-1}
                  className={`w-full h-7 rounded border px-2 text-xs font-semibold outline-none ${formData.jci === 'No' ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:border-[#F7AFA8]"}`}
                />

                <input
                  id="way_bill_date_1605"
                  aria-label="way bill date"
                  type="date"
                  name="way_bill_date"
                  value={formData.way_bill_date}
                  onChange={handleChange}
                  readOnly={formData.jci === 'No'}
                  tabIndex={-1}
                  className={`w-full h-7 rounded border px-2 text-xs font-semibold outline-none ${formData.jci === 'No' ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:border-[#F7AFA8]"}`}
                />
              </div>
            </div>

            {/* APMC */}
            <div>
              <label htmlFor="apmc_fees_1622" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                A.P.M.C Fees (Rs.) 
              </label>

              <input
                id="apmc_fees_1622"
                aria-label="A.P.M.C Fees (Rs.)"
                type="number"
                step="0.01"
                min="0"
                name="apmc_fees"
                placeholder="0.00"
                value={formData.apmc_fees !== undefined && formData.apmc_fees !== null ? formData.apmc_fees : ""}
                onChange={handleChange}
                className="w-full h-7 rounded border border-gray-300 px-2 text-right text-xs font-bold focus:border-[#F7AFA8]"
              />
            </div>

            {/* Remarks */}
            <div>
              <label htmlFor="remarks_1638" className="block text-[10px] font-bold text-gray-700 mb-0.5">
                Remarks
              </label>

              <textarea
                id="remarks_1638"
                aria-label="Remarks"
                name="remarks"
                rows={2}
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Enter Remarks..."
                tabIndex={-1}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs font-semibold resize-none h-14"
              />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
