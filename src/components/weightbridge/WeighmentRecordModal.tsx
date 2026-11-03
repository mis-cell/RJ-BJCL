import React from "react";
import { Scale, X } from "lucide-react";

export interface LorryWeighmentRecord {
  ticket_number: string;
  lorry_number: string;
  party_name?: string;
  mokam?: string;
  unit?: string;
  marka?: string;
  grade?: string;
  stage1_gross_weight?: number | null;
  stage1_tare_weight?: number | null;
  stage1_net_weight?: number | null;
  stage2_gross_weight?: number | null;
  stage2_tare_weight?: number | null;
  stage2_net_weight?: number | null;
  stage3_gross_weight?: number | null;
  stage3_tare_weight?: number | null;
  stage3_net_weight?: number | null;
  final_weight?: number | null;
}

export interface WeighmentRecordModalProps {
  record: LorryWeighmentRecord | null;
  onClose: () => void;
}

export const WeighmentRecordModal: React.FC<WeighmentRecordModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-slate-300 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-sky-700" />
            <div>
              <h3 className="font-extrabold text-slate-900 uppercase text-sm">
                Ticket #{record.ticket_number} - Full Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Lorry: {record.lorry_number} | Party: {record.party_name || "N/A"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* General Attributes */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Mokam</span>
            <strong className="text-slate-800">{record.mokam || "N/A"}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Unit</span>
            <strong className="text-slate-800">{record.unit || "N/A"}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Marka</span>
            <strong className="text-slate-800">{record.marka || "N/A"}</strong>
          </div>
          <div className="col-span-3">
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Grades Summary</span>
            <strong className="text-slate-900">{record.grade || "N/A"}</strong>
          </div>
        </div>

        {/* 3 Stages Comparison Grid */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-xs uppercase text-slate-700 border-b border-slate-200 pb-1">
            Weighment Stage Comparative Analysis
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Stage 1 */}
            <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg space-y-1">
              <h5 className="font-black text-sky-900 uppercase border-b border-sky-200 pb-1 text-[11px]">
                1. Party Scale
              </h5>
              <div>
                Gross:{" "}
                <strong>
                  {record.stage1_gross_weight !== null && record.stage1_gross_weight !== undefined
                    ? Number(record.stage1_gross_weight).toFixed(2)
                    : "-"}{" "}
                  KG
                </strong>
              </div>
              <div>
                Tare:{" "}
                <strong>
                  {record.stage1_tare_weight !== null && record.stage1_tare_weight !== undefined
                    ? Number(record.stage1_tare_weight).toFixed(2)
                    : "-"}{" "}
                  KG
                </strong>
              </div>
              <div className="text-sky-950 font-black pt-1 border-t border-sky-200">
                Net:{" "}
                {record.stage1_net_weight !== null && record.stage1_net_weight !== undefined
                  ? Number(record.stage1_net_weight).toFixed(2)
                  : "-"}{" "}
                KG
              </div>
            </div>

            {/* Stage 2 */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-1">
              <h5 className="font-black text-amber-900 uppercase border-b border-amber-200 pb-1 text-[11px]">
                2. Mill Scale
              </h5>
              <div>
                Gross:{" "}
                <strong>
                  {record.stage2_gross_weight !== null && record.stage2_gross_weight !== undefined
                    ? Number(record.stage2_gross_weight).toFixed(2)
                    : "-"}{" "}
                  KG
                </strong>
              </div>
              <div>
                Tare:{" "}
                <strong>
                  {record.stage2_tare_weight !== null && record.stage2_tare_weight !== undefined
                    ? Number(record.stage2_tare_weight).toFixed(2)
                    : "-"}{" "}
                  KG
                </strong>
              </div>
              <div className="text-amber-950 font-black pt-1 border-t border-amber-200">
                Net:{" "}
                {record.stage2_net_weight !== null && record.stage2_net_weight !== undefined
                  ? Number(record.stage2_net_weight).toFixed(2)
                  : "-"}{" "}
                KG
              </div>
            </div>

            {/* Stage 3 */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg space-y-1">
              <h5 className="font-black text-emerald-900 uppercase border-b border-emerald-200 pb-1 text-[11px]">
                3. Electronic Scale
              </h5>
              <div>
                Gross:{" "}
                <strong>
                  {record.stage3_gross_weight !== null && record.stage3_gross_weight !== undefined
                    ? Number(record.stage3_gross_weight).toFixed(2)
                    : "-"}{" "}
                  KG
                </strong>
              </div>
              <div>
                Tare:{" "}
                <strong>
                  {record.stage3_tare_weight !== null && record.stage3_tare_weight !== undefined
                    ? Number(record.stage3_tare_weight).toFixed(2)
                    : "-"}{" "}
                  KG
                </strong>
              </div>
              <div className="text-emerald-950 font-black pt-1 border-t border-emerald-200">
                Net:{" "}
                {record.stage3_net_weight !== null && record.stage3_net_weight !== undefined
                  ? Number(record.stage3_net_weight).toFixed(2)
                  : "-"}{" "}
                KG
              </div>
            </div>
          </div>
        </div>

        {/* Final Weight Result */}
        {record.final_weight !== null && record.final_weight !== undefined && (
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-emerald-400 text-xs font-black uppercase block">
                Final Approved Accepted Weight
              </span>
              <span className="text-[10px] text-slate-400">Lowest Net Weight of 3 Stages</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-300">
                {Number(record.final_weight).toFixed(2)} KG
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-900 cursor-pointer text-xs uppercase"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};
