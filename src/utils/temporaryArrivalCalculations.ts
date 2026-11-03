import { Amad, ArrivalDetailRow } from '../types';

export const getPaddedDetails = (initialAmad?: Amad): ArrivalDetailRow[] => {
  let pDetails: ArrivalDetailRow[] = [];
  if (initialAmad && initialAmad.grid_details) {
    if (typeof initialAmad.grid_details === 'string') {
      try {
        const parsed = initialAmad.grid_details === 'undefined' || initialAmad.grid_details === 'null' ? [] : JSON.parse(initialAmad.grid_details === "undefined" ? "null" : initialAmad.grid_details);
        if (Array.isArray(parsed)) {
          pDetails = parsed;
        }
      } catch (e) {
        console.error("Error parsing grid_details JSON:", e);
      }
    } else if (Array.isArray(initialAmad.grid_details)) {
      pDetails = initialAmad.grid_details;
    }
  }
  
  // Ensure agency and numeric fields are cleanly mapped
  pDetails = pDetails.map(d => {
    const agencyName = d.agency_name || (d as any).agency || '';
    const agencyCode = d.agency_code || '';
    return { 
      ...d, 
      agency_name: agencyName, 
      agency_code: agencyCode,
      quantity_chln: d.quantity_chln !== undefined && d.quantity_chln !== null ? Number(d.quantity_chln) : 0,
      quantity_rcpt: d.quantity_rcpt !== undefined && d.quantity_rcpt !== null ? Number(d.quantity_rcpt) : 0,
      netto_pnto: d.netto_pnto !== undefined && d.netto_pnto !== null ? Number(d.netto_pnto) : 0
    };
  });

  const padded = [...pDetails];
  if (padded.length === 0) {
    padded.push({
      srl_no: 1,
      receipt_grade_code: '',
      receipt_grade_name: '',
      crop_year: '2026-27',
      challan_grade_name: '',
      agency_code: '',
      agency_name: '',
      challan_marka_code: '',
      challan_marka_name: '',
      netto_pnto: 0,
      quantity_chln: 0,
      quantity_rcpt: 0,
      remarks: ''
    });
  }
  return padded.map((row, idx) => ({ ...row, srl_no: idx + 1 }));
};

// Helper function to calculate allocated Netto (M.T) based on Final Weight and RCPT
// Formula: (RCPT / Total RCPT) * Final Weight.
// Note: This calculation is strictly NOT APPLICABLE for "LOOSE" unit.
export const calculateProportionalNetto = (
  finalWeightVal: number, 
  rows: ArrivalDetailRow[], 
  unitName?: string
): ArrivalDetailRow[] => {
  const isLoose = (unitName || '').toUpperCase().includes('LOOSE');
  if (isLoose) {
    return rows; // Pro-rata calculation is NOT applicable for "LOOSE"
  }

  const roundedFinalWeight = Math.round(finalWeightVal * 1000) / 1000;
  const getRowQuantity = (r: ArrivalDetailRow) => Number(r.quantity_rcpt) || Number(r.quantity_chln) || 0;

  const sumRcpt = rows.reduce((sum, d) => sum + getRowQuantity(d), 0);
  if (sumRcpt <= 0 || roundedFinalWeight <= 0) {
    return rows; // Do NOT zero out when sumRcpt is 0
  }

  const nonZeroIndices = rows.map((r, i) => (getRowQuantity(r) > 0 ? i : -1)).filter(i => i !== -1);
  if (nonZeroIndices.length === 0) {
    return rows;
  }

  const updated = [...rows];
  let allocated = 0;

  nonZeroIndices.forEach((idx, k) => {
    const q = getRowQuantity(updated[idx]);
    if (k === nonZeroIndices.length - 1) {
      // Last non-zero item absorbs any remaining rounding difference to match exact Final Weight
      const lastVal = Math.round((roundedFinalWeight - allocated) * 1000) / 1000;
      updated[idx] = { ...updated[idx], netto_pnto: Math.max(0, lastVal) };
    } else {
      const val = Math.round(((roundedFinalWeight / sumRcpt) * q) * 1000) / 1000;
      updated[idx] = { ...updated[idx], netto_pnto: val };
      allocated += val;
    }
  });

  // Zero out any rows with quantity <= 0 for non-LOOSE items
  rows.forEach((r, i) => {
    if (getRowQuantity(r) <= 0) {
      updated[i] = { ...updated[i], netto_pnto: 0 };
    }
  });

  return updated;
};
