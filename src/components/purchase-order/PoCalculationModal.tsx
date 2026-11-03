import React, { useState, useEffect } from 'react';
import { X, Check, Calculator } from 'lucide-react';
import { PoCalcData } from '../../types/purchaseOrder';

export interface PoCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (appliedData?: {
    total_lorries: string;
    units_per_lorry: string;
    total_units: string;
    weight_per_lorry: string;
    purchase_unit_name: string;
    weight_unit_kgs: string;
  }) => void;
  calcData: PoCalcData;
  setCalcData: React.Dispatch<React.SetStateAction<PoCalcData>>;
  isPtf: boolean;
  purchaseUnitName: string;
  unitList?: string[];
  weightUnitKgs?: string;
  onUnitTypeChange?: (unitName: string, unitWeightKgs: string) => void;
}

/**
 * Normalizes Unit Types according to standard Jute Mill classifications:
 * - DRUMS: Calculated using custom/50kg weight per unit
 * - BALES / BELL: Calculated using fixed 147.5 kg per bale
 * - LOOSE, P. BALES, H. BALES: Non-calculated (blank unit counts)
 */
export function normalizeUnitType(name: string): 'DRUMS' | 'BALES' | 'LOOSE' | 'P. BALES' | 'H. BALES' | 'OTHER' {
  if (!name) return 'BALES';
  const clean = name.trim().toUpperCase().replace(/[\s_.-]/g, '');
  if (clean === 'DRUMS' || clean === 'DRUM' || clean === 'DR') return 'DRUMS';
  if (clean === 'PBALES' || clean === 'PBALE' || clean === 'PB') return 'P. BALES';
  if (clean === 'HBALES' || clean === 'HBALE' || clean === 'HB' || clean === 'HALFBALES' || clean === 'HALFBALE') return 'H. BALES';
  if (clean === 'BALES' || clean === 'BALE' || clean === 'BAL' || clean === 'BELL' || clean === 'BELLS' || clean === 'BEL') return 'BALES';
  if (clean === 'LOOSE' || clean === 'LOS') return 'LOOSE';
  return 'OTHER';
}

