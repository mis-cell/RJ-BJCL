// Complete grades list in order from the official Satta chart specification
export const ALL_GRADES = [
  'TD3', 'TD4', 'TD5', 'TD6', 'TD7', 'TD8', 'TD9', 'TD10',
  'BTR HD KS', 'BTR HD CS', 'BTR HD BS', 'BTR NB KS', 'BTR NB FFS', 'BTR NB (SMR)',
  'W5', 'W6', 'LOOSE', 'P.BALES', 'H.BALES', 'HBJB', 'ROPES', 'CUTTING',
  'TH.WASTE', 'RRY CUTT', 'M.S.MID', 'M.MID', 'M.BOT', 'M.B.BOT', 'M.X.BOT',
  'BOT', 'B.BOT', 'X.BOT', 'DRUMS'
];

export const MONTH_COLS = [
  { name: 'APR', month: '04', days: 30, yearOffset: 0 },
  { name: 'MAY', month: '05', days: 31, yearOffset: 0 },
  { name: 'JUN', month: '06', days: 30, yearOffset: 0 },
  { name: 'JUL', month: '07', days: 31, yearOffset: 0 },
  { name: 'AUG', month: '08', days: 31, yearOffset: 0 },
  { name: 'SEP', month: '09', days: 30, yearOffset: 0 },
  { name: 'OCT', month: '10', days: 31, yearOffset: 0 },
  { name: 'NOV', month: '11', days: 30, yearOffset: 0 },
  { name: 'DEC', month: '12', days: 31, yearOffset: 0 },
  { name: 'JAN', month: '01', days: 31, yearOffset: 1 },
  { name: 'FEB', month: '02', days: 28, yearOffset: 1 },
  { name: 'MAR', month: '03', days: 31, yearOffset: 1 }
];

export interface AreaDifferential {
  area: string;
  diffs: Record<string, number>;
}

export const formatDateDMY = (dateStr: string | null) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export const formatDateTime = (isoStr?: string | null) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}-${month}-${year} ${timeStr}`;
};
