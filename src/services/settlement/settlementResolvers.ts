export const resolveGradeName = (raw: any, overrideList?: any[]): string => {
  if (!raw) return '';
  const strVal = String(raw).trim();
  if (overrideList && overrideList.length > 0) {
    const matched = overrideList.find(
      (g) =>
        String(g.id || g.grade_id || g.code || '').trim() === strVal ||
        String(g.grade_name || g.name || '').trim().toLowerCase() === strVal.toLowerCase()
    );
    if (matched) return String(matched.grade_name || matched.name || strVal).trim().toUpperCase();
  }
  return strVal.toUpperCase();
};

export const resolveAgencyName = (raw: any, overrideList?: any[]): string => {
  if (!raw) return '';
  const strVal = String(raw).trim();
  if (overrideList && overrideList.length > 0) {
    const matched = overrideList.find(
      (a) =>
        String(a.id || a.agency_id || a.code || '').trim() === strVal ||
        String(a.agency_name || a.name || '').trim().toLowerCase() === strVal.toLowerCase()
    );
    if (matched) return String(matched.agency_name || matched.name || strVal).trim().toUpperCase();
  }
  return strVal.toUpperCase();
};

export const resolveMarkaName = (raw: any, overrideList?: any[]): string => {
  if (!raw) return '';
  const strVal = String(raw).trim();
  if (overrideList && overrideList.length > 0) {
    const matched = overrideList.find(
      (m) =>
        String(m.id || m.marka_id || m.code || '').trim() === strVal ||
        String(m.marka_name || m.name || '').trim().toLowerCase() === strVal.toLowerCase()
    );
    if (matched) return String(matched.marka_name || matched.name || strVal).trim().toUpperCase();
  }
  return strVal.toUpperCase();
};

export const resolveAreaName = (raw: any, overrideList?: any[]): string => {
  if (!raw) return '';
  const strVal = String(raw).trim();
  if (overrideList && overrideList.length > 0) {
    const matched = overrideList.find(
      (a) =>
        String(a.id || a.area_id || a.code || '').trim() === strVal ||
        String(a.area_name || a.name || '').trim().toLowerCase() === strVal.toLowerCase()
    );
    if (matched) return String(matched.area_name || matched.name || strVal).trim().toUpperCase();
  }
  return strVal.toUpperCase();
};
