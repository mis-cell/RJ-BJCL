import React from 'react';

interface PoDetailItem {
  srl: number;
  crop: string;
  grade_code: string;
  grade_name: string;
  agency_code: string;
  agency_name: string;
  marka_code: string;
  marka_name: string;
  qty: number;
  weight: number;
  rate: number;
}

interface PurchaseOrderData {
  no: string;
  ptf_no: string;
  is_ptf: boolean;
  date: string;
  broker: string;
  supplier: string;
  challan_supplier: string;
  area: string;
  trans_paid_by: string;
  weight_unit_kgs: string;
  against_cancellation: string;
  purchase_unit_name: string;
  total_no_of_lorries: string;
  units_per_lorry: string;
  total_units: string;
  weight_per_lorry: string;
  total_contract_mt: string;
  marka_type: string;
  marka_penalty: string;
  qty_penalty: string;
  delivery_from: string;
  delivery_to: string;
  grace_days: string;
  delivery_penalty: string;
  contract_po_no: string;
  contract_date: string;
  rate_detail: string;
  delivery_schedule: string;
  terms_condition: string;
  remarks: string;
  po_identification: string;
  b_rate: string;
  s_date: string;
  items: PoDetailItem[];
}

interface Props {
  po: PurchaseOrderData;
}

// Helper to convert small integer number of lorries to descriptive word format (e.g., 1 -> ONE, 2 -> TWO)
const numberToWords = (num: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  if (num === 0) return 'ZERO';
  if (num < 20) return ones[num];
  const tenPart = tens[Math.floor(num / 10)];
  const onePart = ones[num % 10];
  return `${tenPart}${onePart ? ' ' + onePart : ''}`;
};

