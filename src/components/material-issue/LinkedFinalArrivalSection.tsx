import React from 'react';
import { Archive } from 'lucide-react';

interface LinkedFinalArrivalSectionProps {
  finalArrivals: any[];
  formData: any;
  selectedArrivalId: string;
  setSelectedArrivalId: (id: string) => void;
  loadFA: () => void;
  arrivalMeta: any;
}

export const LinkedFinalArrivalSection: React.FC<LinkedFinalArrivalSectionProps> = ({
  finalArrivals,
  formData,
  selectedArrivalId,
  setSelectedArrivalId,
  loadFA,
  arrivalMeta
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D94B5A] bg-[#F7AFA8] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Archive className="h-4 w-4 text-white" />
          </div>

          <div>
            <span className="block text-sm font-bold text-white">
              Linked Final Arrival
            </span>

            <span className="text-[9px] font-semibold uppercase tracking-wider text-green-100">
              Arrival Reference Details
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-5 p-4">
        {/* Select Arrival */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
            <label
              htmlFor="select_final_arrival_fa_686"
              className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
            >
              Select Final Arrival (FA #)
            </label>

            <select
              id="select_final_arrival_fa_686"
              name="select_final_arrival_fa"
              aria-label="Select Final Arrival (FA #)"
              value={selectedArrivalId}
              onChange={(e) => setSelectedArrivalId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Select Final Arrival —</option>

              {finalArrivals
                .filter(
                  arr =>
                    !arr.is_issued ||
                    arr.final_arrival_no === formData.requisition_no
                )
                .map((arr) => (
                  <option
                    key={arr.id || arr.final_arrival_id}
                    value={arr.id || arr.final_arrival_id}
                  >
                    {arr.final_arrival_no} — {arr.supplier} (
                    {arr.total_packets || arr.packets || arr.bales || 0} bales){' '}
                    {arr.is_issued ? '(Already Issued)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadFA}
            className="flex h-[38px] items-center gap-2 rounded-lg bg-blue-600 px-5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow active:scale-[0.98] cursor-pointer"
          >
            <Archive className="h-3.5 w-3.5" />
            Load Arrival
          </button>
        </div>

        {/* Readonly FA Details */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Arrival Information
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Voucher Date */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="voucher_date_712"
                className="text-[9px] font-bold uppercase tracking-wide text-slate-400"
              >
                Voucher Date
              </label>

              <input
                id="voucher_date_712"
                name="voucher_date"
                aria-label="Voucher Date"
                readOnly
                value={
                  arrivalMeta
                    ? new Date(arrivalMeta.date).toLocaleDateString('en-GB')
                    : '--'
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              />
            </div>

            {/* PO Number */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label
                htmlFor="p_o_mill_p_o_no_716"
                className="text-[9px] font-bold uppercase tracking-wide text-slate-400"
              >
                P.O. / Mill P.O. No.
              </label>

              <input
                id="p_o_mill_p_o_no_716"
                name="p_o_mill_p_o_no"
                aria-label="P.O. / Mill P.O. No."
                readOnly
                value={
                  arrivalMeta?.po_no ||
                  arrivalMeta?.purchase_order_no ||
                  '--'
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              />
            </div>

            {/* JCI */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="j_c_i_govt_720"
                className="text-[9px] font-bold uppercase tracking-wide text-slate-400"
              >
                J.C.I Govt
              </label>

              <input
                id="j_c_i_govt_720"
                name="j_c_i_govt"
                aria-label="J.C.I Govt"
                readOnly
                value={arrivalMeta?.jci || 'No'}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              />
            </div>

            {/* Supplier */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label
                htmlFor="supplier_name_724"
                className="text-[9px] font-bold uppercase tracking-wide text-slate-400"
              >
                Supplier Name
              </label>

              <input
                id="supplier_name_724"
                name="supplier_name"
                aria-label="Supplier Name"
                readOnly
                value={arrivalMeta?.supplier || '--'}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              />
            </div>

            {/* Broker */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label
                htmlFor="broker_reference_728"
                className="text-[9px] font-bold uppercase tracking-wide text-slate-400"
              >
                Broker Reference
              </label>

              <input
                id="broker_reference_728"
                name="broker_reference"
                aria-label="Broker Reference"
                readOnly
                value={arrivalMeta?.broker || '--'}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              />
            </div>

            {/* Lorry */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lorry_number_732"
                className="text-[9px] font-bold uppercase tracking-wide text-slate-400"
              >
                Lorry Number
              </label>

              <input
                id="lorry_number_732"
                name="lorry_number"
                aria-label="Lorry Number"
                readOnly
                value={
                  arrivalMeta?.lorry_number ||
                  arrivalMeta?.lorry_no ||
                  arrivalMeta?.vehicle_no ||
                  '--'
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              />
            </div>

            {/* Net Weight */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="arrival_net_wt_m_t_736"
                className="text-[9px] font-bold uppercase tracking-wide text-slate-400"
              >
                Arrival Net Wt (M.T)
              </label>

              <input
                id="arrival_net_wt_m_t_736"
                name="arrival_net_wt_m_t"
                aria-label="Arrival Net Wt (M.T)"
                readOnly
                value={
                  arrivalMeta
                    ? (
                        arrivalMeta.challan_material_weight !== undefined &&
                        arrivalMeta.challan_material_weight !== null
                          ? Number(
                              arrivalMeta.challan_material_weight
                            ).toFixed(3)
                          : (
                              Number(
                                arrivalMeta.total_actual_weight ||
                                arrivalMeta.total_weight_kgs ||
                                0
                              ) / 1000
                            ).toFixed(3)
                      )
                    : '0.000'
                }
                className="w-full rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-right text-xs font-bold tabular-nums text-emerald-700 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