export const PoCalculationModal: React.FC<PoCalculationModalProps> = ({
  isOpen,
  onClose,
  onApply,
  calcData,
  setCalcData,
  isPtf,
  purchaseUnitName,
  unitList = ['BALES', 'DRUMS', 'LOOSE', 'P. BALES', 'H. BALES'],
  weightUnitKgs = '147.5',
  onUnitTypeChange
}) => {
  if (!isOpen) return null;

  // Local state for interactive, responsive calculations
  const [localUnitType, setLocalUnitType] = useState<string>(purchaseUnitName || 'BALES');
  const [localWeightUnitKgs, setLocalWeightUnitKgs] = useState<string>(weightUnitKgs || '147.5');
  const [localLorries, setLocalLorries] = useState<string>(calcData.total_lorries || '1');
  const [localWeight, setLocalWeight] = useState<string>(calcData.weight_per_lorry || '29.500');
  const [localTotalUnits, setLocalTotalUnits] = useState<string>(calcData.total_units || '');
  const [localUnitsPerLorry, setLocalUnitsPerLorry] = useState<string>(calcData.units_per_lorry || '');

  // Keep local state in sync when modal opens
  useEffect(() => {
    if (isOpen) {
      const uType = purchaseUnitName || 'BALES';
      const norm = normalizeUnitType(uType);
      setLocalUnitType(uType);

      let initialWtUnit = '';
      if (norm === 'DRUMS') {
        initialWtUnit = (weightUnitKgs && parseFloat(weightUnitKgs) > 0 && parseFloat(weightUnitKgs) !== 147.5) ? weightUnitKgs : '50';
      } else if (norm === 'BALES') {
        initialWtUnit = '147.5';
      } else {
        initialWtUnit = '';
      }
      setLocalWeightUnitKgs(initialWtUnit);

      const lorriesStr = calcData.total_lorries || '1';
      setLocalLorries(lorriesStr);
      
      const wtStr = calcData.weight_per_lorry || '29.500';
      setLocalWeight(wtStr);
      setLocalTotalUnits(calcData.total_units || '');
      setLocalUnitsPerLorry(calcData.units_per_lorry || '');

      recomputeUnits(lorriesStr, wtStr, uType, initialWtUnit, calcData.total_units, calcData.units_per_lorry);
    }
  }, [isOpen, purchaseUnitName, weightUnitKgs]);

  const formatNumber = (num: number): string => {
    if (isNaN(num) || !isFinite(num) || num <= 0) return '';
    return Number.isInteger(num) ? num.toString() : Number(num.toFixed(2)).toString();
  };

  /**
   * Centralized dynamic recomputation engine:
   * Weight / Lorry is in Metric Tons (e.g. 29.500 MT -> 29,500 Kg, or 15 MT -> 15,000 Kg).
   * Weight/Unit is in Kg (e.g. 50 Kg for DRUMS, 147.5 Kg for BALES / BELL).
   * Units / Lorry = (Weight/Lorry in MT * 1000) ÷ Weight/Unit (Kg)
   * Total Units = Units / Lorry * Lorries
   */
  const recomputeUnits = (
    lorriesVal: string,
    weightVal: string,
    unitTypeVal: string,
    weightUnitKgsVal: string,
    existingTotalUnits?: string,
    existingUnitsPerLorry?: string
  ) => {
    if (isPtf) return;
    const norm = normalizeUnitType(unitTypeVal);
    const lorries = Math.max(1, parseFloat(lorriesVal) || 1);
    const rawWeight = parseFloat(weightVal) || 0;

    // LOOSE, P. BALES, H. BALES: Always keep units blank
    if (norm === 'LOOSE' || norm === 'P. BALES' || norm === 'H. BALES') {
      setLocalTotalUnits('');
      setLocalUnitsPerLorry('');
      setCalcData(prev => ({
        ...prev,
        total_lorries: lorriesVal,
        weight_per_lorry: weightVal,
        total_units: '',
        units_per_lorry: ''
      }));
      return;
    }

    // Determine weight per unit (Kg)
    let unitWeight = 0;
    if (norm === 'DRUMS') {
      unitWeight = parseFloat(weightUnitKgsVal) || 50;
    } else if (norm === 'BALES') {
      unitWeight = 147.5;
    }

    if (unitWeight <= 0 || rawWeight <= 0) {
      if (existingTotalUnits && parseFloat(existingTotalUnits) > 0) {
        const tot = parseFloat(existingTotalUnits);
        const perLorry = lorries > 0 ? tot / lorries : tot;
        setLocalTotalUnits(formatNumber(tot));
        setLocalUnitsPerLorry(formatNumber(perLorry));
      } else {
        setLocalTotalUnits('');
        setLocalUnitsPerLorry('');
      }
      return;
    }

    // Convert raw weight per lorry to KG:
    // If rawWeight < 100 (e.g. 29.500 or 15.000 MT), weight per lorry in KG = rawWeight * 1000
    // If rawWeight >= 100 (e.g. 29500 KG), weight in KG = rawWeight
    const wtPerLorryMt = rawWeight >= 100 ? rawWeight / 1000 : rawWeight;
    const wtPerLorryKg = wtPerLorryMt * 1000;

    const unitsPerLorry = Math.round(wtPerLorryKg / unitWeight);
    const totalUnits = unitsPerLorry * lorries;

    const totUnitsStr = formatNumber(totalUnits);
    const unitsPerLorryStr = formatNumber(unitsPerLorry);

    setLocalTotalUnits(totUnitsStr);
    setLocalUnitsPerLorry(unitsPerLorryStr);

    setCalcData(prev => ({
      ...prev,
      total_lorries: lorriesVal,
      weight_per_lorry: weightVal,
      total_units: totUnitsStr,
      units_per_lorry: unitsPerLorryStr
    }));
  };

  const handleLorriesChange = (val: string) => {
    setLocalLorries(val);
    if (isPtf) {
      setCalcData(prev => ({
        ...prev,
        total_lorries: val
      }));
      return;
    }

    const lorries = Math.max(1, parseFloat(val) || 1);
    const norm = normalizeUnitType(localUnitType);

    if ((norm === 'LOOSE' || norm === 'P. BALES' || norm === 'H. BALES') && !isPtf) {
      setLocalTotalUnits('');
      setLocalUnitsPerLorry('');
      return;
    }

    // When lorries change, Units/Lorry remains constant, Total Units = Units/Lorry * Lorries
    const unitsPerLorry = parseFloat(localUnitsPerLorry) || 0;
    if (unitsPerLorry > 0 && lorries > 0) {
      const totUnits = Math.round(unitsPerLorry * lorries);
      const totUnitsStr = formatNumber(totUnits);
      setLocalTotalUnits(totUnitsStr);
      setCalcData(prev => ({
        ...prev,
        total_lorries: val,
        total_units: totUnitsStr
      }));
    } else {
      recomputeUnits(val, localWeight, localUnitType, localWeightUnitKgs);
    }
  };

  const handleUnitTypeChange = (newUnitName: string) => {
    setLocalUnitType(newUnitName);
    const norm = normalizeUnitType(newUnitName);

    let newWeightUnit = '';
    if (norm === 'DRUMS') {
      newWeightUnit = '50';
    } else if (norm === 'BALES') {
      newWeightUnit = '147.5';
    } else {
      newWeightUnit = '';
    }
    setLocalWeightUnitKgs(newWeightUnit);

    if (onUnitTypeChange) {
      onUnitTypeChange(newUnitName, newWeightUnit);
    }
    if (isPtf) return;
    recomputeUnits(localLorries, localWeight, newUnitName, newWeightUnit);
  };

  const handleWeightUnitKgsChange = (val: string) => {
    setLocalWeightUnitKgs(val);
    recomputeUnits(localLorries, localWeight, localUnitType, val);
  };

  const handleWeightChange = (val: string) => {
    setLocalWeight(val);
    if (isPtf) {
      setCalcData(prev => ({
        ...prev,
        weight_per_lorry: val
      }));
      return;
    }
    recomputeUnits(localLorries, val, localUnitType, localWeightUnitKgs);
  };

  const handleUnitsPerLorryChange = (val: string) => {
    setLocalUnitsPerLorry(val);
    if (isPtf) {
      setCalcData(prev => ({
        ...prev,
        units_per_lorry: val
      }));
      return;
    }
    const norm = normalizeUnitType(localUnitType);
    if (norm === 'LOOSE' || norm === 'P. BALES' || norm === 'H. BALES') return;

    const unitsPerLorry = parseFloat(val) || 0;
    const lorries = Math.max(1, parseFloat(localLorries) || 1);
    const unitWt = norm === 'DRUMS' ? (parseFloat(localWeightUnitKgs) || 50) : 147.5;

    if (unitsPerLorry > 0 && lorries > 0 && unitWt > 0) {
      const totUnits = Math.round(unitsPerLorry * lorries);
      const wtPerLorryKg = unitsPerLorry * unitWt;
      const wtPerLorryMt = (wtPerLorryKg / 1000).toFixed(3);
      const totUnitsStr = formatNumber(totUnits);

      setLocalTotalUnits(totUnitsStr);
      setLocalWeight(wtPerLorryMt);
      setCalcData(prev => ({
        ...prev,
        units_per_lorry: val,
        total_units: totUnitsStr,
        weight_per_lorry: wtPerLorryMt
      }));
    }
  };

  const handleTotalUnitsChange = (val: string) => {
    setLocalTotalUnits(val);
    if (isPtf) {
      setCalcData(prev => ({
        ...prev,
        total_units: val
      }));
      return;
    }
    const norm = normalizeUnitType(localUnitType);
    if (norm === 'LOOSE' || norm === 'P. BALES' || norm === 'H. BALES') return;

    const totUnits = parseFloat(val) || 0;
    const lorries = Math.max(1, parseFloat(localLorries) || 1);
    const unitWt = norm === 'DRUMS' ? (parseFloat(localWeightUnitKgs) || 50) : 147.5;

    if (totUnits > 0 && unitWt > 0) {
      const unitsPerLorry = Math.round(totUnits / lorries);
      const wtPerLorryKg = unitsPerLorry * unitWt;
      const wtPerLorryMt = (wtPerLorryKg / 1000).toFixed(3);
      const unitsPerLorryStr = formatNumber(unitsPerLorry);

      setLocalUnitsPerLorry(unitsPerLorryStr);
      setLocalWeight(wtPerLorryMt);
      setCalcData(prev => ({
        ...prev,
        total_units: val,
        units_per_lorry: unitsPerLorryStr,
        weight_per_lorry: wtPerLorryMt
      }));
    }
  };

  const handleApplyClick = () => {
    const norm = normalizeUnitType(localUnitType);
    const isNonUnit = (norm === 'LOOSE' || norm === 'P. BALES' || norm === 'H. BALES') && !isPtf;
    const rawWeight = parseFloat(localWeight) || 0;
    const wtPerLorryFormatted = rawWeight >= 100 ? (rawWeight / 1000).toFixed(3) : rawWeight.toFixed(3);

    const appliedPayload = {
      total_lorries: localLorries || '1',
      units_per_lorry: isNonUnit ? '' : localUnitsPerLorry,
      total_units: isNonUnit ? '' : localTotalUnits,
      weight_per_lorry: wtPerLorryFormatted,
      purchase_unit_name: localUnitType,
      weight_unit_kgs: norm === 'BALES' ? '147.5' : (norm === 'DRUMS' ? (localWeightUnitKgs || '50') : '')
    };

    setCalcData({
      total_lorries: appliedPayload.total_lorries,
      units_per_lorry: appliedPayload.units_per_lorry,
      total_units: appliedPayload.total_units,
      weight_per_lorry: appliedPayload.weight_per_lorry
    });

    onApply(appliedPayload);
  };

  const norm = normalizeUnitType(localUnitType);
  const isNonUnit = (norm === 'LOOSE' || norm === 'P. BALES' || norm === 'H. BALES') && !isPtf;
  const unitWeightForFormula = norm === 'DRUMS' ? (parseFloat(localWeightUnitKgs) || 50) : 147.5;
  const rawNumWeight = parseFloat(localWeight) || 0;
  const displayKgWeight = rawNumWeight < 100 ? rawNumWeight * 1000 : rawNumWeight;
  const lorriesNum = Math.max(1, parseFloat(localLorries) || 1);

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div 
        className="bg-[#D1D5DB] border-2 border-t-white border-l-white border-r-gray-700 border-b-gray-700 shadow-2xl w-full max-w-[440px] p-2 text-xs font-sans text-black select-none rounded-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calc-helper-title"
      >
        {/* Compact Title Bar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1E3A8A] to-[#1E40AF] text-white px-2.5 py-1 font-bold mb-2 shadow-xs">
          <div className="flex items-center gap-1.5 truncate">
            <Calculator className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span id="calc-helper-title" className="tracking-wide text-xs">Calculate Contract Units & MT helper</span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-white hover:text-rose-300 hover:bg-rose-900/40 p-0.5 rounded transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body: Compact Layout */}
        <div className="space-y-1.5 px-1 py-0.5 bg-gray-100/90 border border-gray-400 p-2.5 text-black">
          
          {/* Row 1: Total No. of Lorries */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="modal_total_lorries" className="font-bold text-gray-900 whitespace-nowrap">
              Total No. of Lorries:
            </label>
            <input 
              id="modal_total_lorries"
              type="number"
              min="1"
              step="1"
              value={localLorries}
              onChange={(e) => handleLorriesChange(e.target.value)}
              className="w-28 bg-white border border-gray-500 px-1.5 py-0.5 font-mono font-extrabold text-right text-black shadow-inner focus:bg-amber-50 focus:border-blue-600 outline-none"
            />
          </div>

          {/* Row 2: Unit Type & Weight / Unit (Kgs) */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="modal_unit_type" className="font-bold text-gray-900 whitespace-nowrap">
              Unit Type:
            </label>
            <div className="flex items-center gap-1.5">
              <select
                id="modal_unit_type"
                value={localUnitType}
                onChange={(e) => handleUnitTypeChange(e.target.value)}
                className="w-28 bg-white border border-gray-500 px-1.5 py-0.5 font-bold text-black cursor-pointer text-[11px] outline-none"
              >
                {Array.from(new Set([...unitList, 'BALES', 'DRUMS', 'LOOSE', 'P. BALES', 'H. BALES'])).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>

              {norm === 'DRUMS' ? (
                <div className="flex items-center gap-1" title="Weight per Drum in Kgs (default 50)">
                  <span className="text-[10px] text-gray-700 font-bold">Wt/Unit:</span>
                  <input
                    type="number"
                    step="any"
                    value={localWeightUnitKgs}
                    onChange={(e) => handleWeightUnitKgsChange(e.target.value)}
                    className="w-14 bg-white border border-gray-500 px-1 py-0.5 font-mono font-bold text-right text-black text-[11px] outline-none"
                  />
                  <span className="text-[10px] font-bold text-gray-600">Kg</span>
                </div>
              ) : norm === 'BALES' ? (
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 whitespace-nowrap">
                  147.5 Kg
                </span>
              ) : (
                <span className="text-[10px] font-sans text-gray-500 italic whitespace-nowrap">
                  (No unit qty)
                </span>
              )}
            </div>
          </div>

          {/* Row 3: Units / Lorry */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="modal_units_per_lorry" className="font-bold text-gray-900 whitespace-nowrap">
              Units / Lorry:
            </label>
            <input 
              id="modal_units_per_lorry"
              type="text"
              disabled={isNonUnit}
              value={isNonUnit ? '' : localUnitsPerLorry}
              onChange={(e) => handleUnitsPerLorryChange(e.target.value)}
              placeholder={isNonUnit ? '—' : '0'}
              className={`w-28 border px-1.5 py-0.5 font-mono font-extrabold text-right shadow-inner outline-none ${
                isNonUnit 
                  ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                  : 'bg-white border-gray-500 text-black focus:bg-amber-50 focus:border-blue-600'
              }`}
            />
          </div>

          {/* Row 4: Total Units */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="modal_total_units" className="font-bold text-gray-900 whitespace-nowrap">
              Total Units:
            </label>
            <input 
              id="modal_total_units"
              type="text"
              disabled={isNonUnit}
              value={isNonUnit ? '' : localTotalUnits}
              onChange={(e) => handleTotalUnitsChange(e.target.value)}
              placeholder={isNonUnit ? '—' : '0'}
              className={`w-28 border px-1.5 py-0.5 font-mono font-extrabold text-right shadow-inner outline-none ${
                isNonUnit 
                  ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                  : 'bg-white border-gray-500 text-black focus:bg-amber-50 focus:border-blue-600'
              }`}
            />
          </div>

          {/* Row 5: Weight / Lorry (M.Ton) */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <label htmlFor="modal_weight_per_lorry" className="font-bold text-gray-900 whitespace-nowrap">
                Weight / Lorry (M.Ton):
              </label>
              <div className="text-[10px] text-indigo-700 font-medium">1 M.Ton = 1,000 Kg</div>
            </div>
            <input 
              id="modal_weight_per_lorry"
              type="number"
              step="any"
              value={localWeight}
              onChange={(e) => handleWeightChange(e.target.value)}
              className="w-28 bg-white border border-gray-500 px-1.5 py-0.5 font-mono font-extrabold text-right text-black shadow-inner focus:bg-amber-50 focus:border-blue-600 outline-none"
            />
          </div>

          {/* Calculation Live Formula Preview */}
          <div className="bg-blue-50/90 border border-blue-200 p-2 rounded-none text-[10.5px] text-blue-950 font-mono">
            {isNonUnit ? (
              <span className="font-sans text-gray-600 italic">
                Unit Type <strong>{localUnitType}</strong> does not calculate unit quantities (remains blank). Total Contract = {((rawNumWeight >= 100 ? rawNumWeight / 1000 : rawNumWeight) * lorriesNum).toFixed(3)} MT.
              </span>
            ) : rawNumWeight > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-sans font-medium">Units / Lorry:</span>
                  <span className="font-bold text-blue-900">
                    {localWeight} MT ({displayKgWeight.toLocaleString()} Kg) ÷ {unitWeightForFormula} Kg = <strong>{localUnitsPerLorry || '0'} {localUnitType} / lorry</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-blue-200/60 pt-0.5">
                  <span className="text-gray-600 font-sans font-medium">Total Units:</span>
                  <span className="font-bold text-emerald-900">
                    {localUnitsPerLorry || '0'} × {lorriesNum} {lorriesNum === 1 ? 'lorry' : 'lorries'} = <strong>{localTotalUnits || '0'} {localUnitType}</strong> (Total {((rawNumWeight >= 100 ? rawNumWeight / 1000 : rawNumWeight) * lorriesNum).toFixed(3)} MT)
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-gray-500 font-sans">Enter Weight in Metric Ton (M.Ton) to calculate contract units.</span>
            )}
          </div>
        </div>

        {/* Action Buttons: Classic Desktop Compact Style */}
        <div className="flex items-center justify-end gap-2 mt-2 pt-1.5 border-t border-gray-400">
          <button 
            type="button"
            onClick={onClose} 
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 border border-gray-500 active:border-gray-700 font-bold text-black shadow-xs cursor-pointer text-xs"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleApplyClick}
            className="px-3.5 py-1 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white border border-emerald-900 font-bold flex items-center gap-1 shadow-xs cursor-pointer text-xs"
          >
            <Check className="w-3.5 h-3.5 text-white" />
            <span>Apply Values</span>
          </button>
        </div>
      </div>
    </div>
  );
};
