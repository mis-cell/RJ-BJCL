import { jsPDF } from "jspdf";
import { formatIndAmount, numberToIndianWords } from "./settlementPrintHelpers";

export function buildSettlementPdfDocument(
  populatedGrid: string[][],
  activeDetailsCount: number,
  effectiveNetAmountToBePaid: number,
  onAcTotalAdv: number,
  onAcTotalAdvAdj: number,
  onAcBalanceAmt: number,
  withAutoPrint = false
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const cell = (r1: number, c0: number) =>
    (populatedGrid[r1 - 1]?.[c0] || "").trim();

  const L = 8.5; // Left margin (mm) matching Templest_pdf_b9e41bd0.pdf
  const R = 201.5; // Right margin (mm)
  const W = R - L; // 193mm width

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.32);

  // Row 1: Company Title (Centered Bold Serif)
  doc.setFont("times", "bold");
  doc.setFontSize(13.5);
  doc.text(cell(1, 0) || "BALLY JUTE COMPANY LIMITED", 105, 10.5, {
    align: "center",
  });

  // Row 2: Powered by KatEye™ (Left Bold-Italic Serif) & Printed On (Right Bold Sans-Serif)
  doc.setFont("times", "bolditalic");
  doc.setFontSize(9.5);
  doc.text(cell(2, 1) || "Powered by KatEye™", L + 1.5, 17.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(cell(2, 4), R - 1, 17.5, { align: "right" });

  // Outer Main Frame Box: y = 19.2mm to y = 260.0mm
  const boxTop = 19.2;
  const boxBottom = 260.0;
  doc.rect(L, boxTop, W, boxBottom - boxTop);

  // Master Header Section (Rows 3 to 11): y = 19.2mm to y = 63.8mm
  const headerBottom = 63.8;
  const splitX = 158.0; // Vertical divider for Party Bill No / Party Bill Date
  doc.line(L, headerBottom, R, headerBottom);
  doc.line(splitX, boxTop, splitX, headerBottom);

  // Left Master Details (Rows 3 to 11)
  const labelX = L + 2.2;
  const colonX = L + 31.5;
  const valX = L + 34.5;
  const dateLabelX = L + 85.0;
  const dateColonX = L + 107.0;
  const dateValX = L + 110.0;

  const headerRows = [
    { r: 3, y: 23.0, hasDate: true },
    { r: 4, y: 27.9, hasDate: false },
    { r: 5, y: 32.8, hasDate: false, isAddress: true },
    { r: 6, y: 37.7, hasDate: false },
    { r: 7, y: 42.6, hasDate: true },
    { r: 8, y: 47.5, hasDate: false },
    { r: 9, y: 52.4, hasDate: false },
    { r: 10, y: 57.3, hasDate: false },
    { r: 11, y: 62.2, hasDate: false },
  ];

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  headerRows.forEach(({ r, y, hasDate, isAddress }) => {
    if (isAddress) {
      const addr = cell(r, 4);
      if (addr) {
        doc.setFont("times", "normal");
        doc.text(addr, valX, y);
      }
      return;
    }
    const lbl = cell(r, 1);
    const val = cell(r, 4);
    doc.setFont("times", "bold");
    doc.text(lbl, labelX, y);
    doc.text(":", colonX, y);
    doc.setFont("times", "bold");
    doc.text(val, valX, y);

    if (hasDate) {
      const dLbl = cell(r, 6) || "Date";
      const dVal = cell(r, 8);
      doc.setFont("times", "bold");
      doc.text(dLbl, dateLabelX, y);
      doc.text(":", dateColonX, y);
      doc.text(dVal, dateValX, y);
    }
  });

  // Right Split Box: Party Bill No (Row 3..6) & Party Bill Date (Row 7..11)
  const partyBillNoHeaderBottom = 24.3;
  const partyMidY = 39.2;
  const partyBillDateHeaderBottom = 44.3;
  const partyBoxCenter = (splitX + R) / 2;

  doc.line(splitX, partyBillNoHeaderBottom, R, partyBillNoHeaderBottom);
  doc.line(splitX, partyMidY, R, partyMidY);
  doc.line(splitX, partyBillDateHeaderBottom, R, partyBillDateHeaderBottom);

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text(cell(3, 10) || "Party Bill No", partyBoxCenter, 23.0, {
    align: "center",
  });
  doc.text(cell(4, 10), partyBoxCenter, 31.5, { align: "center" });

  doc.text(cell(7, 10) || "Party Bill Date", partyBoxCenter, 43.0, {
    align: "center",
  });
  doc.text(cell(8, 10), partyBoxCenter, 52.0, {
    align: "center",
  });

  // Row 12: Table Header (pure white background, NO vertical lines)
  const tblHeaderBottom = 74.2;
  doc.line(L, tblHeaderBottom, R, tblHeaderBottom);

  // Well-spaced X-coordinates matching Templest_pdf_b9e41bd0.pdf so Sett. Rate and Value never touch
  const colX = {
    grade: L + 1.0, // Left
    marka: L + 16.5, // Left
    qtyHdr: L + 33.0, // Left header
    qtyVal: L + 48.0, // Right numeric
    unit: L + 51.5, // Left
    poRateHdr: L + 68.0, // Left header
    poRateVal: L + 79.0, // Right numeric
    type: L + 86.5, // Left ("Type", "Grd.Down:", "Moisture:", "Premium:", "Total:")
    claimHdr: L + 108.5, // Left header
    claimVal: L + 118.0, // Right numeric
    settHdr: L + 122.0, // Left header
    settVal: L + 131.0, // Right numeric
    rateAdjHdr: L + 136.0, // Left header
    rateAdjVal: L + 146.0, // Right numeric
    settRateHdr: L + 151.0, // Left header
    settRateVal: L + 163.0, // Right numeric (37mm away from right edge!)
    valueHdr: L + 173.0, // Left header
    valueVal: R - 1.5, // Right numeric (200.0mm)
  };

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  // Multi-line headers first row
  doc.text("P.O", colX.poRateHdr, 68.3);
  doc.text("Rate", colX.rateAdjHdr, 68.3);
  doc.text("Sett.", colX.settRateHdr, 68.3);

  // Bottom-aligned header row
  doc.text("Grade", colX.grade, 72.8);
  doc.text("Marka", colX.marka, 72.8);
  doc.text("Quantity", colX.qtyHdr, 72.8);
  doc.text("Unit", colX.unit, 72.8);
  doc.text("Rate", colX.poRateHdr, 72.8);
  doc.text("Type", colX.type, 72.8);
  doc.text("Claim", colX.claimHdr, 72.8);
  doc.text("Sett.", colX.settHdr, 72.8);
  doc.text("(+/-)", colX.rateAdjHdr, 72.8);
  doc.text("Rate", colX.settRateHdr, 72.8);
  doc.text("Value", colX.valueHdr, 72.8);

  // Logical Rows 14..30: Grade items (4 lines per grade, matching Templest_pdf_b9e41bd0.pdf)
  let curY = tblHeaderBottom + 4.2;
  const itemCount = Math.min(activeDetailsCount, 4);
  const rowStep = 4.6;

  if (itemCount === 0) {
    // If no active details, show the template default labels (Grd.Down:, Moisture:, Premium:, Total:)
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("Grd.Down:", colX.type, curY);
    doc.text("Moisture:", colX.type, curY + rowStep);
    doc.text("Premium:", colX.type, curY + rowStep * 2);
    doc.text("Total:", colX.type, curY + rowStep * 3);
  } else {
    for (let idx = 0; idx < itemCount; idx++) {
      const baseRow = 14 + idx * 4;

      // Line 1: Grade, Marka, Qty, Unit, PO Rate, Grd.Down:, Claim, Sett., Rate(+/-), Sett.Rate, Value
      doc.setFont("times", "bold");
      doc.setFontSize(9.2);
      doc.text(cell(baseRow, 1), colX.grade, curY);
      doc.setFont("times", "normal");
      doc.text(cell(baseRow, 2), colX.marka, curY);
      doc.text(cell(baseRow, 3), colX.qtyVal, curY, { align: "right" });
      doc.text(cell(baseRow, 4), colX.unit, curY);
      doc.text(cell(baseRow, 5), colX.poRateVal, curY, { align: "right" });
      doc.text(cell(baseRow, 6) || "Grd.Down:", colX.type, curY);
      if (cell(baseRow, 7)) {
        doc.text(cell(baseRow, 7), colX.claimVal, curY, { align: "right" });
      }
      if (cell(baseRow, 8)) {
        doc.text(cell(baseRow, 8), colX.settVal, curY, { align: "right" });
      }
      doc.text(cell(baseRow, 9), colX.rateAdjVal, curY, { align: "right" });
      doc.text(cell(baseRow, 10), colX.settRateVal, curY, { align: "right" });
      doc.text(cell(baseRow, 11), colX.valueVal, curY, { align: "right" });

      // Line 2: Weight in Kgs & Moisture:
      curY += rowStep;
      doc.text(cell(baseRow + 1, 3), colX.qtyVal, curY, { align: "right" });
      doc.text(cell(baseRow + 1, 4) || "Kgs", colX.unit, curY);
      doc.text(cell(baseRow + 1, 6) || "Moisture:", colX.type, curY);
      if (cell(baseRow + 1, 7)) {
        doc.text(cell(baseRow + 1, 7), colX.claimVal, curY, { align: "right" });
      }

      // Line 3: Premium:
      curY += rowStep;
      doc.text(cell(baseRow + 2, 6) || "Premium:", colX.type, curY);
      doc.text(cell(baseRow + 2, 9), colX.rateAdjVal, curY, { align: "right" });
      doc.line(colX.rateAdjVal - 11, curY + 0.9, colX.rateAdjVal, curY + 0.9);

      // Line 4: Total:
      curY += rowStep;
      doc.text(cell(baseRow + 3, 6) || "Total:", colX.type, curY);
      doc.text(cell(baseRow + 3, 9), colX.rateAdjVal, curY, { align: "right" });

      curY += rowStep + 1.5;
    }
  }

  // Logical Row 31: Miscellaneous Charges Section (Fixed top line at y = 154.5mm matching Templest_pdf_b9e41bd0.pdf)
  const miscTopLineY = 154.5;
  doc.line(L, miscTopLineY, R, miscTopLineY);

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text(cell(31, 1) || "Miscellaneous Charges", 105, miscTopLineY + 4.5, {
    align: "center",
  });

  // Logical Rows 32..39: Miscellaneous Charges items
  let miscY = miscTopLineY + 9.5;
  doc.setFont("times", "normal");
  doc.setFontSize(9.0);
  for (let r = 32; r <= 39; r++) {
    const desc = cell(r, 1);
    const amt = cell(r, 11);
    if (!desc && !amt) continue;
    const qtyStr = cell(r, 5);
    const rateStr = cell(r, 7);
    const perStr = cell(r, 9);

    doc.text(desc, L + 2.2, miscY);
    if (qtyStr) doc.text(qtyStr, L + 90, miscY, { align: "right" });
    if (rateStr) doc.text(rateStr, L + 118, miscY, { align: "right" });
    if (perStr) doc.text(perStr, L + 152, miscY, { align: "right" });
    if (amt) doc.text(amt, R - 1.5, miscY, { align: "right" });
    miscY += 4.5;
  }

  // Logical Row 40: Remarks Band (y = 201.5mm to 209.2mm matching Templest_pdf_b9e41bd0.pdf)
  const remarksTop = 201.5;
  const remarksBottom = 209.2;
  doc.line(L, remarksTop, R, remarksTop);
  doc.line(L, remarksBottom, R, remarksBottom);
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text(cell(40, 1) || "Remarks :-", L + 2.2, remarksTop + 5.5);

  // Logical Rows 41..49: Bottom Split Box (y = 209.2mm to 260.0mm)
  const midX = 113.5; // Vertical divider between Left Note/Cheque box and Right Summary box
  doc.line(midX, remarksBottom, midX, boxBottom);

  // Horizontal lines inside Bottom Split Box matching Templest_pdf_b9e41bd0.pdf:
  const line1Y = 223.8; // Full line across L..R (below On A/c Total Adv. Adjusted & Material Misc(-))
  const line2LeftY = 228.8; // Left-half line across L..midX (below Balance Amount)
  const line3Y = 233.8; // Full line across L..R (below On A/c Adv. Adjustment Made Against This MR & MR Advance Amount)
  const line4Y = 239.0; // Full line across L..R (below Cheque No / Date / Adjusted Value & Balance Due(Rounded))
  const line5RightY = 244.0; // Right-half line across midX..R (below On A/c Adv. Adjusted Amount :)

  doc.line(L, line1Y, R, line1Y);
  doc.line(L, line2LeftY, midX, line2LeftY);
  doc.line(L, line3Y, R, line3Y);
  doc.line(L, line4Y, R, line4Y);
  doc.line(midX, line5RightY, R, line5RightY);

  // Left Half (Logical Rows 41..49)
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);

  // Logical Row 41: Note:
  const noteLbl = cell(41, 1) || "Note:";
  doc.text(noteLbl, L + 2.2, 213.0);
  doc.line(L + 2.2, 213.6, L + 11.2, 213.6); // Underline Note:

  // Logical Row 42: On A/c Total Advance
  doc.text(cell(42, 1) || "On A/c Total Advance", L + 2.2, 218.0);
  doc.text(": Rs.", L + 67.5, 218.0);
  doc.text(formatIndAmount(onAcTotalAdv), L + 83.0, 218.0, {
    align: "right",
  });

  // Logical Row 43: On A/c Total Adv. Adjusted
  doc.text(cell(43, 1) || "On A/c Total Adv. Adjusted", L + 2.2, 222.5);
  doc.text(": Rs.", L + 67.5, 222.5);
  doc.text(formatIndAmount(onAcTotalAdvAdj), L + 83.0, 222.5, {
    align: "right",
  });

  // Logical Row 44: Balance Amount (left-aligned at L + 2.2 matching Templest_pdf_b9e41bd0.pdf)
  doc.text("Balance Amount", L + 2.2, 227.5);
  doc.text(": Rs.", L + 67.5, 227.5);
  doc.text(formatIndAmount(onAcBalanceAmt), L + 83.0, 227.5, {
    align: "right",
  });

  // Logical Row 45: On A/c Adv. Adjustment Made Against This MR
  doc.text(
    cell(45, 1) || "On A/c Adv. Adjustment Made Against This MR",
    (L + midX) / 2,
    232.5,
    { align: "center" }
  );

  // Logical Row 46: Cheque No | Date | Adjusted Value (no vertical lines inside cheque box matching Templest_pdf_b9e41bd0.pdf)
  doc.text(cell(46, 1) || "Cheque No", L + 16.0, 237.6, {
    align: "center",
  });
  doc.text(cell(46, 3) || "Date", L + 49.0, 237.6, {
    align: "center",
  });
  doc.text(cell(46, 5) || "Adjusted Value", L + 85.0, 237.6, {
    align: "center",
  });

  // Cheque Adjustment rows (Logical Rows 47..49)
  doc.setFont("times", "normal");
  for (let cIdx = 0; cIdx < 3; cIdx++) {
    const rNum = 47 + cIdx;
    const cy = 243.5 + cIdx * 4.8;
    if (cell(rNum, 1)) {
      doc.text(cell(rNum, 1), L + 16.0, cy, { align: "center" });
    }
    if (cell(rNum, 3)) {
      doc.text(cell(rNum, 3), L + 49.0, cy, { align: "center" });
    }
    if (cell(rNum, 5)) {
      doc.text(cell(rNum, 5), L + 95.0, cy, { align: "right" });
    }
  }

  // Right Half (Logical Rows 41..49): Financial Summary
  const rLabelX = midX + 2.2;
  const rColonX = midX + 41.5;
  const rValX = R - 1.2;

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);

  // Logical Row 41: Material Value
  doc.text(cell(41, 7) || "Material Value", rLabelX, 213.0);
  doc.text(":", rColonX, 213.0);
  doc.text(cell(41, 11), rValX, 213.0, { align: "right" });

  // Logical Row 42: Material Misc(+)
  doc.text(cell(42, 7) || "Material Misc(+)", rLabelX, 218.0);
  doc.text(":", rColonX, 218.0);
  doc.text(cell(42, 11), rValX, 218.0, { align: "right" });

  // Logical Row 43: Material Misc(-)
  doc.text(cell(43, 7) || "Material Misc(-)", rLabelX, 222.5);
  doc.text(":", rColonX, 222.5);
  doc.text(cell(43, 11), rValX, 222.5, { align: "right" });

  // Logical Row 44: Total MR Amount
  doc.text(cell(44, 7) || "Total MR Amount", rLabelX, 227.5);
  doc.text(":", rColonX, 227.5);
  doc.text(cell(44, 11), rValX, 227.5, { align: "right" });

  // Logical Row 45: MR Advance Amount
  doc.text(cell(45, 7) || "MR Advance Amount", rLabelX + 2.0, 232.5);
  doc.text(":", rColonX, 232.5);
  doc.text(cell(45, 11), rValX, 232.5, { align: "right" });

  // Logical Row 46: Balance Due(Rounded)
  doc.text(cell(46, 7) || "Balance Due(Rounded)", rLabelX + 1.0, 237.6);
  doc.text(":", rColonX, 237.6);
  doc.text(cell(46, 11), rValX, 237.6, { align: "right" });

  // Logical Row 47: On A/c Adv. Adjusted Amount :
  doc.text(cell(47, 7) || "On A/c Adv. Adjusted Amount :", rLabelX + 0.5, 242.6);
  doc.text(cell(47, 11), rValX, 242.6, { align: "right" });

  // Logical Row 48: Net Amount to be Paid
  doc.text(cell(48, 7) || "Net Amount to be Paid", rLabelX + 2.0, 247.8);
  doc.text(":", rColonX, 247.8);
  doc.text(cell(48, 11), rValX, 247.8, { align: "right" });

  // Logical Row 49: Amount in Words ("Rs. :  EIGHTEEN LAKH ... ONLY")
  const fullWords = numberToIndianWords(effectiveNetAmountToBePaid) + " ONLY";
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text("Rs. :", midX + 0.8, 253.0);

  doc.setFontSize(7.0);
  const wrappedWords = doc.splitTextToSize(fullWords, R - (midX + 10.5));
  if (wrappedWords.length > 0) {
    doc.text(wrappedWords[0], midX + 9.2, 253.0);
  }
  if (wrappedWords.length > 1) {
    doc.text(wrappedWords.slice(1).join(" "), midX + 0.8, 258.2);
  }

  // Logical Row 54: Bottom Signatures (outside the main frame box at y = 278.5mm)
  const sigY = 278.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);

  const sig1 = cell(54, 1) || "Prepared by";
  const sig2 = cell(54, 6) || "Checked by";
  const sig3 = cell(54, 10) || "Authorised Signatory";

  doc.text(sig1, L + 7.0, sigY);
  const sig1W = doc.getTextWidth(sig1);
  doc.line(L + 7.0, sigY + 0.8, L + 7.0 + sig1W, sigY + 0.8);

  doc.text(sig2, 105.0, sigY, { align: "center" });
  const sig2W = doc.getTextWidth(sig2);
  doc.line(105.0 - sig2W / 2, sigY + 0.8, 105.0 + sig2W / 2, sigY + 0.8);

  doc.text(sig3, R - 7.0, sigY, { align: "right" });
  const sig3W = doc.getTextWidth(sig3);
  doc.line(R - 7.0 - sig3W, sigY + 0.8, R - 7.0, sigY + 0.8);

  if (withAutoPrint) {
    doc.autoPrint();
  }

  return doc;
}
