export interface FinalArrivalIndex {
  tempToMr: Map<string, string>;
  mrToRecord: Map<string, any>;
  mrToLinkedTemps: Map<string, Set<string>>;
  finalizedTempSet: Set<string>;
  allFinalKeysSet: Set<string>;
}

const INVALID_TOKENS = new Set(['', '-', '--', 'N/A', 'NA', 'NONE', 'NO', 'NULL', 'UNDEFINED']);

export function normalizeArrivalToken(val: any): string {
  if (val === undefined || val === null) return '';
  const trimmed = String(val).trim().toUpperCase();
  if (INVALID_TOKENS.has(trimmed)) return '';
  return trimmed;
}

export function cleanArrivalDisplay(val: any): string {
  if (val === undefined || val === null) return '';
  const trimmed = String(val).trim();
  if (INVALID_TOKENS.has(trimmed.toUpperCase())) return '';
  return trimmed;
}

export function isMrIdentifier(val: any): boolean {
  const norm = normalizeArrivalToken(val);
  if (!norm) return false;
  return /^MR[-/\s_]*\d+/i.test(norm) || /^MR/i.test(norm);
}

export function isTempArrivalIdentifier(val: any): boolean {
  const norm = normalizeArrivalToken(val);
  if (!norm) return false;
  return /^(AR|AMAD|TEMP)[-/\s_]*\d+/i.test(norm) || /^(AR|AMAD|TEMP)/i.test(norm);
}

export function extractFinalArrivalOfficialMr(fa: any): string {
  if (!fa || typeof fa !== 'object') return '';
  const candidates = [
    cleanArrivalDisplay(fa.mr_no),
    cleanArrivalDisplay(fa.final_arrival_no),
    cleanArrivalDisplay(fa.arrival_no),
  ].filter(Boolean);

  // Prefer explicit MR identifier first
  const mrCandidate = candidates.find((c) => isMrIdentifier(c));
  if (mrCandidate) return mrCandidate;

  // Next prefer whichever is not identical to temporary_arrival_no
  const tempNorm = normalizeArrivalToken(fa.temporary_arrival_no || fa.temp_arrival_no || fa.amad_no);
  const nonTempCandidate = candidates.find((c) => normalizeArrivalToken(c) !== tempNorm);
  if (nonTempCandidate) return nonTempCandidate;

  return candidates[0] || '';
}

export function extractFinalArrivalLinkedTemp(fa: any): string {
  if (!fa || typeof fa !== 'object') return '';
  const directTemp =
    cleanArrivalDisplay(fa.temporary_arrival_no) ||
    cleanArrivalDisplay(fa.temp_arrival_no) ||
    cleanArrivalDisplay(fa.amad_no);
  if (directTemp) return directTemp;

  const arrivalNo = cleanArrivalDisplay(fa.arrival_no);
  if (arrivalNo && isTempArrivalIdentifier(arrivalNo)) {
    return arrivalNo;
  }
  return '';
}

function getRowRichnessScore(row: any): number {
  if (!row || typeof row !== 'object') return 0;
  let score = 0;
  if (isMrIdentifier(row.mr_no) || isMrIdentifier(row.final_arrival_no)) score += 4;
  if (cleanArrivalDisplay(row.supplier) || cleanArrivalDisplay(row.supplier_name)) score += 2;
  if (cleanArrivalDisplay(row.lorry_number) || cleanArrivalDisplay(row.lorry_no)) score += 2;
  if (row.grid_details || row.details) score += 3;
  if (Number(row.electronic_net_weight || row.weight_qtl || row.weight || 0) > 0) score += 2;
  if (cleanArrivalDisplay(row.po_no)) score += 1;
  return score;
}

