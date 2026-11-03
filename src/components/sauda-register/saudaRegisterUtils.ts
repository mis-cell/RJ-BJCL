import { Sauda } from '../../types';
import { cleanSaudaNo } from '../../lib/utils';

export const compareQualities = (aStr: string, bStr: string): number => {
  const clean = (val: string) => {
    return String(val || '')
      .trim()
      .replace(/\.$/, '') // strip trailing dot
      .replace(/\s+/g, '') // strip all spaces
      .toUpperCase();
  };

  const a = clean(aStr);
  const b = clean(bStr);

  if (!a && !b) return 0;
  if (!a) return 1; // empty to the end
  if (!b) return -1;

  const PREDEFINED_RANKS: Record<string, number> = {
    'TD1': 10, 'TD2': 20, 'TD3': 30, 'TD4': 40, 'TD5': 50, 'TD6': 60, 'TD7': 70, 'TD8': 80,
    'W1': 110, 'W2': 120, 'W3': 130, 'W4': 140, 'W5': 150, 'W6': 160, 'W7': 170, 'W8': 180,
    'M1': 210, 'M2': 220, 'M3': 230, 'M4': 240, 'M5': 250, 'M6': 260, 'M7': 270, 'M8': 280,
    'BTC': 310, 'BTR': 320,
    'STANDARD GRADE': 1000, 'NORMAL GRADE': 1010
  };

  const rankA = PREDEFINED_RANKS[a];
  const rankB = PREDEFINED_RANKS[b];

  if (rankA !== undefined && rankB !== undefined) {
    return rankA - rankB;
  }
  if (rankA !== undefined) return -1;
  if (rankB !== undefined) return 1;

  const regex = /^([A-Z]+)(\d+)(.*)$/;
  const matchA = a.match(regex);
  const matchB = b.match(regex);

  if (matchA && matchB) {
    const prefixA = matchA[1];
    const numA = parseInt(matchA[2], 10);
    const prefixB = matchB[1];
    const numB = parseInt(matchB[2], 10);

    if (prefixA === prefixB) {
      return numA - numB;
    }
    return prefixA.localeCompare(prefixB);
  }

  return a.localeCompare(b);
};

export const formatPoNumber = (sauda: any) => {
  if (!sauda) return '';
  const rawNo = String(sauda.sauda_no || sauda.no || sauda.contract_no || '').trim();
  const sessionVal = String(sauda.session || sauda.financial_year || '2026-2027');
  if (!rawNo) return `BJCL/${sessionVal}/Auto`;
  return cleanSaudaNo(rawNo, sessionVal);
};

