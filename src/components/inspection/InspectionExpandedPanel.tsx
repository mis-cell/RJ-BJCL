import React from "react";
import { Layers, Lock } from "lucide-react";
import { InspectionDetailRow, DetailFieldConfig } from "../../types/inspection.types";
import { isAutoBlocked, getFieldInputStyle } from "../../utils/inspectionCalculations";

interface InspectionExpandedPanelProps {
  row: InspectionDetailRow;
  index: number;
  configs: DetailFieldConfig[];
  onToggleExpand: (index: number) => void;
  onDetailChange: (index: number, field: keyof InspectionDetailRow, val: any) => void;
}

export const InspectionExpandedPanel: React.FC<InspectionExpandedPanelProps> = ({
  row,
  index,
  configs,
  onToggleExpand,
  onDetailChange,
}) => {
  return (
    <tr className="bg-slate-50 border-b-2 border-blue-200">
      <td colSpan={48} className="p-4">
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-inner">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
            <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Expanded Inspection Detail View for Row #{index + 1}
              {row.is_auto && (
                <span className="ml-2 inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-200">
                  <Lock className="w-2.5 h-2.5" /> Auto-populated data locked
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onToggleExpand(index)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
            >
              Close Panel ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {configs.map((cfg) => {
              const isBlocked = isAutoBlocked(row, cfg.name);
              return (
                <div key={cfg.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-600">{cfg.label}</label>
                    {isBlocked && (
                      <span className="text-[10px] text-blue-700 flex items-center gap-0.5 font-bold">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>
                  {cfg.type === "select" ? (
                    <select
                      disabled={isBlocked}
                      value={(row[cfg.name] as string) || "Yes"}
                      onChange={(e) => !isBlocked && onDetailChange(index, cfg.name, e.target.value)}
                      className={
                        isBlocked
                          ? "border border-blue-300 bg-blue-50/90 text-blue-950 font-bold rounded px-2.5 py-1.5 text-xs cursor-not-allowed"
                          : "border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium text-slate-900"
                      }
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  ) : (
                    <input
                      type={cfg.type}
                      step={cfg.type === "number" ? "0.01" : undefined}
                      readOnly={isBlocked}
                      tabIndex={isBlocked ? -1 : 0}
                      value={(row[cfg.name] as any) ?? ""}
                      onChange={(e) =>
                        !isBlocked &&
                        onDetailChange(
                          index,
                          cfg.name,
                          cfg.type === "number" ? Number(e.target.value) : e.target.value
                        )
                      }
                      className={getFieldInputStyle(isBlocked, "px-2.5 py-1.5")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
};
