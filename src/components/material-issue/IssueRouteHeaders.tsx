import React from 'react';
import { Layers, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditableComboBox } from './EditableComboBox';
import { IssueRouteType } from './entryTypes';

// --- 1. ROUTE SELECTOR PANEL (when !issueRoute) ---
interface RouteSelectorPanelProps {
  onChooseRoute: (route: 'godown' | 'mill' | 'factory') => void;
}

export const RouteSelectorPanel: React.FC<RouteSelectorPanelProps> = ({ onChooseRoute }) => {
  return (
    <div className="bg-white border border-[#dbe1ea] rounded-md p-6 shadow-xs">
      <div className="font-bold text-[#1c4587] text-[14px] mb-4 uppercase tracking-wider">
        Choose issue route
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          type="button" 
          onClick={() => onChooseRoute('godown')}
          className="flex gap-4 items-center text-left p-5 border-2 border-[#bcd0ea] rounded-lg bg-white cursor-pointer hover:translate-y-[-2px] hover:shadow-md hover:border-[#1c4587] transition-all"
        >
          <div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-[21px] text-white bg-gradient-to-br from-[#1c4587] to-[#2c6bb3]">
            🏭
          </div>
          <div>
            <div className="font-extrabold text-[#1c4587] text-[14px]">ISSUE TO GODOWN</div>
            <div className="text-[11px] text-slate-500 mt-1 leading-tight">
              Store a verified Final Arrival into a godown stack (GRN).
            </div>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => onChooseRoute('mill')}
          className="flex gap-4 items-center text-left p-5 border-2 border-[#bfe3d3] rounded-lg bg-white cursor-pointer hover:translate-y-[-2px] hover:shadow-md hover:border-[#D94B5A] transition-all"
        >
          <div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-[21px] text-white bg-gradient-to-br from-[#D94B5A] to-[#159c74]">
            💰
          </div>
          <div>
            <div className="font-extrabold text-[#D94B5A] text-[14px]">SELL (Godown to Factory)</div>
            <div className="text-[11px] text-slate-500 mt-1 leading-tight">
              Direct sale or transfer of raw jute from Godown to Factory.
            </div>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => onChooseRoute('factory')}
          className="flex gap-4 items-center text-left p-5 border-2 border-[#f0d79a] rounded-lg bg-white cursor-pointer hover:translate-y-[-2px] hover:shadow-md hover:border-[#e0972f] transition-all"
        >
          <div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-[21px] text-white bg-gradient-to-br from-[#b9851a] to-[#e0972f]">
            📦
          </div>
          <div>
            <div className="font-extrabold text-[#b9851a] text-[14px]">GODOWN &rarr; FACTORY</div>
            <div className="text-[11px] text-slate-500 mt-1 leading-tight">
              Issue raw jute already stored in a godown out to the factory.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

// --- 2. ROUTE STATUS BAR (when issueRoute is chosen) ---
interface RouteStatusBarProps {
  issueRoute: 'godown' | 'mill' | 'factory';
  onChangeRoute: () => void;
}

export const RouteStatusBar: React.FC<RouteStatusBarProps> = ({ issueRoute, onChangeRoute }) => {
  return (
    <div className="flex items-center gap-3 bg-[#eef4fb] border border-[#cfe0f2] rounded p-3">
      <span className="font-bold text-slate-700">Issue route:</span>
      <span className={cn(
        "font-extrabold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded text-white",
        issueRoute === 'godown' ? "bg-[#1c4587]" : issueRoute === 'mill' ? "bg-[#D94B5A]" : "bg-[#e0972f]"
      )}>
        {issueRoute === 'godown' ? 'ISSUE TO GODOWN' : issueRoute === 'mill' ? 'SELL (GODOWN TO FACTORY)' : 'GODOWN TO FACTORY'}
      </span>
      <span className="text-slate-500 font-medium">
        {issueRoute === 'godown' 
          ? 'Store verified arrivals to a stack record.' 
          : issueRoute === 'mill' 
            ? 'Sell direct from godown to buyer factory.' 
            : 'Despatching raw jute from godown rows to spinning units.'
        }
      </span>
      <button 
        type="button" 
        onClick={onChangeRoute}
        className="ml-auto bg-white border border-[#1c4587] text-[#1c4587] hover:bg-[#f1f5fc] rounded px-3 py-1 font-bold cursor-pointer transition-colors"
      >
        Change route
      </button>
    </div>
  );
};

// --- 3. GODOWN STORAGE HEADER ---
interface GodownStorageHeaderProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  godownRecords: any[];
}

export const GodownStorageHeader: React.FC<GodownStorageHeaderProps> = ({
  formData,
  setFormData,
  godownRecords
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#D94B5A] bg-[#F7AFA8] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
          <Layers className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">
            Godown Storage Details
          </h3>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-green-100">
            Storage & Warehouse Information
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Godown Receipt No. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="godown_receipt_no_756"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Godown Receipt No.
            </label>
            <input
              id="godown_receipt_no_756"
              name="godown_receipt_no"
              aria-label="Godown Receipt No."
              value={formData.issue_no}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  issue_no: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#D94B5A] outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Storing Date */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="storing_date_764"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Storing Date
            </label>
            <input
              id="storing_date_764"
              name="storing_date"
              aria-label="Storing Date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  date: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Godown No. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="godown_no_773"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Godown No.
            </label>
            <select
              id="godown_no_773"
              name="godown_no"
              aria-label="Godown No."
              value={formData.godown === 'N/A' ? '' : formData.godown}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  godown: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100 cursor-pointer"
            >
              <option value="">— Select Godown —</option>
              {godownRecords?.map((gdn: any) => (
                <option key={gdn.gdn_code || gdn.id} value={gdn.gdn_name}>
                  {gdn.gdn_name}
                </option>
              ))}
            </select>
          </div>

          {/* Stack / Lot */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="stack_lot_no_788"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Stack / Lot No.
            </label>
            <input
              id="stack_lot_no_788"
              name="stack_lot_no"
              aria-label="Stack / Lot No."
              placeholder="Stack identifier"
              value={formData.stack_no}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  stack_no: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Stored By */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="stored_by_keeper_797"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Stored By (Keeper)
            </label>
            <input
              id="stored_by_keeper_797"
              name="stored_by_keeper"
              aria-label="Stored By (Keeper)"
              placeholder="Godown keeper name"
              value={formData.issued_by}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  issued_by: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Checked By */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="checked_by_806"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Checked By
            </label>
            <input
              id="checked_by_806"
              name="checked_by"
              aria-label="Checked By"
              placeholder="Supervisor name"
              value={formData.received_by}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  received_by: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Company */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
              Company Details / Sender Company
            </label>
            <EditableComboBox
              value={formData.party_name || ''}
              onChange={(val) =>
                setFormData((p: any) => ({
                  ...p,
                  party_name: val
                }))
              }
              options={[
                "BALLY JUTE COMPANY LIMITED",
                "HOWRAH JUTE MILLS LTD.",
                "HOOGHLY JUTE MILLS CO.",
                "BIRLA JUTE INDUSTRIES"
              ]}
              placeholder="Select or enter Company details"
            />
          </div>

          {/* Remarks */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label
              htmlFor="remarks_824"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Remarks
            </label>
            <input
              id="remarks_824"
              name="remarks"
              aria-label="Remarks"
              placeholder="Condition / short / excess notes"
              value={formData.remarks}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  remarks: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. MILL / SELL HEADER ---
interface MillSellHeaderProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  godownRecords: any[];
}

export const MillSellHeader: React.FC<MillSellHeaderProps> = ({
  formData,
  setFormData,
  godownRecords
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F7AFA8]">
          <Settings className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#D94B5A]">
            Sell Details — Godown to Factory Direct
          </h3>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">
            Direct Sale &amp; Delivery Information
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Sell / Invoice No. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="sell_invoice_no_847"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Sell / Invoice No.
            </label>
            <input
              id="sell_invoice_no_847"
              name="sell_invoice_no"
              aria-label="Sell / Invoice No."
              value={formData.issue_no}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  issue_no: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#D94B5A] outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Sale Date */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="sale_date_855"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Sale Date
            </label>
            <input
              id="sale_date_855"
              name="sale_date"
              aria-label="Sale Date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  date: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* PO / Agreement */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label
              htmlFor="p_o_agreement_no_864"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              P.O. / Agreement No.
            </label>
            <input
              id="p_o_agreement_no_864"
              name="p_o_agreement_no"
              aria-label="P.O. / Agreement No."
              placeholder="Enter Purchase Order or Agreement number"
              value={formData.requisition_no}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  requisition_no: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* JCI */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="j_c_i_govt_873"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              J.C.I Govt
            </label>
            <select
              id="j_c_i_govt_873"
              name="j_c_i_govt"
              aria-label="J.C.I Govt"
              value={formData.jci}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  jci: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100 cursor-pointer"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Challan */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="challan_delivery_order_no_884"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Challan / Delivery Order No.
            </label>
            <input
              id="challan_delivery_order_no_884"
              name="challan_delivery_order_no"
              aria-label="Challan / Delivery Order No."
              placeholder="Delivery order reference"
              value={formData.batch_order}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  batch_order: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Buyer Factory */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="buyer_factory_name_893"
              className="text-[9px] font-black uppercase tracking-wide text-emerald-700"
            >
              Buyer Factory Name
            </label>
            <input
              id="buyer_factory_name_893"
              name="buyer_factory_name"
              aria-label="Buyer Factory Name"
              placeholder="Buyer mill or factory name"
              value={formData.department}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  department: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Buyer Delivery Address */}
          <div className="col-span-2 md:col-span-3 flex flex-col gap-1.5">
            <label
              htmlFor="buyer_delivery_address_de_902"
              className="text-[9px] font-black uppercase tracking-wide text-emerald-700"
            >
              Buyer Delivery Address / Destination
            </label>
            <input
              id="buyer_delivery_address_de_902"
              name="buyer_delivery_address_de"
              aria-label="Buyer Delivery Address / Destination"
              placeholder="Enter full destination address of Buyer"
              value={formData.destination_godown || ''}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  destination_godown: e.target.value
                }))
              }
              className="h-9 w-full rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Issued By */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="issued_by_911"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Issued By
            </label>
            <input
              id="issued_by_911"
              name="issued_by"
              aria-label="Issued By"
              placeholder="Store in-charge"
              value={formData.issued_by}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  issued_by: e.target.value
                }))
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Multi-Select Godown */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-wide text-emerald-700">
              Godown No. (Source) [Select Multiple]
            </label>
            <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/30 p-1.5">
              {godownRecords?.map((gdn: any) => {
                const selectedGodowns =
                  formData.godown && formData.godown !== 'N/A'
                    ? formData.godown
                        .split(',')
                        .map((g: string) => g.trim())
                        .filter(Boolean)
                    : [];

                const isSelected = selectedGodowns.includes(gdn.gdn_name);

                return (
                  <button
                    key={gdn.gdn_code || gdn.id}
                    type="button"
                    onClick={() => {
                      let newList: string[];
                      if (isSelected) {
                        newList = selectedGodowns.filter((g: string) => g !== gdn.gdn_name);
                      } else {
                        newList = [...selectedGodowns, gdn.gdn_name];
                      }
                      const godownStr = newList.join(', ') || '';
                      setFormData((p: any) => ({
                        ...p,
                        godown: godownStr || 'N/A'
                      }));
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[9px] font-black uppercase transition-all cursor-pointer",
                      isSelected
                        ? "border-[#F7AFA8] bg-[#D94B5A] text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                    )}
                  >
                    {isSelected && (
                      <span className="text-[9px] font-bold">&#10003;</span>
                    )}
                    {gdn.gdn_name}
                  </button>
                );
              })}
              {godownRecords?.length === 0 && (
                <span className="text-[11px] italic text-slate-400">
                  No godowns loaded.
                </span>
              )}
            </div>
          </div>

          {/* Sender Company */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label
              htmlFor="sender_company_960"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Sender Company
            </label>
            <input
              id="sender_company_960"
              name="sender_company"
              aria-label="Sender Company"
              readOnly
              value="BALLY JUTE COMPANY LIMITED"
              className="h-9 cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-black uppercase text-slate-700 outline-none"
            />
          </div>

          {/* Remarks */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label
              htmlFor="remarks_gstin_comments_968"
              className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Remarks / GSTIN / Comments
            </label>
            <input
              id="remarks_gstin_comments_968"
              name="remarks_gstin_comments"
              aria-label="Remarks / GSTIN / Comments"
              placeholder="Feed / blend instructions or Buyer GSTIN"
              value={formData.remarks}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  remarks: e.target.value
                }))
              }
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7AFA8] focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 5. FACTORY ISSUE HEADER ---
interface FactoryIssueHeaderProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  godownRecords: any[];
  batchOptions: string[];
}

