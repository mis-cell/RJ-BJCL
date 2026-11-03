import { Sauda } from '../types';

export interface ExtractedSmsDeal {
  isDealMessage: boolean;
  confidenceReason?: string;
  saudaNo?: string;
  broker?: string;
  supplier?: string;
  area?: string;
  marka?: string;
  grades: string[];
  rate?: number;
  secondaryRate?: number;
  noOfLorries?: number;
  totalUnit?: number; // Bales
  unitType: string; // 'BALES' | 'LOOSE' | 'LORRIES'
  deliveryDate?: string;
  deliveryDays?: number;
  rawText: string;
  senderName: string;
  senderPhone?: string;
  date?: string;
}

export type MatchStatus = 'match' | 'diff' | 'missing_in_sms' | 'missing_in_sauda';

export interface FieldComparison {
  field: string;
  label: string;
  smsVal: string;
  saudaVal: string;
  status: MatchStatus;
  weight: number;
}

export interface SaudaMatchResult {
  sauda: Sauda;
  score: number; // 0 - 100
  confidence: 'strong' | 'likely' | 'possible' | 'weak' | 'none';
  fieldComparisons: FieldComparison[];
  matchedSummary: string[];
}

// Known market areas & mukams in Jute trading
const KNOWN_AREAS = [
  'PURNEA (LOOSE)', 'PURNEA LOOSE', 'PURNEA(BIHAR)', 'PURNEA (BIHAR)',
  'PURNEA', 'PURNIA', 'FORBESGANJ', 'KISHANGANJ', 'SEMI NORTHERN', 'SEMI-NORTHERN',
  'NORTHERN', 'WEST BENGAL', 'ASSAM', 'BIHAR', 'WHITE', 'TOSA', 'ISLAMPUR',
  'RAIGANJ', 'SILIGURI', 'DALKOLA', 'KATIHAR', 'MALDA', 'SAHARSA', 'SUPAUL',
  'DAISEE', 'TULSIHATTA', 'BANGLADESH', 'GRP LOOSE', 'L/A TARABARI', 'U/ASSAM',
  'KANKI', 'DHULIYAAN', 'SAMSI JUNGLE', 'GAJAL LOOSE', 'BADURIA', 'BASIRHAT',
  'GOLABRI D/D', 'HARIPAL', 'MAYNA D/S', 'S/N ISLAMPUR', 'SHEORAPHULLY',
  'GRP MESTA LOOSE', 'S/N MESTA'
];