export function buildFinalArrivalIndex(finalArrivals: any[] = []): FinalArrivalIndex {
  const tempToMr = new Map<string, string>();
  const mrToRecord = new Map<string, any>();
  const mrToLinkedTemps = new Map<string, Set<string>>();
  const finalizedTempSet = new Set<string>();
  const allFinalKeysSet = new Set<string>();

  for (const fa of finalArrivals || []) {
    if (!fa || typeof fa !== 'object') continue;
    const officialMr = extractFinalArrivalOfficialMr(fa);
    const officialMrNorm = normalizeArrivalToken(officialMr);
    if (!officialMrNorm) continue;

    allFinalKeysSet.add(officialMrNorm);

    const existingRec = mrToRecord.get(officialMrNorm);
    if (!existingRec || getRowRichnessScore(fa) > getRowRichnessScore(existingRec)) {
      mrToRecord.set(officialMrNorm, fa);
    }

    const tempCandidates = [
      cleanArrivalDisplay(fa.temporary_arrival_no),
      cleanArrivalDisplay(fa.temp_arrival_no),
      cleanArrivalDisplay(fa.amad_no),
      cleanArrivalDisplay(fa.arrival_no),
    ].filter(Boolean);

    let linkedSet = mrToLinkedTemps.get(officialMrNorm);
    if (!linkedSet) {
      linkedSet = new Set<string>();
      mrToLinkedTemps.set(officialMrNorm, linkedSet);
    }

    for (const tc of tempCandidates) {
      const tcNorm = normalizeArrivalToken(tc);
      if (!tcNorm || tcNorm === officialMrNorm) continue;
      // Only treat as a temp/arrival alias (never overwrite if another official MR)
      if (!isMrIdentifier(tcNorm) || tcNorm === normalizeArrivalToken(fa.arrival_no)) {
        tempToMr.set(tcNorm, officialMr);
        linkedSet.add(tc);
        allFinalKeysSet.add(tcNorm);
        if (isTempArrivalIdentifier(tcNorm) || tcNorm === normalizeArrivalToken(fa.temporary_arrival_no)) {
          finalizedTempSet.add(tcNorm);
        }
      }
    }

    // Also register final_arrival_no & mr_no aliases if they differ in formatting
    for (const alias of [fa.final_arrival_no, fa.mr_no, fa.arrival_no]) {
      const aClean = cleanArrivalDisplay(alias);
      const aNorm = normalizeArrivalToken(aClean);
      if (!aNorm) continue;
      allFinalKeysSet.add(aNorm);
      if (aNorm !== officialMrNorm && !mrToRecord.has(aNorm)) {
        tempToMr.set(aNorm, officialMr);
      }
    }
  }

  return {
    tempToMr,
    mrToRecord,
    mrToLinkedTemps,
    finalizedTempSet,
    allFinalKeysSet,
  };
}

export function resolveOfficialArrivalId(
  rawId: any,
  index?: FinalArrivalIndex | null
): string {
  const cleaned = cleanArrivalDisplay(rawId);
  if (!cleaned) return '';
  const norm = normalizeArrivalToken(cleaned);
  if (!index) return cleaned;

  const mappedMr = index.tempToMr.get(norm);
  if (mappedMr) return mappedMr;

  const faRec = index.mrToRecord.get(norm);
  if (faRec) {
    return extractFinalArrivalOfficialMr(faRec) || cleaned;
  }

  return cleaned;
}

