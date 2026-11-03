import { getAuthenticatedUser } from "../../lib/userResolver";

// Canonical fallback matching /public/templates/settlement_template.csv & /public/assets/aistudio/templest_a48a2340.csv
export const DEFAULT_SETTLEMENT_TEMPLATE_CSV = `BALLY JUTE COMPANY LIMITED,,,,,,,,,,,,,,,,,,,,,,
,  Powered by KatEye™,,,"Printed On : 28/10/26 by ADMIN, No of Times Printed - THREE       ",,,,,,,,,,,,,,,,,,
,  MR No.,,:,,,Date,:,,,Party Bill No,,,,,,,,,,,,
 ,  Supplier,,:,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,  Broker,,:,,,,,,,,,,,,,,,,,,,
,  Order No,,:,,,Date,:,,,Party Bill Date,,,,,,,,,,,,
,  Area/Agency,,:,,,,,,,,,,,,,,,,,,,
,  Consign No.,,:,,,,,,,,,,,,,,,,,,,
,  Way Bill,,:,,,,,,,,,,,,,,,,,,,
,  Pan No.,,:,,,,,,,,,,,,,,,,,,,
,Grade,Marka,Quantity,Unit,"P.O
Rate",Type,Claim,Sett.,"Rate
(+/-)","Sett.
Rate",Value,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,Grd.Down:,,,,,,,,,,,,,,,,
,,,,,,Moisture:,,,,,,,,,,,,,,,,
,,,,,,Premium:,,,,,,,,,,,,,,,,
,,,,,,Total:,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Miscellaneous Charges,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,  Remarks :-,,,,,,,,,,,,,,,,,,,,,
,  Note:,,,,,,  Material Value,,,:,,,,,,,,,,,,
,  On A/c Total Advance,,,,: Rs.   0.00,,  Material Misc(+),,,:,,,,,,,,,,,,
,  On A/c Total Adv. Adjusted,,,,: Rs.   0.00,,  Material Misc(-),,,:,,,,,,,,,,,,
,  Balance Amount,,,,: Rs.   0.00,,  Total MR Amount,,,:,,,,,,,,,,,,
,On A/c Adv. Adjustment Made Against This MR,,,,,,MR Advance Amount,,,:,,,,,,,,,,,,
,Cheque No,,Date,,Adjusted Value,, Balance Due(Rounded),,,:,0,,,,,,,,,,,
,,,,,,, On A/c Adv. Adjusted Amount :,,,,0,,,,,,,,,,,
,,,,,,,Net Amount to be Paid,,,:,,,,,,,,,,,,
,,,,,,,Rs. :  EIGHTEEN LAKH FIFTY THOUSAND NINE HUNDRED FORTY THREE ONLY,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Prepared by,,,,,Checked by,,,,Authorised Signatory,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,`;

export function parseCsvToGrid(csvText: string, minRows = 58, minCols = 23): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const cleanText = csvText.replace(/^\uFEFF/, "");

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const nextCh = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\r" && nextCh === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  while (rows.length < minRows) {
    rows.push(Array(minCols).fill(""));
  }

  return rows.map((r) => {
    const copy = [...r];
    while (copy.length < minCols) copy.push("");
    return copy;
  });
}

export function formatDateDdMmYyyyHyphen(dateStr?: string): string {
  if (!dateStr) return "";
  const trimmed = String(dateStr).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split("T")[0].split("-");
    return `${d}-${m}-${y}`;
  }
  const dt = new Date(trimmed);
  if (!isNaN(dt.getTime())) {
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const y = dt.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return trimmed;
}

export function formatDateDdMmYySlash(dateStr?: string): string {
  if (!dateStr) return "";
  const trimmed = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split("T")[0].split("-");
    return `${d}/${m}/${y.slice(-2)}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("-");
    return `${d}/${m}/${y.slice(-2)}`;
  }
  const dt = new Date(trimmed);
  if (!isNaN(dt.getTime())) {
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const y = String(dt.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  }
  return trimmed;
}

export function formatIndAmount(val: number): string {
  const num = Number(val) || 0;
  if (Math.abs(num) < 0.005) return "0.00";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function countToEnglishWord(num: number): string {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n <= 0) return "ONE";
  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  if (n < 20) return ones[n];
  if (n < 100) {
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    return o ? `${t} ${o}` : t;
  }
  if (n < 1000) {
    const h = ones[Math.floor(n / 100)] + " HUNDRED";
    const rem = n % 100;
    return rem > 0 ? `${h} ${countToEnglishWord(rem)}` : h;
  }
  return String(n);
}

export function numberToIndianWords(num: number): string {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "ZERO";

  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  const convertBelowThousand = (val: number): string => {
    let str = "";
    if (val >= 100) {
      str += ones[Math.floor(val / 100)] + " HUNDRED ";
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += ones[val] + " ";
    }
    return str.trim();
  };

  let words = "";
  let rem = n;

  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  if (crore > 0) {
    words += convertBelowThousand(crore) + " CRORE ";
  }

  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + " LAKH ";
  }

  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + " THOUSAND ";
  }

  if (rem > 0) {
    words += convertBelowThousand(rem);
  }

  return words.trim().replace(/\s+/g, " ");
}

export function resolveLoggedInPrintUserName(): string {
  try {
    const auth = getAuthenticatedUser();
    if (auth.username && auth.username.toUpperCase() !== "UNKNOWN USER") {
      return auth.username.toUpperCase();
    }
  } catch {}

  try {
    const rawSess = typeof window !== "undefined" ? localStorage.getItem("bally_auth_session") : null;
    if (rawSess) {
      const parsed = JSON.parse(rawSess);
      const name = parsed?.username || parsed?.userName || parsed?.name || parsed?.userId;
      if (name) return String(name).toUpperCase();
    }
  } catch {}

  try {
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("logged_in_user") : null;
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const name = parsed?.username || parsed?.name;
      if (name) return String(name).toUpperCase();
    }
  } catch {}

  return "ADMIN";
}