// Clean and normalize strings for fuzzy comparisons
export const normalizeText = (text?: string): string => {
  if (!text) return '';
  return text
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Check if string contains word (with word boundaries or substring match)
export const containsNormalized = (source?: string, target?: string): boolean => {
  const normSource = normalizeText(source);
  const normTarget = normalizeText(target);
  if (!normSource || !normTarget) return false;
  if (normSource === normTarget) return true;
  if (normSource.includes(normTarget) || normTarget.includes(normSource)) return true;
  
  // Also check individual words
  const sourceWords = normSource.split(' ').filter(w => w.length > 2);
  const targetWords = normTarget.split(' ').filter(w => w.length > 2);
  return sourceWords.some(sw => targetWords.some(tw => sw === tw || sw.includes(tw) || tw.includes(sw)));
};

/**
 * Smart Deal Token Extractor for Raw SMS Messages
 */
export function extractSmsEntities(
  rawBody: string,
  senderName: string = '',
  senderPhone: string = '',
  msgDate: string = ''
): ExtractedSmsDeal {
  const text = (rawBody || '').trim();
  const clean = text.replace(/\r\n/g, '\n');
  const upper = clean.toUpperCase();

  // 1. Detect if it's a non-deal message (e.g., generic greeting, OTP, inquiry, very short)
  const isTooShort = clean.length < 10;
  const isGreeting = /^(HI|HELLO|DEAR SIR|GOOD MORNING|GOOD EVENING|NAMASTE|PRANAM|CALL ME|PLEASE CALL|THANKS|OK|OKAY|YES|NO)\.?$/i.test(clean.trim());
  const hasNoNumbers = !/\d/.test(clean);
  
  // Common rate patterns: 4-6 digit rates (e.g., 12500, 16300, 7200, 8900, 12700/12300, @12700, Rate 12700, Rs. 16300)
  const rateMatch = clean.match(/(?:(?:RATE|RS\.?|INR|@|B\.?RATE|PRICING)\s*[:=-]?\s*)?(\b[5-9]\d{3}\b|\b1\d{4}\b|\b2\d{4}\b)(?:\s*[\/\-]\s*(\b[5-9]\d{3}\b|\b1\d{4}\b))?/i);
  let rate: number | undefined;
  let secondaryRate: number | undefined;
  if (rateMatch) {
    rate = parseInt(rateMatch[1], 10);
    if (rateMatch[2]) {
      secondaryRate = parseInt(rateMatch[2], 10);
    }
  }

  // Common Lorry / Bale patterns:
  // e.g. "5 Lorry", "5 Lorries", "1 Lorry", "2 L", "81 Bales", "150 Bales", "300 B", "150 BALES", "100 BAGS"
  let noOfLorries: number | undefined;
  let totalUnit: number | undefined;
  let unitType = 'BALES';

  const lorryMatch = clean.match(/(\d+)\s*(?:LORRIES|LORRY|LORRIES|LR|GADI|TRUCK|TRUCKS)/i);
  if (lorryMatch) {
    noOfLorries = parseInt(lorryMatch[1], 10);
  }

  const balesMatch = clean.match(/(\d+)\s*(?:BALES|BALE|BLS|BAGS|PKTS|PACKETS|UNIT|UNITS)/i);
  if (balesMatch) {
    totalUnit = parseInt(balesMatch[1], 10);
    unitType = 'BALES';
  } else if (upper.includes('LOOSE') || upper.includes('KHULLA')) {
    unitType = 'LOOSE';
  }

  // If no bales found explicitly, but lorries found, standard default is 150 bales per lorry
  if (!totalUnit && noOfLorries) {
    totalUnit = noOfLorries * 150;
  }

  // Common Grades: TD1, TD2, TD3, TD4, TD5, TD6, TD7, TD8, W1..W8, M1..M8, BTC, BTR, BOT, MOT
  const gradeMatches = clean.match(/\b(TD[- ]?[1-8]|W[- ]?[1-8]|M[- ]?[1-8]|BTC|BTR|BOT|MOT|NORMAL|SUPERIOR)\b/gi) || [];
  const grades = Array.from(new Set(gradeMatches.map(g => g.replace(/[- ]/g, '').toUpperCase())));

  // Common Sauda / Order / Slip Number patterns:
  // e.g., "BJCL/2026-2027/0483", "0483", "BJCL/0483", "Sauda # 483", "Slip: 7017TD", "PO 483", "S# 123"
  let saudaNo: string | undefined;
  const saudaNoMatch = clean.match(/(?:BJCL[\/\-_]?(?:20\d{2}[-_]20\d{2}[\/\-_]?)?)(\d{3,5}[A-Z]*)/i)
    || clean.match(/(?:SAUDA\s*(?:NO\.?|#)?\s*[:=-]?\s*)(\w{3,8})/i)
    || clean.match(/(?:SLIP\s*(?:NO\.?|#)?\s*[:=-]?\s*)(\w{3,8})/i)
    || clean.match(/(?:ORDER\s*(?:NO\.?|#)?\s*[:=-]?\s*)(\w{3,8})/i)
    || clean.match(/(?:PO\s*(?:NO\.?|#)?\s*[:=-]?\s*)(\w{3,8})/i);

  if (saudaNoMatch) {
    saudaNo = saudaNoMatch[1].toUpperCase();
  }

  // Area / Mukam search
  let area: string | undefined;
  for (const a of KNOWN_AREAS) {
    if (upper.includes(a)) {
      area = a === 'PURNIA' ? 'PURNEA' : a;
      break;
    }
  }

  // Marka search (e.g. "Marka Hemant", "Marka: SSB", "BALAJI", "M/S ...")
  let marka: string | undefined;
  const markaMatch = clean.match(/(?:MARKA|MARK|MARKA:)\s*[:=-]?\s*([A-Z0-9\s\-]+?)(?:\n|,|$|\/)/i);
  if (markaMatch && markaMatch[1].trim().length > 1) {
    marka = markaMatch[1].trim().toUpperCase();
  }

  // Broker & Supplier extraction
  let broker = senderName ? senderName.trim() : '';
  let supplier = '';
  const supplierMatch = clean.match(/(?:SUPPLIER|PARTY|SELLER|VYAPARI|TRADER|MERCHANT)\s*[:=-]?\s*([A-Z0-9\s\.\&]+?)(?:\n|,|$|\/)/i);
  if (supplierMatch && supplierMatch[1].trim().length > 2) {
    supplier = supplierMatch[1].trim();
  }

  // Check if deal message
  const hasDealTokens = Boolean(rate || totalUnit || noOfLorries || grades.length > 0 || saudaNo || (area && (rate || grades.length)));
  const isDealMessage = hasDealTokens && !isGreeting && !isTooShort;

  return {
    isDealMessage,
    confidenceReason: isDealMessage ? undefined : (isGreeting ? 'Generic Greeting / Inquiry' : (isTooShort ? 'Text too short' : (hasNoNumbers ? 'No quantity or rate info' : 'Missing essential deal parameters'))),
    saudaNo,
    broker,
    supplier,
    area,
    marka,
    grades,
    rate,
    secondaryRate,
    noOfLorries,
    totalUnit,
    unitType,
    date: msgDate,
    rawText: clean,
    senderName,
    senderPhone
  };
}

/**
 * Weighted Sauda Matcher
 * Compares an Extracted SMS Deal against a single Sauda record from `sauda_master`
 */
export function calculateSaudaMatch(
  smsDeal: ExtractedSmsDeal,
  sauda: Sauda
): SaudaMatchResult {
  const fieldComparisons: FieldComparison[] = [];
  const matchedSummary: string[] = [];

  if (!smsDeal.isDealMessage) {
    return {
      sauda,
      score: 0,
      confidence: 'none',
      fieldComparisons: [
        {
          field: 'general',
          label: 'Deal Message State',
          smsVal: 'Non-Deal / Generic SMS',
          saudaVal: `#${sauda.sauda_no}`,
          status: 'diff',
          weight: 0
        }
      ],
      matchedSummary: ['No deal parameters found in SMS']
    };
  }

  let totalWeight = 0;
  let earnedScore = 0;

  // 1. Sauda Number Match (Weight: 40 pts)
  const normSmsSaudaNo = normalizeText(smsDeal.saudaNo);
  const normMasterSaudaNo = normalizeText(sauda.sauda_no);
  const normSession = normalizeText(sauda.session);

  if (normSmsSaudaNo) {
    totalWeight += 40;
    if (
      normMasterSaudaNo.includes(normSmsSaudaNo) ||
      normSmsSaudaNo.includes(normMasterSaudaNo) ||
      (normSession && normSession.includes(normSmsSaudaNo))
    ) {
      earnedScore += 40;
      matchedSummary.push(`Exact Sauda No #${sauda.sauda_no}`);
      fieldComparisons.push({
        field: 'sauda_no',
        label: 'Sauda / Order #',
        smsVal: smsDeal.saudaNo || '',
        saudaVal: sauda.sauda_no || '',
        status: 'match',
        weight: 40
      });
    } else {
      fieldComparisons.push({
        field: 'sauda_no',
        label: 'Sauda / Order #',
        smsVal: smsDeal.saudaNo || '',
        saudaVal: sauda.sauda_no || '',
        status: 'diff',
        weight: 40
      });
    }
  } else {
    fieldComparisons.push({
      field: 'sauda_no',
      label: 'Sauda / Order #',
      smsVal: '—',
      saudaVal: sauda.sauda_no || '',
      status: 'missing_in_sms',
      weight: 0
    });
  }

  // 2. Broker / Vyapari Match (Weight: 30 pts)
  const normSmsBroker = normalizeText(smsDeal.broker || smsDeal.senderName);
  const normSaudaBroker = normalizeText(sauda.broker);
  const normSaudaSupplier = normalizeText(sauda.supplier);

  if (normSmsBroker) {
    totalWeight += 30;
    if (containsNormalized(normSaudaBroker, normSmsBroker) || containsNormalized(normSaudaSupplier, normSmsBroker)) {
      earnedScore += 30;
      matchedSummary.push(`Broker / Sender: ${sauda.broker || smsDeal.senderName}`);
      fieldComparisons.push({
        field: 'broker',
        label: 'Broker / Sender',
        smsVal: smsDeal.senderName || smsDeal.broker || '',
        saudaVal: sauda.broker || '',
        status: 'match',
        weight: 30
      });
    } else {
      fieldComparisons.push({
        field: 'broker',
        label: 'Broker / Sender',
        smsVal: smsDeal.senderName || smsDeal.broker || '',
        saudaVal: sauda.broker || '',
        status: 'diff',
        weight: 30
      });
    }
  } else {
    fieldComparisons.push({
      field: 'broker',
      label: 'Broker / Sender',
      smsVal: '—',
      saudaVal: sauda.broker || '',
      status: 'missing_in_sms',
      weight: 0
    });
  }

  // 3. Rate Match (Weight: 20 pts)
  const saudaRate = sauda.b_rate || (sauda.quality_details && sauda.quality_details[0]?.rs) || 0;
  if (smsDeal.rate) {
    totalWeight += 20;
    const diff = Math.abs(smsDeal.rate - saudaRate);
    if (diff === 0 || (smsDeal.secondaryRate && Math.abs(smsDeal.secondaryRate - saudaRate) === 0)) {
      earnedScore += 20;
      matchedSummary.push(`Exact Rate ₹${saudaRate}`);
      fieldComparisons.push({
        field: 'rate',
        label: 'Rate (₹/Qtl)',
        smsVal: `₹${smsDeal.rate}${smsDeal.secondaryRate ? ` / ₹${smsDeal.secondaryRate}` : ''}`,
        saudaVal: `₹${saudaRate}`,
        status: 'match',
        weight: 20
      });
    } else if (diff <= 50) {
      earnedScore += 12; // Proximity rate match
      matchedSummary.push(`Close Rate ₹${saudaRate} (±${diff})`);
      fieldComparisons.push({
        field: 'rate',
        label: 'Rate (₹/Qtl)',
        smsVal: `₹${smsDeal.rate}`,
        saudaVal: `₹${saudaRate}`,
        status: 'match',
        weight: 20
      });
    } else {
      fieldComparisons.push({
        field: 'rate',
        label: 'Rate (₹/Qtl)',
        smsVal: `₹${smsDeal.rate}`,
        saudaVal: `₹${saudaRate}`,
        status: 'diff',
        weight: 20
      });
    }
  } else {
    fieldComparisons.push({
      field: 'rate',
      label: 'Rate (₹/Qtl)',
      smsVal: '—',
      saudaVal: saudaRate ? `₹${saudaRate}` : '—',
      status: 'missing_in_sms',
      weight: 0
    });
  }

  // 4. Quantity / Units / Lorries Match (Weight: 15 pts)
  const saudaUnits = sauda.total_unit || 0;
  const saudaLorries = sauda.no_of_lorries || sauda.total_lorry || 0;

  if (smsDeal.totalUnit || smsDeal.noOfLorries) {
    totalWeight += 15;
    const isUnitExact = smsDeal.totalUnit && saudaUnits && smsDeal.totalUnit === saudaUnits;
    const isLorryExact = smsDeal.noOfLorries && saudaLorries && smsDeal.noOfLorries === saudaLorries;

    if (isUnitExact || isLorryExact) {
      earnedScore += 15;
      matchedSummary.push(`Quantity: ${saudaUnits} Bales (${saudaLorries} Lorries)`);
      fieldComparisons.push({
        field: 'quantity',
        label: 'Total Units / Lorries',
        smsVal: `${smsDeal.totalUnit ? `${smsDeal.totalUnit} Bales` : ''} ${smsDeal.noOfLorries ? `(${smsDeal.noOfLorries} Lorries)` : ''}`.trim(),
        saudaVal: `${saudaUnits} Bales (${saudaLorries} Lorries)`,
        status: 'match',
        weight: 15
      });
    } else {
      fieldComparisons.push({
        field: 'quantity',
        label: 'Total Units / Lorries',
        smsVal: `${smsDeal.totalUnit ? `${smsDeal.totalUnit} Bales` : ''} ${smsDeal.noOfLorries ? `(${smsDeal.noOfLorries} Lorries)` : ''}`.trim(),
        saudaVal: `${saudaUnits} Bales (${saudaLorries} Lorries)`,
        status: 'diff',
        weight: 15
      });
    }
  } else {
    fieldComparisons.push({
      field: 'quantity',
      label: 'Total Units / Lorries',
      smsVal: '—',
      saudaVal: `${saudaUnits} Bales (${saudaLorries} Lorries)`,
      status: 'missing_in_sms',
      weight: 0
    });
  }

  // 5. Area / Center Match (Weight: 10 pts)
  const normSmsArea = normalizeText(smsDeal.area);
  const normSaudaArea = normalizeText(sauda.area);

  if (normSmsArea) {
    totalWeight += 10;
    if (containsNormalized(normSaudaArea, normSmsArea)) {
      earnedScore += 10;
      matchedSummary.push(`Area: ${sauda.area || smsDeal.area}`);
      fieldComparisons.push({
        field: 'area',
        label: 'Area / Center',
        smsVal: smsDeal.area || '',
        saudaVal: sauda.area || '',
        status: 'match',
        weight: 10
      });
    } else {
      fieldComparisons.push({
        field: 'area',
        label: 'Area / Center',
        smsVal: smsDeal.area || '',
        saudaVal: sauda.area || '',
        status: 'diff',
        weight: 10
      });
    }
  } else {
    fieldComparisons.push({
      field: 'area',
      label: 'Area / Center',
      smsVal: '—',
      saudaVal: sauda.area || '',
      status: 'missing_in_sms',
      weight: 0
    });
  }

  // 6. Grade / Quality Match (Weight: 10 pts)
  if (smsDeal.grades && smsDeal.grades.length > 0) {
    totalWeight += 10;
    const saudaGrades = (sauda.quality_details || []).map(q => normalizeText(q.quality)).join(' ') + ' ' + normalizeText(sauda.marks);
    const hasMatchingGrade = smsDeal.grades.some(g => saudaGrades.includes(normalizeText(g)));

    if (hasMatchingGrade) {
      earnedScore += 10;
      matchedSummary.push(`Grade: ${smsDeal.grades.join(', ')}`);
      fieldComparisons.push({
        field: 'grades',
        label: 'Quality / Grade',
        smsVal: smsDeal.grades.join(', '),
        saudaVal: (sauda.quality_details || []).map(q => q.quality).join(', ') || sauda.marks || '',
        status: 'match',
        weight: 10
      });
    } else {
      fieldComparisons.push({
        field: 'grades',
        label: 'Quality / Grade',
        smsVal: smsDeal.grades.join(', '),
        saudaVal: (sauda.quality_details || []).map(q => q.quality).join(', ') || sauda.marks || '',
        status: 'diff',
        weight: 10
      });
    }
  } else {
    fieldComparisons.push({
      field: 'grades',
      label: 'Quality / Grade',
      smsVal: '—',
      saudaVal: (sauda.quality_details || []).map(q => q.quality).join(', ') || sauda.marks || '',
      status: 'missing_in_sms',
      weight: 0
    });
  }

  // 7. Date Proximity Match (Weight: 10 pts)
  if (smsDeal.date && sauda.date) {
    totalWeight += 10;
    try {
      const smsTime = new Date(smsDeal.date).getTime();
      const saudaTime = new Date(sauda.date).getTime();
      const diffDays = Math.abs(smsTime - saudaTime) / (1000 * 60 * 60 * 24);

      if (diffDays <= 2) {
        earnedScore += 10;
        matchedSummary.push(`Date: ${sauda.date}`);
        fieldComparisons.push({
          field: 'date',
          label: 'Date Proximity',
          smsVal: smsDeal.date,
          saudaVal: sauda.date,
          status: 'match',
          weight: 10
        });
      } else if (diffDays <= 7) {
        earnedScore += 5;
        fieldComparisons.push({
          field: 'date',
          label: 'Date Proximity',
          smsVal: smsDeal.date,
          saudaVal: sauda.date,
          status: 'match',
          weight: 10
        });
      } else {
        fieldComparisons.push({
          field: 'date',
          label: 'Date Proximity',
          smsVal: smsDeal.date,
          saudaVal: sauda.date,
          status: 'diff',
          weight: 10
        });
      }
    } catch {
      // Date parse error
    }
  }

  // Calculate final percentage score
  let finalScore = 0;
  if (totalWeight > 0) {
    finalScore = Math.min(100, Math.round((earnedScore / totalWeight) * 100));
  }

  // Confidence Tier classification
  let confidence: 'strong' | 'likely' | 'possible' | 'weak' | 'none';
  if (finalScore >= 90) {
    confidence = 'strong';
  } else if (finalScore >= 75) {
    confidence = 'likely';
  } else if (finalScore >= 50) {
    confidence = 'possible';
  } else if (finalScore >= 20) {
    confidence = 'weak';
  } else {
    confidence = 'none';
  }

  return {
    sauda,
    score: finalScore,
    confidence,
    fieldComparisons,
    matchedSummary
  };
}

/**
 * Filter & Rank top matches for an SMS from a list of Sauda Desk records
 */
export function findTopSaudaMatches(
  smsDeal: ExtractedSmsDeal,
  saudas: Sauda[],
  limit = 5
): SaudaMatchResult[] {
  if (!smsDeal.isDealMessage || saudas.length === 0) {
    return [];
  }

  // Fast pre-filter candidates by broker, rate proximity, or sauda_no to optimize performance
  const scored = saudas.map(s => calculateSaudaMatch(smsDeal, s));

  // Sort descending by score, then by date descending
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.sauda.date || 0).getTime();
    const timeB = new Date(b.sauda.date || 0).getTime();
    return timeB - timeA;
  });

  return scored.slice(0, limit);
}