export function resolveRecordOfficialArrivalId(
  record: any,
  index?: FinalArrivalIndex | null
): {
  officialId: string;
  linkedTempNo: string;
  isFinalized: boolean;
} {
  if (!record || typeof record !== 'object') {
    return { officialId: '', linkedTempNo: '', isFinalized: false };
  }

  const rawMr = cleanArrivalDisplay(record.mr_no);
  const rawFa = cleanArrivalDisplay(record.final_arrival_no);
  const rawArr = cleanArrivalDisplay(record.arrival_no);
  const rawTemp =
    cleanArrivalDisplay(record.temporary_arrival_no) ||
    cleanArrivalDisplay(record.temp_arrival_no) ||
    cleanArrivalDisplay(record.amad_no);

  const candidates = [rawMr, rawFa, rawArr, rawTemp].filter(Boolean);

  if (index) {
    // 1. Check if any candidate maps directly to a finalized MR in final_arrival index
    for (const c of candidates) {
      const norm = normalizeArrivalToken(c);
      if (index.mrToRecord.has(norm)) {
        const officialId = extractFinalArrivalOfficialMr(index.mrToRecord.get(norm)) || c;
        const faTemp = extractFinalArrivalLinkedTemp(index.mrToRecord.get(norm));
        return {
          officialId,
          linkedTempNo: rawTemp || faTemp,
          isFinalized: true,
        };
      }
      const mapped = index.tempToMr.get(norm);
      if (mapped) {
        const mappedNorm = normalizeArrivalToken(mapped);
        const faRec = index.mrToRecord.get(mappedNorm);
        const faTemp = faRec ? extractFinalArrivalLinkedTemp(faRec) : '';
        return {
          officialId: mapped,
          linkedTempNo: rawTemp || faTemp || (isTempArrivalIdentifier(c) ? c : ''),
          isFinalized: true,
        };
      }
    }
  }

  // 2. If record itself is a final_arrival record (has final_arrival_id or final_arrival_no or MR id)
  if (record.final_arrival_id || rawFa || (rawMr && isMrIdentifier(rawMr))) {
    const officialId = rawMr && isMrIdentifier(rawMr) ? rawMr : rawFa && isMrIdentifier(rawFa) ? rawFa : rawMr || rawFa || rawArr || rawTemp;
    return {
      officialId,
      linkedTempNo: rawTemp || (rawArr && isTempArrivalIdentifier(rawArr) ? rawArr : ''),
      isFinalized: isMrIdentifier(officialId) || Boolean(record.final_arrival_id || rawFa),
    };
  }

  // 3. Unfinalized temporary arrival / inspection fallback
  const fallbackId = rawMr || rawArr || rawTemp || '';
  return {
    officialId: fallbackId,
    linkedTempNo: rawTemp || (isTempArrivalIdentifier(fallbackId) ? fallbackId : ''),
    isFinalized: isMrIdentifier(fallbackId),
  };
}

export function isArrivalFinalized(
  idOrRecord: any,
  index?: FinalArrivalIndex | null
): boolean {
  if (!idOrRecord || !index) return false;
  if (typeof idOrRecord === 'object') {
    const candidates = [
      idOrRecord.temporary_arrival_no,
      idOrRecord.temp_arrival_no,
      idOrRecord.amad_no,
      idOrRecord.arrival_no,
      idOrRecord.mr_no,
      idOrRecord.final_arrival_no,
    ]
      .map(normalizeArrivalToken)
      .filter(Boolean);
    return candidates.some(
      (c) => index.mrToRecord.has(c) || index.tempToMr.has(c) || index.finalizedTempSet.has(c)
    );
  }
  const norm = normalizeArrivalToken(idOrRecord);
  if (!norm) return false;
  return index.mrToRecord.has(norm) || index.tempToMr.has(norm) || index.finalizedTempSet.has(norm);
}

export function getLinkedArrivalKeys(
  idOrRecord: any,
  index?: FinalArrivalIndex | null
): string[] {
  const keys = new Set<string>();
  const add = (v: any) => {
    const n = normalizeArrivalToken(v);
    if (n) keys.add(n);
  };

  if (typeof idOrRecord === 'object' && idOrRecord !== null) {
    add(idOrRecord.mr_no);
    add(idOrRecord.final_arrival_no);
    add(idOrRecord.arrival_no);
    add(idOrRecord.temporary_arrival_no);
    add(idOrRecord.temp_arrival_no);
    add(idOrRecord.amad_no);
    add(idOrRecord.linked_temp_no);
  } else {
    add(idOrRecord);
  }

  if (index) {
    for (const k of Array.from(keys)) {
      const mappedMr = index.tempToMr.get(k);
      if (mappedMr) {
        add(mappedMr);
      }
      const mrNorm = mappedMr ? normalizeArrivalToken(mappedMr) : k;
      const faRec = index.mrToRecord.get(mrNorm);
      if (faRec) {
        add(extractFinalArrivalOfficialMr(faRec));
        add(faRec.final_arrival_no);
        add(faRec.mr_no);
        add(faRec.arrival_no);
        add(faRec.temporary_arrival_no);
      }
      const linkedTemps = index.mrToLinkedTemps.get(mrNorm);
      if (linkedTemps) {
        linkedTemps.forEach((t) => add(t));
      }
    }
  }

  return Array.from(keys);
}

