import React from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SectionComparison } from './poHistogramTypes';

export interface PoComparisonTabViewProps {
  linkedMrs: string[];
  selectedMrTab: string;
  setSelectedMrTab: (mr: string) => void;
  sections: SectionComparison[];
  collapsedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
}

export const PoComparisonTabView: React.FC<PoComparisonTabViewProps> = ({
  linkedMrs,
  selectedMrTab,
  setSelectedMrTab,
  sections,
  collapsedSections,
  toggleSection,
}) => {
  return (
    <div className="space-y-4">
      {/* Multi-MR Filter Pills */}
      {linkedMrs.length > 1 && (
        <div className="bg-white border border-[#FBCFCB] rounded-xl p-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#D94B5A] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>Compare By M.R.:</span>
          </span>
          <button
            onClick={() => setSelectedMrTab('all')}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              selectedMrTab === 'all'
                ? "bg-[#D94B5A] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            All M.R.s Combined ({linkedMrs.length})
          </button>
          {linkedMrs.map((mr) => (
            <button
              key={mr}
              onClick={() => setSelectedMrTab(mr)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1",
                selectedMrTab === mr
                  ? "bg-[#D94B5A] text-white shadow-xs"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              )}
            >
              <span>{mr}</span>
            </button>
          ))}
        </div>
      )}

      {/* INDIVIDUAL SECTION-BY-SECTION COMPARISON CARDS */}
      {sections.map((section) => {
        const isCollapsed = Boolean(collapsedSections[section.id]);
        const IconComponent = section.icon;

        return (
          <div
            key={section.id}
            id={`section-${section.id}`}
            className={cn(
              "bg-white border-2 rounded-2xl shadow-xs transition-all overflow-hidden",
              section.mismatchCount > 0
                ? "border-rose-300 ring-2 ring-rose-500/10"
                : "border-[#FBCFCB]"
            )}
          >
            {/* Section Header */}
            <div
              onClick={() => toggleSection(section.id)}
              className={cn(
                "p-3.5 flex items-center justify-between cursor-pointer select-none transition-colors",
                section.mismatchCount > 0
                  ? "bg-rose-50/70 hover:bg-rose-50"
                  : "bg-[#FDE7E6] hover:bg-[#F5EFE0]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "p-2 rounded-xl text-white shadow-2xs",
                    section.mismatchCount > 0 ? "bg-rose-700" : "bg-[#F7AFA8]"
                  )}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-serif font-black text-[#D94B5A]">
                      {section.title}
                    </h3>
                    {section.mismatchCount > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-extrabold flex items-center gap-1 shadow-xs animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{section.mismatchCount} Mismatch(es)</span>
                      </span>
                    ) : section.status === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                        Pending Stage
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>100% Match</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1 rounded-lg text-slate-500 hover:bg-white/60 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Section Body (Field Comparison Table) */}
            {!isCollapsed && (
              <div className="p-3 sm:p-4 border-t border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FDE7E6] border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-2 px-3 text-left border-r border-slate-200">
                          Field Parameter
                        </th>
                        <th className="py-2 px-3 text-left border-r border-slate-200">
                          Sauda / Reference Value
                        </th>
                        <th className="py-2 px-3 text-left border-r border-slate-200">
                          Actual Recorded Value
                        </th>
                        <th className="py-2 px-3 text-left border-r border-slate-200">
                          Variance / Notes
                        </th>
                        <th className="py-2 px-3 text-center">Comparison Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {section.fields.map((field, fIdx) => (
                        <tr
                          key={fIdx}
                          className={cn(
                            "transition-colors",
                            field.status === 'mismatch'
                              ? "bg-rose-50/60 font-semibold"
                              : fIdx % 2 === 0
                              ? "bg-white"
                              : "bg-slate-50/30"
                          )}
                        >
                          {/* Field Name */}
                          <td className="py-2.5 px-3 font-bold text-[#D94B5A] border-r border-slate-200/60">
                            <div className="flex items-center gap-1.5">
                              {field.isCritical && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"
                                  title="Critical Business Field"
                                />
                              )}
                              <span>{field.name}</span>
                            </div>
                          </td>

                          {/* Reference Value */}
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700 border-r border-slate-200/60">
                            {String(field.referenceValue)}
                          </td>

                          {/* Actual Value */}
                          <td
                            className={cn(
                              "py-2.5 px-3 font-mono border-r border-slate-200/60",
                              field.status === 'mismatch'
                                ? "text-rose-700 font-extrabold"
                                : "text-slate-800 font-medium"
                            )}
                          >
                            {String(field.actualValue)}
                          </td>

                          {/* Variance / Notes */}
                          <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200/60 text-[11px]">
                            {field.variance && (
                              <span
                                className={cn(
                                  "font-mono font-bold mr-1.5",
                                  field.status === 'mismatch'
                                    ? "text-rose-700"
                                    : "text-slate-700"
                                )}
                              >
                                [{field.variance}]
                              </span>
                            )}
                            <span className="italic">{field.notes || '—'}</span>
                          </td>

                          {/* Status Result Badge */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {field.status === 'match' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>✓ Match</span>
                              </span>
                            ) : field.status === 'mismatch' ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black inline-flex items-center gap-1 shadow-2xs animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>⚠ Mismatch</span>
                              </span>
                            ) : field.status === 'not_available' ? (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-medium">
                                — Not Available
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[10px]">
                                N/A
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