// Helper to generate a high-fidelity retro HTML email representation of a Sauda Slip
export const generateSaudaHtmlEmail = (s: Sauda) => {
  const qualityRows = (s.quality_details || []).map((q, idx) => `
    <tr style="height: 24px;">
      <td style="border: 1px solid #000; text-align: center; padding: 4px; font-size: 11px;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 11px; font-weight: bold;">${q.quality}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-size: 11px; font-weight: bold;">${q.qty}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 11px;">${q.agency || ''}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 11px;">${q.marka || ''}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-size: 11px; font-weight: bold;">&#8377;${(q.rs || q.rate || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: 'Courier New', Courier, monospace; max-width: 700px; border: 2px solid #000; padding: 20px; background-color: #ffffff; color: #111;">
      <div style="font-size: 18px; font-weight: bold; text-align: center; text-transform: uppercase; color: #2a3088;">Bally Jute Company Limited</div>
      <div style="font-size: 11px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; font-weight: bold; color: #555;">
        REGISTERED OFFICE: 5, SREE CHARAN SARANI, BALLY, HOWRAH - 711201
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
        <tr>
          <td style="width: 50%;"><strong>SLIP NO:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px;">&nbsp;${s.sauda_no || ''}</span></td>
          <td style="width: 50%; text-align: right;"><strong>P.O. TYPE:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px; text-align: left;">&nbsp;${s.po_type || 'Normal'}</span></td>
        </tr>
        <tr>
          <td><strong>DATE:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px;">&nbsp;${s.date ? new Date(s.date).toLocaleDateString('en-GB') : ''}</span></td>
          <td style="text-align: right;"><strong>SESSION:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px; text-align: left;">&nbsp;${s.session || '2026-2027'}</span></td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; margin-bottom: 12px; font-size: 12px;">
        <tr>
          <td style="width: 130px; padding: 4px 0;"><strong>BROKER / VYAPARI:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${s.broker || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>SUPPLIER:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${s.supplier || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>CHALLAN SUPPLIER:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${s.challan_supplier || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>AREA / CENTER:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${s.area || ''}</span></td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
        <tr>
          <td style="width: 33%; padding: 4px 0;"><strong>NO. OF LORRIES:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.no_of_lorries || s.total_lorry || 1}</span></td>
          <td style="width: 33%; padding: 4px 0;"><strong>UNITS/LORRY:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.units_per_lorry_type || 'BALES'}</span></td>
          <td style="width: 34%; padding: 4px 0;"><strong>TOTAL UNIT:</strong> <span style="border-bottom: 1px dotted #000; font-weight: bold;">&nbsp;${s.total_unit || 0}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>WT/LORRY (MT):</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.wt_per_lorry || 10.28}</span></td>
          <td style="padding: 4px 0;"><strong>UNIT TYPE:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.unit_type || 'BALES'}</span></td>
          <td style="padding: 4px 0;"><strong>TOTAL WEIGHT (MT):</strong> <span style="border-bottom: 1px dotted #000; font-weight: bold;">&nbsp;${s.total_wt_in_ton || 0}</span></td>
        </tr>
      </table>

      <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; text-decoration: underline; color: #2a3088;">QUALITY / GRADE SPECIFICATION DETAILS:</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 40px;">SL.</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left;">QUALITY / GRADE</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right; width: 100px;">QUANTITY (BALES)</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 150px;">AGENCY</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 120px;">MARKA</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right; width: 120px;">B. RATE (&#8377;/Qtl)</th>
          </tr>
        </thead>
        <tbody>
          ${qualityRows}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; padding-top: 8px; margin-bottom: 12px; font-size: 11px;">
        <tr>
          <td style="width: 50%; padding: 4px 0;"><strong>SHIPMENT BY:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.shipment_date || ''}</span></td>
          <td style="width: 50%; padding: 4px 0;"><strong>SHIPMENT DAYS:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.shipment_days || s.delivery_days || 15} Days</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>PENALTY (&#8377;/Qtl/Day):</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;&#8377;${s.shipment_penalty || 5}</span></td>
          <td style="padding: 4px 0;"><strong>MARKS CLAIM (&#8377;/Qtl):</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;&#8377;${s.marks_claim || 0}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>QUANTITY CLAIM (Kg/Bale):</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.quantity_claim || 0} Kg</span></td>
          <td style="padding: 4px 0;"><strong>SUPERIOR / NORMAL MARKS:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.superior_normal_marks || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>BOOK RATE (&#8377;/Qtl):</strong> <span style="border-bottom: 1px dotted #000; font-weight: bold;">&nbsp;&#8377;${(s.b_rate || 16300).toLocaleString()}</span></td>
          <td style="padding: 4px 0;"><strong>S. DATE:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${s.b_date || s.date || ''}</span></td>
        </tr>
      </table>

      <div style="font-size: 11px; margin-top: 10px;">
        <strong>REMARKS / INSTRUCTIONS:</strong><br/>
        <div style="border: 1px dashed #555; padding: 6px; min-height: 40px; margin-top: 4px; font-size: 10px; line-height: 1.3; background-color: #fafafa;">
          ${s.remarks || 'No specific terms or claims recorded.'}
        </div>
      </div>
    </div>
  `;
};
