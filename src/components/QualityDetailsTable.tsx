import React, { useMemo } from 'react';
import { Settings, Plus, Trash2, Layers, CheckCircle2, XCircle, Edit3, ArrowRight } from 'lucide-react';
import SectionHeader from './SectionHeader';
import SearchableSelect from './SearchableSelect';
import SearchableMultiSelect from './SearchableMultiSelect';

export interface ApplicableCombination {
  id?: string;
  agency: string;
  marka: string;
  quality: string;
  rs: number;
  qty?: number;
  enabled?: boolean;
}

interface QualityDetailsTableProps {
  qualityDetails: any[];
  onQualityChange: (index: number, field: string, value: any) => void;
  onAddRow: () => void;
  onDeleteRow: () => void;
  onRemoveRowAt: (index: number) => void;
  grades: any[];
  agencies: any[];
  markas: any[];
  formDataArea?: string;
  isUser010?: boolean;
}

export const QualityDetailsTable: React.FC<QualityDetailsTableProps> = ({
  qualityDetails,
  onQualityChange,
  onAddRow,
  onDeleteRow,
  onRemoveRowAt,
  grades,
  agencies,
  markas,
  formDataArea,
  isUser010 = false
}) => {
  // Format options lists
  const gradeOptions = useMemo(() => {
    const list: string[] = [];
    [...grades]
      .sort((a, b) => (a.grade_name || a.grade_code || "").localeCompare(b.grade_name || b.grade_code || ""))
      .forEach(g => {
        const val = g.grade_name || g.grade_code || g.name || '';
        if (val && !list.includes(val)) list.push(val);
      });
    return list;
  }, [grades]);

  const agencyOptions = useMemo(() => {
    if (!agencies || agencies.length === 0) return [];

    const list: string[] = [];
    const seenNames = new Set<string>();

    agencies.forEach(a => {
      const name = String(
        a.AGENCY_NAME || a.agency_name || a.name || a.label || (typeof a === 'string' ? a : '')
      ).trim();
      if (!name) return;

      const norm = name.toUpperCase();
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        list.push(name);
      }
    });

    return list.sort((a, b) => a.localeCompare(b));
  }, [agencies]);

  const markaOptions = useMemo(() => {
    const list: string[] = [];
    [...markas]
      .sort((a, b) => (a.marka_name || a.name || "").localeCompare(b.marka_name || b.name || ""))
      .forEach(m => {
        const val = m.marka_name || m.name || (typeof m === 'string' ? m : '');
        if (val && !list.includes(val)) list.push(val);
      });
    return list;
  }, [markas]);

  // Compute all active combinations across all rows for the master table
  const allCombinations = useMemo(() => {
    const results: Array<{
      rowIndex: number;
      combIndex: number;
      quality: string;
      agency: string;
      marka: string;
      rs: number;
      qty: number;
      enabled: boolean;
    }> = [];

    qualityDetails.forEach((row, rIdx) => {
      const q = String(row.quality || '').trim();
      const defaultRs = Number(row.rs) || 0;
      const defaultQty = Number(row.qty) || 0;

      const rowAgencies: string[] = (
        Array.isArray(row.agencies) && row.agencies.length > 0
          ? row.agencies
          : (row.agency ? [row.agency] : [])
      ).map((a: string) => String(a || '').trim()).filter(Boolean);

      const rowMarkas: string[] = (
        Array.isArray(row.markas) && row.markas.length > 0
          ? row.markas
          : (row.marka ? [row.marka] : [])
      ).map((m: string) => String(m || '').trim()).filter(Boolean);

      // Check if user has customized combinations in applicableCombinations
      const appCombs: ApplicableCombination[] = Array.isArray(row.applicableCombinations)
        ? row.applicableCombinations
        : [];

      // If user has specific applicable combinations stored
      if (appCombs.length > 0) {
        appCombs.forEach((c, cIdx) => {
          results.push({
            rowIndex: rIdx,
            combIndex: cIdx,
            quality: c.quality || q,
            agency: c.agency,
            marka: c.marka,
            rs: Number(c.rs) || defaultRs,
            qty: Number(c.qty) || defaultQty,
            enabled: c.enabled !== false
          });
        });
      } else if (rowAgencies.length > 0 && rowMarkas.length > 0) {
        // Generate cross-product of agencies x markas
        let cIdx = 0;
        rowAgencies.forEach(ag => {
          rowMarkas.forEach(mk => {
            results.push({
              rowIndex: rIdx,
              combIndex: cIdx++,
              quality: q,
              agency: ag,
              marka: mk,
              rs: defaultRs,
              qty: defaultQty,
              enabled: true
            });
          });
        });
      } else if (rowAgencies.length > 0) {
        rowAgencies.forEach((ag, cIdx) => {
          results.push({
            rowIndex: rIdx,
            combIndex: cIdx,
            quality: q,
            agency: ag,
            marka: String(row.marka || '-').trim(),
            rs: defaultRs,
            qty: defaultQty,
            enabled: true
          });
        });
      } else if (rowMarkas.length > 0) {
        rowMarkas.forEach((mk, cIdx) => {
          results.push({
            rowIndex: rIdx,
            combIndex: cIdx,
            quality: q,
            agency: String(row.agency || '-').trim(),
            marka: mk,
            rs: defaultRs,
            qty: defaultQty,
            enabled: true
          });
        });
      } else if (q || defaultRs > 0 || row.agency || row.marka) {
        results.push({
          rowIndex: rIdx,
          combIndex: 0,
          quality: q,
          agency: String(row.agency || '-').trim(),
          marka: String(row.marka || '-').trim(),
          rs: defaultRs,
          qty: defaultQty,
          enabled: true
        });
      }
    });

    return results;
  }, [qualityDetails]);

  // Handler to toggle an individual combination's applicability
  const handleToggleCombination = (rowIndex: number, agency: string, marka: string, currentEnabled: boolean) => {
    const row = qualityDetails[rowIndex];
    if (!row) return;

    // Build current list of applicable combinations
    let appCombs: ApplicableCombination[] = Array.isArray(row.applicableCombinations)
      ? [...row.applicableCombinations]
      : [];

    if (appCombs.length === 0) {
      // Initialize from current agencies x markas
      const rowAgencies: string[] = (
        Array.isArray(row.agencies) && row.agencies.length > 0
          ? row.agencies
          : (row.agency ? [row.agency] : [''])
      ).filter(Boolean);

      const rowMarkas: string[] = (
        Array.isArray(row.markas) && row.markas.length > 0
          ? row.markas
          : (row.marka ? [row.marka] : [''])
      ).filter(Boolean);

      rowAgencies.forEach(ag => {
        rowMarkas.forEach(mk => {
          appCombs.push({
            agency: ag,
            marka: mk,
            quality: row.quality || '',
            rs: Number(row.rs) || 0,
            qty: Number(row.qty) || 0,
            enabled: true
          });
        });
      });
    }

    const target = appCombs.find(
      c => c.agency.toUpperCase() === agency.toUpperCase() && c.marka.toUpperCase() === marka.toUpperCase()
    );

    if (target) {
      target.enabled = !currentEnabled;
    } else {
      appCombs.push({
        agency,
        marka,
        quality: row.quality || '',
        rs: Number(row.rs) || 0,
        qty: Number(row.qty) || 0,
        enabled: !currentEnabled
      });
    }

    onQualityChange(rowIndex, 'applicableCombinations', appCombs);
  };

  // Handler to delete a specific combination from the row
  const handleDeleteCombination = (rowIndex: number, agency: string, marka: string) => {
    handleToggleCombination(rowIndex, agency, marka, true); // disable it
  };

  // Handler to update rate for a specific combination
  const handleUpdateCombinationRate = (rowIndex: number, agency: string, marka: string, newRate: number) => {
    const row = qualityDetails[rowIndex];
    if (!row) return;

    let appCombs: ApplicableCombination[] = Array.isArray(row.applicableCombinations)
      ? [...row.applicableCombinations]
      : [];

    if (appCombs.length === 0) {
      const rowAgencies: string[] = (
        Array.isArray(row.agencies) && row.agencies.length > 0
          ? row.agencies
          : (row.agency ? [row.agency] : [''])
      ).filter(Boolean);

      const rowMarkas: string[] = (
        Array.isArray(row.markas) && row.markas.length > 0
          ? row.markas
          : (row.marka ? [row.marka] : [''])
      ).filter(Boolean);

      rowAgencies.forEach(ag => {
        rowMarkas.forEach(mk => {
          appCombs.push({
            agency: ag,
            marka: mk,
            quality: row.quality || '',
            rs: Number(row.rs) || 0,
            qty: Number(row.qty) || 0,
            enabled: true
          });
        });
      });
    }

    const target = appCombs.find(
      c => c.agency.toUpperCase() === agency.toUpperCase() && c.marka.toUpperCase() === marka.toUpperCase()
    );

    if (target) {
      target.rs = newRate;
    } else {
      appCombs.push({
        agency,
        marka,
        quality: row.quality || '',
        rs: newRate,
        qty: Number(row.qty) || 0,
        enabled: true
      });
    }

    onQualityChange(rowIndex, 'applicableCombinations', appCombs);
  };

  return (
    <div className="bg-white rounded-[18px] p-4 sm:p-5 shadow-md border border-[#D8D3C5] hover:border-[#F7AFA8]/40 hover:shadow-lg transition-all w-full max-w-full min-w-0">
      <SectionHeader
        icon={Settings}
        title="Quality Details"
        rightAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddRow}
              className="bg-[#F7AFA8] hover:bg-[#113A21] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Add another Quality configuration row"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={onDeleteRow}
              className="border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Remove last row"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Row</span>
            </button>
          </div>
        }
      />

      {/* Main Rows Setup Table */}
      <div className="rounded-xl border border-[#E0DBCF] shadow-2xs bg-white mb-5 w-full overflow-visible relative z-10">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 z-20 shadow-2xs">
            <tr className="bg-[#EDF4EF] text-[#D94B5A] font-bold text-xs uppercase border-b border-[#D8E4DC]">
              <th className="px-3 py-2.5 w-[31%] bg-[#EDF4EF] rounded-tl-xl">
                Agency <span className="text-[10px] text-emerald-700 font-semibold normal-case">(Multiple Select)</span>
              </th>
              <th className="px-3 py-2.5 w-[31%] bg-[#EDF4EF]">
                Marka <span className="text-[10px] text-emerald-700 font-semibold normal-case">(Multiple Select)</span>
              </th>
              <th className="px-3 py-2.5 w-[21%] bg-[#EDF4EF]">
                Quality <span className="text-rose-600 font-black">*</span>
              </th>
              <th className="px-3 py-2.5 w-[13%] text-right bg-[#EDF4EF]">
                Rs. <span className="text-rose-600 font-black">*</span>
              </th>
              <th className="px-1 py-2.5 w-[4%] text-center bg-[#EDF4EF] rounded-tr-xl"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE6DD] text-xs">
            {qualityDetails.map((qd, i) => {
              const currentAgencies = Array.isArray(qd.agencies) && qd.agencies.length > 0
                ? qd.agencies
                : (qd.agency ? [qd.agency] : []);

              const currentMarkas = Array.isArray(qd.markas) && qd.markas.length > 0
                ? qd.markas
                : (qd.marka ? [qd.marka] : []);

              // Get row's applicable combinations
              const rowCombs = allCombinations.filter(c => c.rowIndex === i);

              // Disallow duplicate Quality selection: filter out qualities selected in other rows
              const otherRowQualities = new Set(
                qualityDetails
                  .filter((_, idx) => idx !== i)
                  .map(r => String(r.quality || '').trim().toUpperCase())
                  .filter(Boolean)
              );
              const availableGradeOptions = gradeOptions.filter(g => {
                const norm = String(g).trim().toUpperCase();
                return norm === String(qd.quality || '').trim().toUpperCase() || !otherRowQualities.has(norm);
              });

              return (
                <React.Fragment key={i}>
                  <tr 
                    style={{ zIndex: Math.max(10, 80 - i * 5) }}
                    className="hover:bg-[#F9F8F5] transition-colors relative focus-within:z-[90]"
                  >
                        {/* Agency - SEARCHABLE MULTI-SELECT */}
                        <td className="p-2.5 align-top">
                          <SearchableMultiSelect
                            id={`agency_${i}`}
                            name="agency"
                            selectedValues={currentAgencies}
                            onChange={(vals) => onQualityChange(i, 'agencies', vals)}
                            options={agencyOptions}
                            placeholder={
                              !formDataArea || !formDataArea.trim()
                                ? "Select Area first..."
                                : agencyOptions.length === 0
                                ? "No Agency Found for Selected Area"
                                : "Select / search Agencies..."
                            }
                            allowCustomInput={false}
                            disabled={!formDataArea || !formDataArea.trim() || agencyOptions.length === 0}
                            badgeTheme="emerald"
                          />
                        </td>

                        {/* Marka - SEARCHABLE MULTI-SELECT */}
                        <td className="p-2.5 align-top">
                          <SearchableMultiSelect
                            id={`marka_${i}`}
                            name="marka"
                            selectedValues={currentMarkas}
                            onChange={(vals) => onQualityChange(i, 'markas', vals)}
                            options={markaOptions}
                            placeholder="Select / search Markas..."
                            allowCustomInput={false}
                            badgeTheme="amber"
                          />
                        </td>

                        {/* Quality - SEARCHABLE SELECT */}
                        <td className="p-2.5 align-top">
                          <SearchableSelect
                            id={`qd_quality_${i}`}
                            name="qd_quality"
                            value={qd.quality || ''}
                            onChange={(val) => onQualityChange(i, 'quality', val)}
                            options={availableGradeOptions}
                            placeholder="--Select Quality *--"
                            isRequired={true}
                            compact={true}
                          />
                        </td>

                      {/* Rs. / Rate */}
                      <td className="p-2.5 align-top">
                        <input
                          id={`rs_${i}`}
                          name="rs"
                          aria-label="Rs."
                          type="number"
                          step="0.01"
                          required={!isUser010}
                          value={qd.rs ? qd.rs : ''}
                          onChange={(e) => onQualityChange(i, 'rs', e.target.value)}
                          placeholder={isUser010 ? "Rs." : "Rs. *"}
                          className={`w-full rounded-lg px-2.5 py-2 text-xs font-bold text-right outline-none transition-all font-mono ${
                            isUser010
                              ? "bg-white border border-[#FBCFCB] text-slate-800 focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                              : "bg-[#FDE7E6] border-2 border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-slate-900 font-black"
                          }`}
                        />
                      </td>

                      {/* Action Delete Row */}
                      <td className="p-2.5 align-top text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveRowAt(i)}
                          title="Delete row"
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
      </div>

      {/* Generated Combinations Breakdown Matrix */}
      {allCombinations.length > 0 && (
        <div className=" hidden bg-[#F8FAF8] rounded-xl border border-[#D5E5D9] p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#E1EFE4]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#F7AFA8] text-amber-300 flex items-center justify-center font-bold text-xs shadow-2xs">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#D94B5A] tracking-wide uppercase">
                  Active Combinations Matrix ({allCombinations.length})
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Automatically generated from selected Agencies, Markas &amp; Quality Grades
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-2 py-0.5 rounded-md">
              {allCombinations.length} Active {allCombinations.length === 1 ? 'Pair' : 'Pairs'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {allCombinations.map((comb, idx) => (
              <div 
                key={idx}
                className="bg-white border border-[#DCE8DF] rounded-lg p-2.5 flex items-center justify-between text-xs shadow-2xs hover:border-[#F7AFA8]/50 transition-all"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-emerald-950 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px] truncate max-w-[120px]" title={`Agency: ${comb.agency}`}>
                      {comb.agency || 'ANY AGENCY'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-extrabold text-amber-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] truncate max-w-[120px]" title={`Marka: ${comb.marka}`}>
                      {comb.marka || 'ANY MARKA'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium">
                    <span>Quality Grade:</span>
                    <strong className="font-bold text-slate-800">{comb.quality || 'TD5'}</strong>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-mono font-black text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                    ₹{comb.rs.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityDetailsTable;