export default function PoPrintSlip({ po }: Props) {
  const detailRows = po.items || [];
  
  // Format dates strictly into exact 2-digit typewriter style: DD/MM/YYYY
  const formatDateDotMatrix = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const poDisplayNo = po.is_ptf ? po.ptf_no : po.no || 'BJCL-MANUAL';

  // Align details nicely with clean spacer lines
  const paddedItems = [...detailRows];
  while (paddedItems.length < 5) {
    paddedItems.push({
      srl: paddedItems.length + 1,
      crop: '',
      grade_code: '',
      grade_name: '',
      agency_code: '',
      agency_name: '',
      marka_code: '',
      marka_name: '',
      qty: 0,
      weight: 0,
      rate: 0
    });
  }

  // Pre-generate 14 continuous paper sprocket feedback holes for portrait presentation
  const sprocketHoles = Array.from({ length: 13 });

  // Ensure trailing dot on Quality descriptor just like in the scanned physical copy
  const formatQualityName = (name: string) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.endsWith('.')) return trimmed;
    return `${trimmed}.`;
  };

  return (
    <div className="w-full min-h-[190mm] bg-slate-100 print:bg-white p-4 sm:p-8 print:p-0 flex justify-center items-center overflow-x-auto font-sans text-slate-900">

      {/* PRINT SHEET */}
      <div className="print-full-sheet relative w-[210mm] h-[165mm] min-h-[165mm] max-h-[165mm] bg-white overflow-hidden border border-slate-300 print:border-0 shadow-2xl print:shadow-none flex">

        {/* MAIN DOCUMENT */}
        <div className="flex-1 min-w-0 px-[6mm] py-[4mm] flex flex-col overflow-hidden">

          {/* HEADER */}
          <header className="border-b-2 border-[#F7AFA8] pb-2">

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#D94B5A] text-white flex items-center justify-center font-black text-sm">
                  BJ
                </div>

                <div className="leading-tight">
                  <div className="font-black text-[16px] tracking-tight text-[#D94B5A]">
                    BALLY JUTE COMPANY LIMITED
                  </div>
                  <div className="text-[9px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                    Authorized Mill Premises • Estd. 1979
                  </div>
                  <div className="text-[9px] font-medium text-slate-500 uppercase">
                    Howrah, West Bengal • Raw Jute Division
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[16px] font-black tracking-[0.08em] text-[#D94B5A]">
                  RAW JUTE
                </div>
                <div className="text-[11px] font-bold tracking-[0.18em] text-slate-500">
                  PURCHASE ORDER
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-[1fr_auto] gap-4 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">PO ID</span>
                <span className="font-bold">{po.po_identification || 'DR/4-2'}</span>
              </div>

              <div className="flex gap-5 font-bold">
                <span>
                  <span className="text-slate-500 font-semibold">ORDER NO:</span>{' '}
                  {poDisplayNo}
                </span>
                <span>
                  <span className="text-slate-500 font-semibold">DATE:</span>{' '}
                  {formatDateDotMatrix(po.date)}
                </span>
              </div>
            </div>
          </header>

          {/* PARTIES */}
          <section className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-[10px]">

              <div className="flex min-w-0">
                <span className="w-[115px] shrink-0 text-slate-500 font-semibold">
                  Broker's Name
                </span>
                <span className="font-bold uppercase truncate">
                  : {(po.broker || 'N/A').toUpperCase()}
                </span>
              </div>

              <div className="flex min-w-0">
                <span className="w-[115px] shrink-0 text-slate-500 font-semibold">
                  Supplier Name
                </span>
                <span className="font-bold uppercase truncate">
                  : {(po.supplier || 'N/A').toUpperCase()}
                </span>
              </div>

              <div className="flex min-w-0">
                <span className="w-[115px] shrink-0 text-slate-500 font-semibold">
                  Challan Supplier
                </span>
                <span className="font-bold uppercase truncate">
                  : {(po.challan_supplier || po.supplier || 'N/A').toUpperCase()}
                </span>
              </div>

              <div className="flex min-w-0">
                <span className="w-[115px] shrink-0 text-slate-500 font-semibold">
                  JC Registration
                </span>
                <span className="font-bold truncate">
                  : WBK00S202201929
                </span>
              </div>

            </div>
          </section>

          {/* ORDER TABLE */}
          <section className="mt-2 flex-1 min-h-0">
            <div className="rounded-md border border-slate-300 overflow-hidden">

              <table className="w-full table-fixed border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#D94B5A] text-white">
                    <th className="w-[8%] px-2 py-1.5 text-left font-bold">Lorries</th>
                    <th className="w-[12%] px-2 py-1.5 text-left font-bold">Crop Year</th>
                    <th className="w-[20%] px-2 py-1.5 text-left font-bold">Agency</th>
                    <th className="w-[20%] px-2 py-1.5 text-left font-bold">Marka</th>
                    <th className="w-[16%] px-2 py-1.5 text-left font-bold">Quality</th>
                    <th className="w-[11%] px-2 py-1.5 text-right font-bold">Grade/Qty</th>
                    <th className="w-[13%] px-2 py-1.5 text-right font-bold">Rate/QUNTL</th>
                  </tr>
                </thead>

                <tbody>
                  {paddedItems.map((item, idx) => {
                    const isFirstRow = idx === 0;

                    return (
                      <tr
                        key={idx}
                        className={`h-5 border-t border-slate-200 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        }`}
                      >
                        <td className="px-2 py-1 text-left font-extrabold">
                          {isFirstRow ? po.total_no_of_lorries || '1' : ''}
                        </td>

                        <td className="px-2 py-1 text-left">
                          {isFirstRow ? (item.crop || '2025-26') : ''}
                        </td>

                        <td className="px-2 py-1 text-left uppercase truncate">
                          {item.agency_name || (isFirstRow ? po.area : '')}
                        </td>

                        <td className="px-2 py-1 text-left uppercase truncate">
                          {item.marka_name || (isFirstRow ? 'NO MARK' : '')}
                        </td>

                        <td className="px-2 py-1 text-left uppercase font-extrabold truncate">
                          {formatQualityName(item.grade_name)}
                        </td>

                        <td className="px-2 py-1 text-right font-bold">
                          {item.qty ? item.qty : ''}
                        </td>

                        <td className="px-2 py-1 text-right font-extrabold">
                          {item.rate
                            ? (
                                Number(item.rate)
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2
                              })
                            : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

            </div>
          </section>

          {/* SUMMARY */}
          <section className="mt-2">

            <div className="grid grid-cols-4 gap-2 text-[9.5px]">
              <div className="rounded border border-slate-200 px-2 py-1">
                <div className="text-slate-500 font-semibold uppercase">Unit</div>
                <div className="font-bold">{po.purchase_unit_name || 'DRUMS'}</div>
              </div>

              <div className="rounded border border-slate-200 px-2 py-1">
                <div className="text-slate-500 font-semibold uppercase">Units / Lorry</div>
                <div className="font-bold">
                  {po.units_per_lorry || '200'}
                </div>
              </div>

              <div className="rounded border border-slate-200 px-2 py-1">
                <div className="text-slate-500 font-semibold uppercase">
                  Total Units
                </div>
                <div className="font-bold">
                  {po.total_units || '200'}
                </div>
              </div>

              <div className="rounded border border-slate-200 px-2 py-1 text-right">
                <div className="text-slate-500 font-semibold uppercase">
                  Wt / Lorry
                </div>
                <div className="font-bold">
                  {Number(po.weight_per_lorry || '10.000').toFixed(3)} M.Ton
                </div>
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-[22%_1fr] gap-2 text-[9.5px]">
              <div className="rounded border border-slate-200 px-2 py-1">
                <span className="text-slate-500 font-semibold">AREA</span>{' '}
                <span className="font-bold">{po.area || 'DAISSE'}</span>
              </div>

              <div className="rounded border border-slate-200 px-2 py-1">
                <span className="text-slate-500 font-semibold">
                  TOTAL NO. OF LORRIES
                </span>{' '}
                <span className="font-bold">
                  {po.total_no_of_lorries || '1'}
                </span>{' '}
                <span className="text-slate-500">
                  ({numberToWords(Number(po.total_no_of_lorries) || 1)})
                </span>
              </div>
            </div>

            {/* DELIVERY / PENALTY */}
            <div className="mt-1.5 rounded-md border border-slate-200 overflow-hidden">

              <div className="grid grid-cols-[50%_25%_25%] text-[9.5px]">
                <div className="px-2 py-1.5 bg-slate-50 border-r border-slate-200">
                  <span className="text-slate-500 font-semibold">DELIVERY SCHEDULE</span><br />
                  <span className="font-bold">
                    {formatDateDotMatrix(po.delivery_from)} To{' '}
                    {formatDateDotMatrix(po.delivery_to)}
                  </span>
                </div>

                <div className="px-2 py-1.5 border-r border-slate-200">
                  <span className="text-slate-500 font-semibold">GRACE DAYS</span><br />
                  <span className="font-bold">{po.grace_days || '0'}</span>
                </div>

                <div className="px-2 py-1.5 text-right">
                  <span className="text-slate-500 font-semibold">DELIVERY PENALTY</span><br />
                  <span className="font-bold">{po.delivery_penalty || '5'}</span>
                </div>
              </div>

              <div className="grid grid-cols-[50%_25%_25%] border-t border-slate-200 text-[9.5px]">
                <div className="px-2 py-1.5 bg-slate-50 border-r border-slate-200">
                  <span className="text-slate-500 font-semibold">P.O MARKA TYPE</span><br />
                  <span className="font-bold">{po.marka_type || 'Normal'}</span>
                </div>

                <div className="px-2 py-1.5 border-r border-slate-200">
                  <span className="text-slate-500 font-semibold">MARKA PENALTY</span><br />
                  <span className="font-bold">{po.marka_penalty || '0'}</span>
                </div>

                <div className="px-2 py-1.5 text-right">
                  <span className="text-slate-500 font-semibold">QUANTITY PENALTY</span><br />
                  <span className="font-bold">{po.qty_penalty || '0'}</span>
                </div>
              </div>

            </div>

            {/* TERMS */}
            <div className="mt-1.5 flex gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 min-h-[34px]">

              <div className="shrink-0 text-[9px] font-black uppercase text-[#D94B5A]">
                Terms & Condition
              </div>

              <div className="flex-1 text-[9px] leading-relaxed uppercase font-semibold whitespace-pre-line">
                {po.terms_condition ||
                  'PENALTY RS.5/-PER DAY,AREA,AGENCY,\nGRADE, GRADE DIFFERENTIAL CAN\nCHANGE AS PER MARKET.'}

                {po.remarks && (
                  <div className="mt-0.5 text-[8px] text-slate-500 lowercase italic">
                    Remarks: {po.remarks}
                  </div>
                )}
              </div>

            </div>

          </section>
        </div>

      </div>
    </div>
  );
}
