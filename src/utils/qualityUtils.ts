export const compareQualities = (aStr: string, bStr: string): number => {
  const clean = (val: string) => {
    return String(val || '')
      .trim()
      .replace(/\.$/, '')
      .replace(/\s+/g, '')
      .toUpperCase();
  };

  const a = clean(aStr);
  const b = clean(bStr);

  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const PREDEFINED_RANKS: Record<string, number> = {
    TD1: 10,
    TD2: 20,
    TD3: 30,
    TD4: 40,
    TD5: 50,
    TD6: 60,
    TD7: 70,
    TD8: 80,
    W1: 110,
    W2: 120,
    W3: 130,
    W4: 140,
    W5: 150,
    W6: 160,
    W7: 170,
    W8: 180,
    M1: 210,
    M2: 220,
    M3: 230,
    M4: 240,
    M5: 250,
    M6: 260,
    M7: 270,
    M8: 280,
    BTC: 310,
    BTR: 320,
    "STANDARD GRADE": 1000,
    "NORMAL GRADE": 1010,
  };

  const rankA = PREDEFINED_RANKS[a];
  const rankB = PREDEFINED_RANKS[b];

  if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
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

    if (prefixA === prefixB) return numA - numB;
    return prefixA.localeCompare(prefixB);
  }

  return a.localeCompare(b);
};
