import { ComparisonRowInput } from '../../lib/standaloneComparisonService';

/**
 * Extracts all CAD Unit Codes available in storeLocationData across all partitions
 */
export function computeCadUnitCodeSet(storeLocationData: any): Set<string> {
  const set = new Set<string>();
  if (!storeLocationData) return set;
  Object.values(storeLocationData).forEach((part: any) => {
    if (Array.isArray(part?.mapUnits)) {
      part.mapUnits.forEach((u: any) => {
        const code = String(u.name || u.unitCode || u.unit || '').trim().toUpperCase();
        if (code) set.add(code);
      });
    }
  });
  return set;
}

/**
 * Extracts CAD units specifically for the active store & floor
 */
export function computeActiveFloorCadUnits(
  storeLocationData: any,
  activeStore: string,
  activeLocation: string,
  liveUnits: any[] = []
): Array<{ code: string; size: number }> {
  const list: Array<{ code: string; size: number }> = [];
  const seen = new Set<string>();
  const targetStore = (activeStore || 'HCM').toUpperCase().trim();
  const targetLoc = (activeLocation || 'L1').toUpperCase().trim();

  const pKey = `${targetStore}_${targetLoc}`;
  const pUnits = storeLocationData?.[pKey]?.mapUnits || [];
  const combined = [...pUnits, ...(liveUnits || [])];

  combined.forEach((u: any) => {
    const code = String(u.name || u.unitCode || u.unit || '').trim().toUpperCase();
    if (code && !seen.has(code)) {
      seen.add(code);
      const s = Number(u.sizeM2 ?? u.size ?? u.area ?? 0) || 0;
      list.push({ code, size: s });
    }
  });

  return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/**
 * Extracts available floors from rows for filtering
 */
export function extractAvailableFloors(rows: ComparisonRowInput[]): string[] {
  const s = new Set<string>();
  rows.forEach((r) => {
    const f = String(r['Floor'] || r['floor'] || '').trim().toUpperCase();
    if (f) s.add(f);
  });
  return Array.from(s).sort();
}

/**
 * Extracts available statuses from rows for filtering
 */
export function extractAvailableStatuses(rows: ComparisonRowInput[]): string[] {
  const s = new Set<string>();
  rows.forEach((r) => {
    const st = String(r['Project Status'] || r['projectStatus'] || r['MD Status'] || '').trim();
    if (st) s.add(st);
  });
  return Array.from(s).sort();
}

/**
 * Filters rows based on store, floor, status, and search query
 */
export function filterComparisonRows(
  rows: ComparisonRowInput[],
  storeFilter: string,
  floorFilter: string,
  statusFilter: string,
  searchTerm: string
): Array<{ row: ComparisonRowInput; originalIndex: number }> {
  const q = searchTerm.toLowerCase().trim();

  return rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row }) => {
      const rStore = String(row['Store'] || 'HCM').toUpperCase().trim();
      const rFloor = String(row['Floor'] || 'L1').toUpperCase().trim();
      const rUnit = String(row['Unit Code'] || '').trim();
      const rBrand = String(row['Brand / Shop Name'] || '').trim();
      const rBrandCode = String(row['Brand Code'] || '').trim();
      const rVendorCode = String(row['Vendor Code'] || '').trim();
      const rClassCode = String(row['Class Code'] || '').trim();
      const rProjCode = String(row['Project Code'] || '').trim();
      const rProjName = String(row['Project Name'] || '').trim();
      const rProjStatus = String(row['Project Status'] || '').trim();
      const rShopType = String(row['Shop Type'] || '').trim();

      if (storeFilter !== 'all' && rStore !== storeFilter) return false;
      if (floorFilter !== 'all' && rFloor !== floorFilter) return false;
      if (statusFilter !== 'all' && rProjStatus !== statusFilter) return false;

      if (q) {
        const matchesSearch =
          rUnit.toLowerCase().includes(q) ||
          rBrand.toLowerCase().includes(q) ||
          rBrandCode.toLowerCase().includes(q) ||
          rVendorCode.toLowerCase().includes(q) ||
          rClassCode.toLowerCase().includes(q) ||
          rProjCode.toLowerCase().includes(q) ||
          rProjName.toLowerCase().includes(q) ||
          rShopType.toLowerCase().includes(q) ||
          rFloor.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
}

/**
 * Factory for creating a standardized ComparisonRowInput
 */
export function createComparisonRow(
  activeStore: string,
  activeLocation: string,
  activeYear: string,
  unitCode?: string,
  sizeM2?: number,
  shopType: string = 'General',
  brandName?: string
): ComparisonRowInput {
  const uCode = unitCode || `U-${Date.now().toString().slice(-4)}`;
  const bName = brandName || `Brand ${uCode}`;
  const timestamp = Date.now().toString().slice(-4);
  const yr = Number(activeYear) || 2026;

  return {
    Store: (activeStore === 'HN' ? 'HN' : 'HCM'),
    Floor: activeLocation || 'L1',
    'Unit Code': uCode,
    'Brand / Shop Name': bName,
    'Brand Code': `BR-${timestamp}`,
    'Vendor Code': `VN-${timestamp}`,
    'Class Code': 'FNB',
    'Shop Type': shopType,
    'Contract Size (m2)': sizeM2 && sizeM2 > 0 ? sizeM2 : 50,
    'MD Status': 'Operating',
    'MD Notes': 'Operational unit',
    'Task': 'Opening',
    'Project Code': `PROJ-${uCode.replace(/[^a-zA-Z0-9]/g, '_')}`,
    'Project Name': `Fitout ${uCode}`,
    'Project Status': 'On process',
    'Act Status': 'On Track',
    'Start Date': `${yr}-01-01`,
    'Finish Date': `${yr}-12-31`,
    'Sales Amount': 150000000,
    'Sales by CP': 120000000,
    'Sales by HCMcate': 140000000,
    'Profit Amount': 30000000,
    'Profit by CP': 25000000,
    'Profit by HCMcate': 28000000,
    'Margin (%)': 20,
    'Margin by CP (%)': 20.8,
    'HCM Sales Effi': 3000000,
    'HCM Margin (%)': 20,
    'Budget': 50000000,
    'Actual Cost': 45000000,
    'Party / Contractor': 'TAKASHIMAYA VN',
    'Notes / Detail': 'Tạo từ Master Index',
    Year: yr,
  };
}
