import React from 'react';

export interface StockCountersRibbonProps {
  totalOpeningQty: number;
  totalOpeningWt: number;
  openingStockDateInfo: string;
  totalIssuedToGodownBales: number;
  totalIssuedToGodownWeight: number;
  issuedToGodownDateInfo: string;
  totalIssuedToFactoryBales: number;
  totalIssuedToFactoryWeight: number;
  issuedToFactoryDateInfo: string;
  currentClosingStockBales: number;
  currentClosingStockWeight: number;
  currentStockBalanceDateInfo: string;
}

export const StockCountersRibbon: React.FC<StockCountersRibbonProps> = ({
  totalOpeningQty,
  totalOpeningWt,
  openingStockDateInfo,
  totalIssuedToGodownBales,
  totalIssuedToGodownWeight,
  issuedToGodownDateInfo,
  totalIssuedToFactoryBales,
  totalIssuedToFactoryWeight,
  issuedToFactoryDateInfo,
  currentClosingStockBales,
  currentClosingStockWeight,
  currentStockBalanceDateInfo
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
      {/* Opening Stock */}
      <div className="relative bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />

        <div className="flex items-center justify-between gap-2 pl-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 truncate">
              Total Opening Stock
            </p>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-800">
                {totalOpeningQty}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400">
                Bales
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase">
              Weight
            </p>
            <p className="text-sm font-black text-blue-700">
              {totalOpeningWt?.toFixed(3)}
            </p>
            <span className="text-[8px] font-bold text-slate-400">
              M.T.
            </span>
          </div>
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
          <span className="text-[8px] font-semibold text-slate-400">
            {openingStockDateInfo}
          </span>
        </div>
      </div>

      {/* Issued to Godown */}
      <div className="relative bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />

        <div className="flex items-center justify-between gap-2 pl-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 truncate">
              Issued to Godown (+)
            </p>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-800">
                {totalIssuedToGodownBales}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400">
                Bales
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase">
              Weight
            </p>
            <p className="text-sm font-black text-emerald-700">
              {totalIssuedToGodownWeight?.toFixed(3)}
            </p>
            <span className="text-[8px] font-bold text-slate-400">
              M.T.
            </span>
          </div>
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
          <span className="text-[8px] font-semibold text-slate-400">
            {issuedToGodownDateInfo}
          </span>
        </div>
      </div>

      {/* Godown to Factory */}
      <div className="relative bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />

        <div className="flex items-center justify-between gap-2 pl-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 truncate">
              Godown to Factory (-)
            </p>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-800">
                {totalIssuedToFactoryBales}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400">
                Bales
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase">
              Weight
            </p>
            <p className="text-sm font-black text-amber-700">
              {totalIssuedToFactoryWeight?.toFixed(3)}
            </p>
            <span className="text-[8px] font-bold text-slate-400">
              M.T.
            </span>
          </div>
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
          <span className="text-[8px] font-semibold text-slate-400">
            {issuedToFactoryDateInfo}
          </span>
        </div>
      </div>

      {/* Current Stock */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />

        <div className="flex items-center justify-between gap-2 pl-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 truncate">
              Current Stock Balance
            </p>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-white">
                {currentClosingStockBales}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400">
                Bales
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold text-slate-500 uppercase">
              Weight
            </p>
            <p className="text-sm font-black text-cyan-400">
              {currentClosingStockWeight?.toFixed(3)}
            </p>
            <span className="text-[8px] font-bold text-slate-500">
              M.T.
            </span>
          </div>
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-white/10">
          <span className="text-[8px] font-semibold text-slate-500">
            {currentStockBalanceDateInfo}
          </span>
        </div>
      </div>
    </div>
  );
};