export function mergeArrivalsFinalFirst<T extends Record<string, any>>(
  tempArrivals: T[] = [],
  finalArrivals: T[] = [],
  providedIndex?: FinalArrivalIndex
): Array<T & { _officialId: string; _linkedTempNo: string; _isFinalized: boolean }> {
  const index = providedIndex || buildFinalArrivalIndex(finalArrivals);
  const merged = new Map<string, T & { _officialId: string; _linkedTempNo: string; _isFinalized: boolean }>();

  // 1. Add finalized arrivals first (official M.R. No. always wins)
  for (const fa of finalArrivals || []) {
    if (!fa || typeof fa !== 'object') continue;
    const officialId = extractFinalArrivalOfficialMr(fa) || cleanArrivalDisplay(fa.temporary_arrival_no);
    const key = normalizeArrivalToken(officialId);
    if (!key) continue;

    const linkedTempNo = extractFinalArrivalLinkedTemp(fa);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...fa,
        mr_no: officialId,
        _officialId: officialId,
        _linkedTempNo: linkedTempNo,
        _isFinalized: true,
      });
    } else if (getRowRichnessScore(fa) > getRowRichnessScore(existing)) {
      merged.set(key, {
        ...existing,
        ...fa,
        mr_no: officialId,
        temporary_arrival_no: linkedTempNo || existing.temporary_arrival_no || existing._linkedTempNo,
        _officialId: officialId,
        _linkedTempNo: linkedTempNo || existing._linkedTempNo,
        _isFinalized: true,
      });
    } else if (linkedTempNo && !existing._linkedTempNo) {
      merged.set(key, {
        ...existing,
        temporary_arrival_no: existing.temporary_arrival_no || linkedTempNo,
        _linkedTempNo: linkedTempNo,
      });
    }
  }

  // 2. Add unfinalized temp arrivals only (if already finalized into an MR, enrich linkedTempNo and skip)
  for (const ta of tempArrivals || []) {
    if (!ta || typeof ta !== 'object') continue;
    const { officialId, linkedTempNo, isFinalized } = resolveRecordOfficialArrivalId(ta, index);
    const normOfficial = normalizeArrivalToken(officialId);
    const normTemp = normalizeArrivalToken(linkedTempNo || ta.temporary_arrival_no || ta.amad_no);
    const key = normOfficial || normTemp;
    if (!key) continue;

    if (isFinalized || merged.has(key) || (normTemp && index.finalizedTempSet.has(normTemp))) {
      const targetKey = merged.has(key)
        ? key
        : normalizeArrivalToken(index.tempToMr.get(normTemp) || '');
      if (targetKey && merged.has(targetKey)) {
        const existing = merged.get(targetKey)!;
        const tempDisplay = cleanArrivalDisplay(ta.temporary_arrival_no || ta.amad_no);
        if (tempDisplay && !existing._linkedTempNo) {
          merged.set(targetKey, {
            ...existing,
            temporary_arrival_no: existing.temporary_arrival_no || tempDisplay,
            _linkedTempNo: tempDisplay,
          });
        }
      }
      continue;
    }

    if (!merged.has(key)) {
      merged.set(key, {
        ...ta,
        _officialId: officialId || cleanArrivalDisplay(ta.temporary_arrival_no || ta.amad_no),
        _linkedTempNo: linkedTempNo || cleanArrivalDisplay(ta.temporary_arrival_no || ta.amad_no),
        _isFinalized: false,
      });
    }
  }

  return Array.from(merged.values());
}
