// Shared constants and types for Reports modules

export const voyagerProvider = (x: number, y: number, z: number, dpr?: number) => {
  const s = 'abc'[Math.abs(x + y) % 3];
  return `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}${dpr && dpr >= 2 ? '@2x' : ''}.png`;
};

export const osmProvider = (x: number, y: number, z: number) => {
  const s = 'abc'[Math.abs(x + y) % 3];
  return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
};

// Indian Jute Sourcing hubs and coordinates mapping
export const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'BIHAR': { lat: 25.6112, lng: 85.1214 }, // Patna/Bihar region
  'DAISEE': { lat: 22.9786, lng: 88.4354 }, // Bengalee jute hubs / Kolkata / West Bengal
  'NORTHERN': { lat: 30.7046, lng: 76.7179 }, // Northern hub near Punjab / Haryana / UP border
  'DIRECT SOURCING': { lat: 26.1584, lng: 85.7878 }, // Darbhanga / jute sourcing farm belts
  'KOLKATA': { lat: 22.5726, lng: 88.3639 },
  'WEST BENGAL': { lat: 22.9868, lng: 87.8550 },
  'ASSAM': { lat: 26.2006, lng: 92.9376 }
};

export const MONTH_LABELS = [
  { value: 'ALL', label: '-- ALL MONTHS --' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export const SAUDA_REPORTS = [
  { key: 'r1', name: '1. Monthly Dispatch Summary', description: 'Month-on-month overview of outbound sales weights, packaging volumes, and reference commission rates.' },
  { key: 'r2', name: '2. Broker Sales commission Ledger', description: 'Broker rankings by closed sales volumes, aggregate packet weights, and commissions accruals.' },
  { key: 'r3', name: '3. Buyer Supplier Sales Ledger', description: 'Sales weight distribution across buying entities, and estimated contract gross values.' },
  { key: 'r4', name: '4. Packaging Unit Distribution Audit', description: 'Dispatch distribution ratios by packaging variety (Loose Jute, Packs, Bags, Bales).' },
  { key: 'r5', name: '5. Brand Quality Specific Sales Pricing', description: 'Average reference prices and aggregate quantity dispatches by product fine quality.' },
  { key: 'r6', name: '6. Shipment & Delivery Timelines Audit', description: 'Contract shipment scheduling limits, target delivery timelines, and risk compliance logs.' },
  { key: 'r7', name: '7. Growing Area Performance Summary', description: 'Contract distribution and output metrics mapped against Jute botanical source regions.' },
  { key: 'r8', name: '8. Claims & Penalties Audit Log', description: 'Outstanding packaging brand claims, discrepancy reports, and delays penalties accrued.' },
  { key: 'r9', name: '9. Agency-wide Sales Allocation', description: 'Physical dispatches and sourcing performance breakdown across distinct localized Agencies.' },
  { key: 'r10', name: '10. Lorries Dispatch & Payload Logs', description: 'Outbound lorry vehicle counts, container density specs, and total payload weights.' }
];

export function getAreaCoordinates(areaName: string): { lat: number; lng: number } {
  // Handle combined formats politely (e.g. BIHAR - KISHANGAN)
  const cleanName = areaName.includes(' - ') ? areaName.split(' - ')[0] : areaName;
  const norm = cleanName.toUpperCase().trim();
  
  let baseCoords = { lat: 0, lng: 0 };
  let found = false;

  if (REGION_COORDINATES[norm]) {
    baseCoords = { ...REGION_COORDINATES[norm] };
    found = true;
  } else {
    const normFull = areaName.toUpperCase().trim();
    if (REGION_COORDINATES[normFull]) {
      baseCoords = { ...REGION_COORDINATES[normFull] };
      found = true;
    }
  }

  if (found) {
    // If it's a combined name or different from base region name, inject slight deterministic jitter so pins won't overlap
    if (areaName.includes(' - ') || areaName !== cleanName) {
      let hash = 0;
      for (let i = 0; i < areaName.length; i++) {
        hash = areaName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const latOffset = ((Math.abs(hash) % 200) - 100) / 1800; // tiny offset (~5-10km scale max)
      const lngOffset = ((Math.abs(hash >> 3) % 200) - 100) / 1800;
      return { lat: baseCoords.lat + latOffset, lng: baseCoords.lng + lngOffset };
    }
    return baseCoords;
  }

  // Fallback to deterministic LatLng within the prominent Indian Jute Belts (East & Northeast India)
  let hash1 = 0;
  let hash2 = 0;
  const normFull = areaName.toUpperCase().trim();
  for (let i = 0; i < normFull.length; i++) {
    hash1 = normFull.charCodeAt(i) + ((hash1 << 5) - hash1);
    hash2 = normFull.charCodeAt(i) + ((hash2 << 7) - hash2);
  }
  // Map nicely into North/East India Latitude (between 22.0 to 27.5 North) and Longitude (84.0 to 90.0 East)
  const lat = 22.0 + (Math.abs(hash1) % 550) / 100;
  const lng = 84.0 + (Math.abs(hash2) % 600) / 100;
  return { lat, lng };
}

export interface PoItemSummary {
  po_no: any;
  po_id: any;
  po_date: any;
  area: string;
  agency_name: string;
  grade_name: string;
  supplier: string;
  broker: string;
  total_contract_mt: number;
}

export interface AreaGroupedPoItem {
  name: string;
  count: number;
  totalTons: number;
  percentage: number;
  pos: PoItemSummary[];
}
