import React from 'react';
import { Building2, XCircle } from 'lucide-react';
import { SystemReportDataset, ReportTransactionLine, isInvalidAgency } from '../../services/systemReportEngine';

interface EntityWiseSaudaDetailsModalProps {
  selectedEntityModalInfo: {
    entityName: string;
    dimensionType: string;
  } | null;
  selectedBrokerModalBroker: string | null;
  onClose: () => void;
  dataset: SystemReportDataset;
  transactions: ReportTransactionLine[];
}

const formatSettVal = (sett: number | undefined | null, claim: number | undefined | null): string => {
  const s = Number(sett || 0);
  const c = Number(claim || 0);
  const val = s > 0 ? s : (c > 0 ? c : 0);
  if (val <= 0) return '—';
  return `${val.toFixed(2)}%`;
};

export const EntityWiseSaudaDetailsModal: React.FC<EntityWiseSaudaDetailsModalProps> = ({
  selectedEntityModalInfo,
  selectedBrokerModalBroker,
  onClose,
  dataset,
  transactions
}) => {
  if (!selectedEntityModalInfo && !selectedBrokerModalBroker) return null;

  const entityName = selectedEntityModalInfo?.entityName || selectedBrokerModalBroker || '';
  const dimType = selectedEntityModalInfo?.dimensionType || 'BROKER';
  const target = entityName.trim().toUpperCase();

  let details: any[] = [];
  if (dimType === 'BROKER') {
    const settInfo = dataset.brokerSettlementMap?.[target];
    details = settInfo?.details || [];
  } else {
    const allDetails: any[] = [];
    Object.values(dataset.brokerSettlementMap || {}).forEach(s => {
      if (s && s.details) allDetails.push(...s.details);
    });
    details = allDetails.filter((d: any) => {
      if (dimType === 'AGENCY') return String(d.agency || d.purchase_unit_name || '').trim().toUpperCase() === target;
      if (dimType === 'SUPPLIER') return String(d.supplier || '').trim().toUpperCase() === target;
      if (dimType === 'AREA') return String(d.area || '').trim().toUpperCase() === target;
      if (dimType === 'GRADE') return String(d.grade || '').trim().toUpperCase() === target;
      return false;
    });
  }

  // Fallback to matched transactions if details are empty
  if (details.length === 0) {
    const matchedTxns = transactions.filter(t => {
      if (dimType === 'AGENCY') return String(t.agency || '').trim().toUpperCase() === target;
      if (dimType === 'BROKER') return (t.broker || 'Direct').trim().toUpperCase() === target;
      if (dimType === 'SUPPLIER') return (t.supplier || '').trim().toUpperCase() === target;
      if (dimType === 'AREA') return (t.area || '').trim().toUpperCase() === target;
      if (dimType === 'GRADE') return (t.grade || '').trim().toUpperCase() === target;
      return false;
    });

    if (matchedTxns.length > 0) {
      details = matchedTxns.map((t: any) => ({
        broker: t.broker || 'Direct',
        agency: t.agency || '—',
        supplier: t.supplier || '—',
        area: t.area || '—',
        grade: t.grade || '—',
        mr_no: t.mrNo || '—',
        po_no: t.poNo || t.saudaNo || '—',
        moist_sett: t.moisturePct || 0,
        moist_claim: t.moisturePct || 0,
        dust_sett: 0,
        dust_claim: 0,
        gd_sett: 0,
        gd_claim: 0,
        val_ex_short: 0,
        lorry_number: '—'
      }));
    }
  }

  const moistRows = details.filter((d: any) => Number(d.moist_sett || d.moist_claim || 0) > 0);
  const dustRows = details.filter((d: any) => Number(d.dust_sett || d.dust_claim || 0) > 0);
  const gdRows = details.filter((d: any) => Number(d.gd_sett || d.gd_claim || 0) > 0);
  const totalShort = details.reduce((acc: number, d: any) => acc + Number(d.val_ex_short || 0), 0);

  const moistAvgStr = moistRows.length > 0
    ? `${(moistRows.reduce((acc: number, d: any) => acc + Number(d.moist_sett || d.moist_claim || 0), 0) / moistRows.length).toFixed(2)}%`
    : '—';
  const dustAvgStr = dustRows.length > 0
    ? `${(dustRows.reduce((acc: number, d: any) => acc + Number(d.dust_sett || d.dust_claim || 0), 0) / dustRows.length).toFixed(2)}%`
    : '—';
  const gdAvgStr = gdRows.length > 0
    ? `${(gdRows.reduce((acc: number, d: any) => acc + Number(d.gd_sett || d.gd_claim || 0), 0) / gdRows.length).toFixed(2)}%`
    : '—';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block">
              {dimType === 'AGENCY' ? 'Agency Wise Sauda Details Report' :
               dimType === 'BROKER' ? 'Broker Wise Sauda Details Report' :
               dimType === 'SUPPLIER' ? 'Supplier Wise Sauda Details Report' :
               dimType === 'AREA' ? 'Area Wise Sauda Details Report' :
               dimType === 'GRADE' ? 'Grade Wise Sauda Details Report' :
               'Sauda Details Report'}
            </span>
            <h2 className="text-lg font-black tracking-wide flex items-center gap-2 mt-0.5">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>
                {dimType === 'AGENCY' ? 'Agency Name' :
                 dimType === 'BROKER' ? 'Broker Name' :
                 dimType === 'SUPPLIER' ? 'Supplier Name' :
                 dimType === 'AREA' ? 'Area Name' :
                 dimType === 'GRADE' ? 'Grade Name' : 'Entity'}: {entityName}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title="Close Full-Screen View"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body / Table */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b select-none">
                  <th className="p-3.5 w-14 text-center">#</th>
                  <th className="p-3.5">
                    {dimType === 'AGENCY' ? 'Agency Name' :
                     dimType === 'BROKER' ? 'Broker Name' :
                     dimType === 'SUPPLIER' ? 'Supplier Name' :
                     dimType === 'AREA' ? 'Area Name' :
                     dimType === 'GRADE' ? 'Grade Name' : 'Agency Name'}
                  </th>
                  <th className="p-3.5">MR No</th>
                  <th className="p-3.5">PO No</th>
                  <th className="p-3.5 text-right" title="Moisture Sett (%) - claim_moisture from material_inspection">Moisture Sett (%)</th>
                  <th className="p-3.5 text-right" title="Dust Sett (%) - claim_dust from material_inspection">Dust Sett (%)</th>
                  <th className="p-3.5 text-right" title="Gradedown Sett (%) - claim_grade_down from material_inspection">Gradedown Sett (%)</th>
                  <th className="p-3.5 text-right" title="Weight Shortage/Excess in Rupees">Short / Excess (₹)</th>
                  <th className="p-3.5">Vehicle / Lorry No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400 font-sans font-bold">
                      No settlement or Sauda records found for {entityName}.
                    </td>
                  </tr>
                ) : (
                  details.map((item: any, idx: number) => {
                    const displayEntityName = dimType === 'AGENCY'
                      ? (item.agency && !isInvalidAgency(item.agency) ? item.agency : entityName)
                      : dimType === 'BROKER'
                      ? (item.broker || entityName)
                      : dimType === 'SUPPLIER'
                      ? (item.supplier || entityName)
                      : dimType === 'AREA'
                      ? (item.area || entityName)
                      : dimType === 'GRADE'
                      ? (item.grade || entityName)
                      : entityName;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900 font-sans">{displayEntityName}</td>
                        <td className="p-3.5 font-bold text-slate-800">{item.mr_no || '—'}</td>
                        <td className="p-3.5 font-bold text-slate-800">{item.po_no || '—'}</td>
                        <td className="p-3.5 text-right text-slate-700 font-semibold font-mono">
                          {formatSettVal(item.moist_sett, item.moist_claim)}
                        </td>
                        <td className="p-3.5 text-right text-slate-700 font-semibold font-mono">
                          {formatSettVal(item.dust_sett, item.dust_claim)}
                        </td>
                        <td className="p-3.5 text-right text-slate-700 font-semibold font-mono">
                          {formatSettVal(item.gd_sett, item.gd_claim)}
                        </td>
                        <td className="p-3.5 text-right text-slate-700 font-mono">
                          {item.val_ex_short ? `₹${Number(item.val_ex_short).toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3.5 text-slate-800">{item.lorry_number || item.vehicle_no || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {details.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-[11px]">
                    <td className="p-3.5 text-center font-mono">Total</td>
                    <td className="p-3.5 font-sans" colSpan={3}>Average of Non-Zero ({details.length} Records)</td>
                    <td className="p-3.5 text-right font-mono text-slate-800">{moistAvgStr}</td>
                    <td className="p-3.5 text-right font-mono text-slate-800">{dustAvgStr}</td>
                    <td className="p-3.5 text-right font-mono text-slate-800">{gdAvgStr}</td>
                    <td className="p-3.5 text-right font-mono text-slate-800">{totalShort !== 0 ? `₹${Math.round(totalShort).toLocaleString()}` : '—'}</td>
                    <td className="p-3.5 text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing all Sauda records for: <strong>{entityName}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};