export const FactoryIssueHeader: React.FC<FactoryIssueHeaderProps> = ({
  formData,
  setFormData,
  godownRecords,
  batchOptions
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#F7AFA8] px-5 py-4">
        <div className="absolute right-0 top-0 h-full w-40 opacity-10">
          <div className="h-full w-full bg-[repeating-linear-gradient(45deg,white_0_12px,transparent_12px_24px)]" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
            <Layers className="h-5 w-5 text-white" />
          </div>

          <div>
            <h2 className="text-base font-black uppercase tracking-wide text-white">
              Godown To Factory
            </h2>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-green-100">
              Bally Jute Company Limited
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-slate-50/60 p-5">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          {/* Issue No */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="issue_no_996"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Issue No.
            </label>
            <input
              id="issue_no_996"
              name="issue_no"
              aria-label="Issue No."
              value={formData.issue_no}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  issue_no: e.target.value
                }))
              }
              className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-bold text-[#D94B5A] outline-none"
            />
          </div>

          {/* Issue Date */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="issue_date_1004"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Issue Date
            </label>
            <input
              id="issue_date_1004"
              name="issue_date"
              aria-label="Issue Date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  date: e.target.value
                }))
              }
              className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          {/* Requisition No */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="requisition_no_1014"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Requisition No.
            </label>
            <input
              id="requisition_no_1014"
              name="requisition_no"
              aria-label="Requisition No."
              placeholder="Batching requisition"
              value={formData.requisition_no}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  requisition_no: e.target.value
                }))
              }
              className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Requisition Date */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="requisition_date_1023"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Requisition Date
            </label>
            <input
              id="requisition_date_1023"
              name="requisition_date"
              aria-label="Requisition Date"
              type="date"
              value={formData.requisition_date}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  requisition_date: e.target.value
                }))
              }
              className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          {/* Godown */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="godown_no_source_1033"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Godown No. (Source)
            </label>
            <select
              id="godown_no_source_1033"
              name="godown_no_source"
              aria-label="Godown No. (Source)"
              value={formData.godown === 'N/A' ? '' : formData.godown}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  godown: e.target.value
                }))
              }
              className="h-8 flex-1 cursor-pointer border-0 bg-transparent px-1 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="">— Select Godown —</option>
              {godownRecords?.map((gdn: any) => (
                <option key={gdn.gdn_code || gdn.id} value={gdn.gdn_name}>
                  {gdn.gdn_name}
                </option>
              ))}
            </select>
          </div>

          {/* Issued For */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <label className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]">
              Issued For
            </label>
            <div className="flex-1">
              <EditableComboBox
                value={formData.issued_for || ''}
                onChange={(val) =>
                  setFormData((p: any) => ({
                    ...p,
                    issued_for: val
                  }))
                }
                options={["MAIN MILL"]}
                placeholder="Select or type Issued For"
              />
            </div>
          </div>

          {/* Batching Order */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <label className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]">
              Batching Order
            </label>
            <div className="flex-1">
              <EditableComboBox
                value={formData.batch_order || ''}
                onChange={(val) =>
                  setFormData((p: any) => ({
                    ...p,
                    batch_order: val
                  }))
                }
                options={batchOptions}
                placeholder="Select or type batching order"
              />
            </div>
          </div>

          {/* Lorry Number */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="lorry_number_1067"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Lorry Number
            </label>
            <input
              id="lorry_number_1067"
              name="lorry_number"
              aria-label="Lorry Number"
              placeholder="Lorry Number"
              value={formData.lorry_number}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  lorry_number: e.target.value
                }))
              }
              className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Issued By */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="issued_by_1077"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Issued By
            </label>
            <input
              id="issued_by_1077"
              name="issued_by"
              aria-label="Issued By"
              placeholder="Godown keeper name"
              value={formData.issued_by}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  issued_by: e.target.value
                }))
              }
              className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Received By */}
          <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="received_by_1086"
              className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Received By
            </label>
            <input
              id="received_by_1086"
              name="received_by"
              aria-label="Received By"
              placeholder="Mill / batching in-charge"
              value={formData.received_by}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  received_by: e.target.value
                }))
              }
              className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Company */}
          <div className="md:col-span-2 group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <label className="w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]">
              Company Details / Sender
            </label>
            <div className="flex-1">
              <EditableComboBox
                value={formData.party_name || ''}
                onChange={(val) =>
                  setFormData((p: any) => ({
                    ...p,
                    party_name: val
                  }))
                }
                options={[
                  "BALLY JUTE COMPANY LIMITED",
                  "HOWRAH JUTE MILLS LTD.",
                  "HOOGHLY JUTE MILLS CO.",
                  "BIRLA JUTE INDUSTRIES"
                ]}
                placeholder="Select or enter Company details"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="md:col-span-2 flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#F7AFA8] focus-within:ring-2 focus-within:ring-green-100">
            <label
              htmlFor="remarks_1108"
              className="mt-2 w-[125px] shrink-0 text-[10px] font-black uppercase tracking-wide text-[#D94B5A]"
            >
              Remarks
            </label>
            <textarea
              id="remarks_1108"
              name="remarks"
              aria-label="Remarks"
              placeholder="Issue notes, dampness, short / excess details, observations"
              value={formData.remarks}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  remarks: e.target.value
                }))
              }
              className="min-h-[52px] flex-1 resize-y border-0 bg-transparent px-1 py-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
