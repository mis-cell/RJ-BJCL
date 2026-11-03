// Helper to generate a high-fidelity retro HTML email representation of a Purchase Order
export const generatePoHtmlEmail = (po: any): string => {
  const detailRows = (po.items || []).map((q: any, idx: number) => `
    <tr style="height: 24px;">
      <td style="border: 1px solid #000; text-align: center; padding: 4px; font-size: 11px;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 11px; font-weight: bold;">${q.crop || ''}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 11px; font-weight: bold;">${q.grade_name || ''}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 11px;">${q.agency_name || ''}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 11px;">${q.marka_name || ''}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-size: 11px; font-weight: bold;">${(q.qty || 0).toLocaleString()}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-size: 11px; font-weight: bold;">${(q.weight || 0).toFixed(2)} MT</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-size: 11px; font-weight: bold;">&#8377;${(q.rate || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: 'Courier New', Courier, monospace; max-width: 750px; border: 2px solid #000; padding: 20px; background-color: #ffffff; color: #111;">
      <div style="font-size: 18px; font-weight: bold; text-align: center; text-transform: uppercase; color: #024a68;">Bally Jute Company Limited</div>
      <div style="font-size: 11px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; font-weight: bold; color: #555;">
        REGISTERED OFFICE: 5, SREE CHARAN SARANI, BALLY, HOWRAH - 711201
      </div>
      
      <div style="text-align: center; font-size: 14px; font-weight: bold; text-decoration: underline; margin-bottom: 12px; color: #024a68; text-transform: uppercase;">
        ${po.is_ptf ? "PTF COMPILER SLIP" : "PURCHASE ORDER SLIP"}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
        <tr>
          <td style="width: 50%;"><strong>P.O. NO:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px;">&nbsp;${po.no || ''}</span></td>
          <td style="width: 50%; text-align: right;"><strong>PTF NO:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px; text-align: left;">&nbsp;${po.ptf_no || 'N/A'}</span></td>
        </tr>
        <tr>
          <td><strong>P.O. DATE:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px;">&nbsp;${po.date ? new Date(po.date).toLocaleDateString('en-GB') : ''}</span></td>
          <td style="text-align: right;"><strong>DI NO:</strong> <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px; text-align: left;">&nbsp;${po.contract_po_no || 'N/A'}</span></td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; margin-bottom: 12px; font-size: 12px;">
        <tr>
          <td style="width: 130px; padding: 4px 0;"><strong>BROKER / VYAPARI:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${po.broker || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>SUPPLIER:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${po.supplier || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>CHALLAN SUPPLIER:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${po.challan_supplier || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>AREA / CENTER:</strong></td>
          <td style="padding: 4px 0;"><span style="border-bottom: 1px dotted #000; display: block; width: 100%;">&nbsp;${po.area || ''}</span></td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
        <tr>
          <td style="width: 33%; padding: 4px 0;"><strong>TOTAL LORRIES:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.total_no_of_lorries || 0}</span></td>
          <td style="width: 33%; padding: 4px 0;"><strong>UNITS/LORRY:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.units_per_lorry || 'BALES'}</span></td>
          <td style="width: 34%; padding: 4px 0;"><strong>TOTAL UNITS:</strong> <span style="border-bottom: 1px dotted #000; font-weight: bold;">&nbsp;${po.total_units || 0}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>WT/LORRY (MT):</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.weight_per_lorry || 10.28}</span></td>
          <td style="padding: 4px 0;"><strong>TRANS PAID BY:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.trans_paid_by || 'PARTY'}</span></td>
          <td style="padding: 4px 0;"><strong>TOTAL WT (MT):</strong> <span style="border-bottom: 1px dotted #000; font-weight: bold;">&nbsp;${po.total_contract_mt || 0}</span></td>
        </tr>
      </table>

      <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; text-decoration: underline; color: #024a68;">PURCHASE SPECIFICATION & RATE DETAILS:</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 40px;">SL.</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left;">CROP YEAR</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left;">GRADE/QUALITY</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 120px;">AGENCY</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 120px;">MARKA</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right; width: 80px;">QTY (BALES)</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right; width: 90px;">WT (MT)</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right; width: 100px;">RATE (&#8377;/Qtl)</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; padding-top: 8px; margin-bottom: 12px; font-size: 11px;">
        <tr>
          <td style="width: 50%; padding: 4px 0;"><strong>DELIVERY FROM:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.delivery_from || ''}</span></td>
          <td style="width: 50%; padding: 4px 0;"><strong>DELIVERY TO:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.delivery_to || ''}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>GRACE DAYS:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.grace_days || 0} Days</span></td>
          <td style="padding: 4px 0;"><strong>DELIVERY PENALTY:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;&#8377;${po.delivery_penalty || 0}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>CONTRACT DATE:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.contract_date || ''}</span></td>
          <td style="padding: 4px 0;"><strong>IDENTIFICATION:</strong> <span style="border-bottom: 1px dotted #000;">&nbsp;${po.po_identification || ''}</span></td>
        </tr>
      </table>

      <div style="font-size: 11px; margin-top: 10px;">
        <strong>TERMS & CONDITIONS:</strong><br/>
        <div style="border: 1px dashed #555; padding: 6px; min-height: 35px; margin-top: 4px; font-size: 10px; line-height: 1.3; background-color: #fafafa; margin-bottom: 8px;">
          ${po.terms_condition || 'Standard penalty Rs.5/day. Standard terms apply.'}
        </div>
        <strong>REMARKS:</strong><br/>
        <div style="border: 1px dashed #555; padding: 6px; min-height: 35px; margin-top: 4px; font-size: 10px; line-height: 1.3; background-color: #fafafa;">
          ${po.remarks || 'No specific remarks recorded.'}
        </div>
      </div>
    </div>
  `;
};

export const compareGradeAlphaNumeric = (a: string, b: string): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
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
