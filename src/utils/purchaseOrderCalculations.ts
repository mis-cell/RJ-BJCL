/**
 * Purchase Order Calculations & Satta Rate Integration
 * 
 * ALL Satta Rates for Purchase Orders originate strictly from the Supabase database tables
 * (satta_base_rates, satta_differentials, satta_calculated_rates).
 * NO HARDCODED RATES OR FALLBACK DATA.
 */

import {
  resolveSattaRate,
  fetchSingleSattaRate,
  SattaBaseRate,
  SattaDifferential,
  SattaCalculatedRate,
  SattaRateResult,
  normalizeGrade,
  getCandidateAreas
} from '../services/sattaRateService';

export {
  resolveSattaRate,
  fetchSingleSattaRate,
  normalizeGrade,
  getCandidateAreas
};

export type {
  SattaBaseRate,
  SattaDifferential,
  SattaCalculatedRate,
  SattaRateResult
};

export const PREDEFINED_RANKS: Record<string, number> = {
  // Top White / Mesta / Special
  'W1': 10, 'TD1': 10, 'M1': 10, 'BOT': 15,
  'W2': 20, 'TD2': 20, 'M2': 20, 'BTR': 25,
  'W3': 30, 'TD3': 30, 'M3': 30,
  'W4': 40, 'TD4': 40, 'M4': 40,
  'W5': 50, 'TD5': 50, 'M5': 50,
  'W6': 60, 'TD6': 60, 'M6': 60,
  'W7': 70, 'TD7': 70, 'M7': 70,
  'W8': 80, 'TD8': 80, 'M8': 80,
  'LOOSE': 90, 'DRUMS': 95, 'H.BALES': 100,
  'HABIJABI': 110, 'ROPE': 120, 'CUTTING': 130, 'TC': 140, 'REJECTION': 150
};

import { cleanSaudaNo } from '../lib/utils';

export const formatPoNumber = (sauda: any) => {
  if (!sauda) return '';
  const rawNo = String(sauda.sauda_no || sauda.no || sauda.contract_no || '').trim();
  const sessionVal = String(sauda.session || sauda.financial_year || '2026-2027');
  if (!rawNo) return `BJCL/${sessionVal}/Auto`;
  return cleanSaudaNo(rawNo, sessionVal);
};

export const compareQualities = (aStr: string, bStr: string): number => {
  const clean = (val: string) => {
    return (val || '')
      .toUpperCase()
      .trim()
      .replace(/[\s\-_]/g, '')
      .replace(/^ITEM\d*/, '')
      .trim();
  };

  const a = clean(aStr);
  const b = clean(bStr);

  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;

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
    const prefixB = matchB[1];
    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB);
    }
    const numA = parseInt(matchA[2], 10);
    const numB = parseInt(matchB[2], 10);
    if (numA !== numB) {
      return numA - numB;
    }
    return (matchA[3] || '').localeCompare(matchB[3] || '');
  }

  return a.localeCompare(b);
};

export const numberToWords = (num: number): string => {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() + ' Rupees Only';
};

/**
 * Calculates Satta Rate for a Purchase Order item strictly using Supabase data.
 * Returns the final Satta Rate (₹/Qtl), or null if the rate is not found in Supabase.
 */
export function getPurchaseOrderSattaRate(params: {
  agency?: string | null;
  area?: string | null;
  grade: string;
  date?: string | null;
  baseRate?: number | string | null;
  baseRates?: SattaBaseRate[];
  differentials?: SattaDifferential[];
  calculatedRates?: SattaCalculatedRate[];
}): SattaRateResult {
  return resolveSattaRate({
    agency: params.agency,
    area: params.area,
    grade: params.grade,
    date: params.date,
    customBaseRate: params.baseRate,
    baseRates: params.baseRates,
    differentials: params.differentials,
    calculatedRates: params.calculatedRates
  });
}
