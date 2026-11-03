export interface ClubbingRecord {
  id: string;
  clubbedAt: string;
  mrNo: string;
  finalArrivalNo: string;
  tempArrivalNo: string;
  arrivalDate: string;
  poNo: string;
  poDate: string;
  supplier: string;
  broker: string;
  area: string;
  lorryNumber: string;
  challanNo: string;
  packets: number;
  poNos: string[];
  amadNos: string[];
  totalPoLorries: number;
  receivedLorriesCount: number;
  totalPoWeight: number;
  totalReceivedWeight: number;
  variancePct: number;
  recordedBy: string;
  remarks: string;
}

export const parseJsonArray = (val: any, fallbackSingle?: any): string[] => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
  }
  if (fallbackSingle) return [String(fallbackSingle)];
  return [];
};

export const normalize = (val: any) => String(val || '').trim().toUpperCase();

export const cleanAlnum = (val: any) => String(val || '').trim().replace(/[^a-z0-9]/gi, '').toUpperCase();

export const extractCanonicalPoSerial = (raw: any): string => {
  const str = String(raw || '').trim().toUpperCase();
  if (!str || str === 'NO' || str === 'N/A' || str === 'NONE') return '';
  const isPtf = str.includes('PTF');
  const withoutPrefix = str
    .replace(/^BJCL\//i, '')
    .replace(/^BJC\//i, '')
    .replace(/^BJC/i, '')
    .replace(/^PO[-/]/i, '')
    .replace(/^PTF[-/]/i, '')
    .replace(/\(PTF\)/gi, '');
  const withoutYear = withoutPrefix
    .replace(/20\d{2}-20\d{2}/g, '')
    .replace(/20\d{2}\/20\d{2}/g, '')
    .replace(/20\d{2}20\d{2}/g, '')
    .replace(/\/\d{2}-\d{2}$/g, '')
    .replace(/^\d{2}-\d{2}\//g, '')
    .replace(/[^0-9A-Z]/g, '');
  if (!withoutYear) return '';
  const strippedZeros = withoutYear.replace(/^0+/, '') || '0';
  return isPtf ? `PTF_${strippedZeros}` : strippedZeros;
};

export const getPoMatchKeys = (candidates: any[]): string[] => {
  const keys = new Set<string>();
  const ignore = new Set(['', 'NO', 'NA', 'N/A', 'NONE', 'UNDEFINED', 'NULL', 'PENDING', 'NORMAL', 'SPECIAL']);
  for (const c of candidates) {
    const raw = normalize(c);
    if (!raw || ignore.has(raw)) continue;
    keys.add(`R:${raw}`);
    const alnum = cleanAlnum(raw);
    if (alnum && !ignore.has(alnum)) keys.add(`A:${alnum}`);
    const serial = extractCanonicalPoSerial(raw);
    if (serial) keys.add(`S:${serial}`);
  }
  return Array.from(keys);
};
