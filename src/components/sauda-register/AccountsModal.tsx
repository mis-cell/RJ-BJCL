import React from 'react';
import { ChevronDown, Calculator, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Sauda } from '../../types';

export function Th({ label, className }: any) {
  return (
    <th className={cn("text-[9px] font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30 h-full px-2", className)}>
       <div className="flex items-center justify-center gap-1">
          {label}
          <ChevronDown className="h-2.5 w-2.5 text-gray-400" />
       </div>
    </th>
  );
}

interface AccountsModalProps {
  saudaList: Sauda[];
  poList: any[];
  arrivalsList: any[];
  onClose: () => void;
}

export function AccountsModal({ saudaList, poList, arrivalsList, onClose }: AccountsModalProps) {
  function matchPoNo(po1: string, po2: string) {
    if (!po1 || !po2) return false;
    const p1 = po1.trim().toLowerCase();
    const p2 = po2.trim().toLowerCase();
    if (p1 === p2) return true;
    const clean1 = p1.replace(/[^a-z0-9]/g, '');
    const clean2 = p2.replace(/[^a-z0-9]/g, '');
    if (clean1 && clean1 === clean2) return true;
    if (clean1.length > 5 && clean2.length > 5 && (clean1.includes(clean2) || clean2.includes(clean1))) return true;
    return false;
  }

  function getSaudaStatusAndWeight(s: Sauda) {
    const saudaPoDisplayNo = (s.sauda_no || '').replace(/[^0-9]/g, '');
    const matchedPos = poList.filter((p: any) => {
      const pNo = String(p.po_no || '');
      const cpNo = String(p.contract_po_no || '');
      return matchPoNo(String(s.sauda_no || ''), pNo) || matchPoNo(String(s.sauda_no || ''), cpNo) || 
             matchPoNo(saudaPoDisplayNo, pNo) || matchPoNo(saudaPoDisplayNo, cpNo);
    });

    let totalContractMt = 0;
    let totalReceivedMt = 0;
    let anyPoIsPending = false;

    matchedPos.forEach((p: any) => {
      const contractWeight = parseFloat(p.total_contract_mt) || 0;
      totalContractMt += contractWeight;
      const matchingArrivals = arrivalsList.filter((ar: any) => matchPoNo(p.po_no, ar.po_no) || matchPoNo(p.contract_po_no, ar.po_no));
      const poReceived = matchingArrivals.reduce((sum: number, ar: any) => sum + (Number(ar.weight_qtl || ar.weight || 0) / 10), 0);
      totalReceivedMt += poReceived;
      const isDbCompleted = p.pending === false || p.pending === 'No' || String(p.pending).toLowerCase() === 'false' || p.pending === 0;
      const isWeightCompleted = contractWeight > 0 && poReceived >= (contractWeight - 0.01);
      if (!(isDbCompleted || isWeightCompleted)) {
        anyPoIsPending = true;
      }
    });

    if (matchedPos.length === 0) {
      const isDbCompleted = s.status === 'completed';
      return { status: isDbCompleted ? 'completed' : 'pending', receivedWeight: 0, contractWeight: Number(s.total_wt_in_ton) || 0 };
    }

    const isCompleted = !anyPoIsPending;
    const isPartial = !isCompleted && totalReceivedMt > 0;
    return {
      status: isCompleted ? 'completed' : (isPartial ? 'partial' : 'pending'),
      receivedWeight: totalReceivedMt,
      contractWeight: totalContractMt
    };
  }

  const ledgerData = saudaList.map((s: Sauda) => {
    const { status, receivedWeight, contractWeight } = getSaudaStatusAndWeight(s);
    const b_rate = Number(s.b_rate) || 0;
    const total_wt = Number(s.total_wt_in_ton) || 0;
    let pendingWt = total_wt - receivedWeight;
    if (pendingWt < 0) pendingWt = 0;
    if (status === 'completed') pendingWt = 0;
    const pendingValue = pendingWt * b_rate;
    return { ...s, status, receivedWeight, pendingWt, pendingValue };
  }).filter((s: any) => s.pendingWt > 0.01)
  .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const totalPendingWt = ledgerData.reduce((acc: number, s: any) => acc + s.pendingWt, 0);
  const totalPendingValue = ledgerData.reduce((acc: number, s: any) => acc + s.pendingValue, 0);

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#ece9d8] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-white border-r-gray-800 border-b-gray-800 rounded-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-2 flex justify-between items-center shrink-0 shadow-sm border-b border-gray-400">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-white drop-shadow" />
            <h2 className="text-white font-bold text-sm uppercase tracking-wider drop-shadow-md">Accounts / Pending Sauda Ledger</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded active:bg-black/20 transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="bg-[#f0ece1] p-3 flex flex-wrap gap-2.5 sm:gap-4 shrink-0 border-b border-gray-400">
          <div className="bg-white px-4 py-2 border border-gray-400 shadow-sm min-w-0 sm:min-w-[140px] flex-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Pending Saudas</p>
            <p className="text-lg font-black text-blue-900">{ledgerData.length}</p>
          </div>
          <div className="bg-white px-4 py-2 border border-gray-400 shadow-sm min-w-0 sm:min-w-[140px] flex-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Pending Quantity</p>
            <p className="text-lg font-black text-orange-700">{totalPendingWt.toFixed(3)} Ton</p>
          </div>
          <div className="bg-white px-4 py-2 border border-gray-400 shadow-sm min-w-0 sm:min-w-[180px] flex-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Pending Value</p>
            <p className="text-lg font-black text-green-800">Rs. {totalPendingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-gray-50 p-3">
          <table className="w-full border-collapse text-[10px] bg-white border border-gray-400 shadow-sm">
            <thead className="bg-[#FBCFCB] sticky top-0 z-10">
              <tr className="border-b border-gray-400 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] h-8">
                <th className="text-left px-2 font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30">Date</th>
                <th className="text-left px-2 font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30">Sauda No</th>
                <th className="text-left px-2 font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30">Supplier</th>
                <th className="text-left px-2 font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30">Broker</th>
                <th className="text-right px-2 font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30 bg-blue-50/50">B. Rate</th>
                <th className="text-right px-2 font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30">Total Wt</th>
                <th className="text-right px-2 font-bold uppercase tracking-tight text-gray-600 border-r border-[#808080]/30">Recv. Wt</th>
                <th className="text-right px-2 font-bold uppercase tracking-tight text-orange-700 border-r border-[#808080]/30 bg-orange-50">Pending Wt</th>
                <th className="text-right px-2 font-bold uppercase tracking-tight text-green-800 bg-green-50">Pending Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ledgerData.map((s: any, i: number) => (
                <tr key={s.sauda_id || i} className="hover:bg-[#ffffd0] transition-colors h-7">
                  <td className="px-2 text-gray-700">{s.date ? new Date(s.date).toLocaleDateString('en-GB') : '-'}</td>
                  <td className="px-2 font-bold text-indigo-900">{s.sauda_no}</td>
                  <td className="px-2 truncate max-w-[150px]">{s.supplier}</td>
                  <td className="px-2 truncate max-w-[120px]">{s.broker}</td>
                  <td className="px-2 text-right font-mono bg-blue-50/30">₹{Number(s.b_rate || 0).toLocaleString()}</td>
                  <td className="px-2 text-right font-mono text-gray-600">{Number(s.total_wt_in_ton || 0).toFixed(3)}</td>
                  <td className="px-2 text-right font-mono text-gray-500">{s.receivedWeight.toFixed(3)}</td>
                  <td className="px-2 text-right font-mono font-bold text-orange-700 bg-orange-50/50">{s.pendingWt.toFixed(3)}</td>
                  <td className="px-2 text-right font-mono font-bold text-green-800 bg-green-50/50">
                    ₹{s.pendingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {ledgerData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 font-medium">
                    No pending saudas found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
