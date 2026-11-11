import * as XLSX from 'xlsx';
import { useDataStore } from '../components/PictureMapping/DataContext';
import { useAppStore } from '../store/useAppStore';
import { saveLayoutConfigToDisk } from './layoutConfigCache';
import { Project, Task } from '../types';

export interface ComparisonRowInput {
  'Store'?: string;
  'Floor'?: string;
  'Unit Code'?: string;
  'Brand / Shop Name'?: string;
  'Shop Type'?: string;
  'Contract Size (m2)'?: number | string;
  'MD Status'?: string;
  'Project Code'?: string;
  'Project Status'?: string;
  'Start Date'?: string;
  'Handover Date'?: string;
  'Finish Date'?: string;
  'Opening Date'?: string;
  'Sales Amount'?: number | string;
  'Profit Amount'?: number | string;
  'Margin (%)'?: number | string;
  'Party / Contractor'?: string;
  'Notes / Detail'?: string;
  'Year'?: number | string;
}

const SAMPLE_COMPARISON_DATA: ComparisonRowInput[] = [
  {
    'Store': 'HCM',
    'Floor': 'L1',
    'Unit Code': 'L1-01',
    'Brand / Shop Name': 'Chanel Cosmetics',
    'Shop Type': 'Cosmetics',
    'Contract Size (m2)': 65.5,
    'MD Status': 'Operating',
    'Project Code': 'HCM-L1-01',
    'Project Status': 'Completed',
    'Start Date': '2026-01-10',
    'Handover Date': '2026-02-01',
    'Finish Date': '2026-02-20',
    'Opening Date': '2026-03-01',
    'Sales Amount': 1850000000,
    'Profit Amount': 420000000,
    'Margin (%)': 22.7,
    'Party / Contractor': 'Taka Interior',
    'Notes / Detail': 'Flagship booth near main entrance',
    'Year': 2026,
  },
  {
    'Store': 'HCM',
    'Floor': 'L1',
    'Unit Code': 'L1-02',
    'Brand / Shop Name': 'Dior Beauty',
    'Shop Type': 'Cosmetics',
    'Contract Size (m2)': 58.0,
    'MD Status': 'Renovating',
    'Project Code': 'HCM-L1-02',
    'Project Status': 'On process',
    'Start Date': '2026-10-15',
    'Handover Date': '2026-11-01',
    'Finish Date': '2026-11-25',
    'Opening Date': '2026-12-01',
    'Sales Amount': 1420000000,
    'Profit Amount': 310000000,
    'Margin (%)': 21.8,
    'Party / Contractor': 'AA Corporation',
    'Notes / Detail': 'Lighting upgrade & counter remodel',
    'Year': 2026,
  },
  {
    'Store': 'HCM',
    'Floor': 'B1',
    'Unit Code': 'B1-10',
    'Brand / Shop Name': 'Starbucks Reserve',
    'Shop Type': 'F&B',
    'Contract Size (m2)': 120.0,
    'MD Status': 'Operating',
    'Project Code': 'HCM-B1-10',
    'Project Status': 'Completed',
    'Start Date': '2026-02-01',
    'Handover Date': '2026-02-15',
    'Finish Date': '2026-03-10',
    'Opening Date': '2026-03-15',
    'Sales Amount': 980000000,
    'Profit Amount': 245000000,
    'Margin (%)': 25.0,
    'Party / Contractor': 'VinaDecor',
    'Notes / Detail': 'High foot-traffic corner unit',
    'Year': 2026,
  },
];

const LOCAL_COMPARISON_STORAGE_KEY = 'taka_standalone_comparison_rows_v1';

export function downloadComparisonTemplate(): void {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_COMPARISON_DATA);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Layout_Comparison_Data');
  XLSX.writeFile(wb, 'Taka_Layout_Comparison_Template.xlsx');
}

export function applyComparisonRowsToStores(rows: any[]): {
  matchedUnits: number;
  projectsCount: number;
} {
  const unitInfoList: any[] = [];
  const salesList: any[] = [];
  const profitsList: any[] = [];
  const mdStatusList: any[] = [];
  const projectStatusList: any[] = [];
  const projectLinkList: any[] = [];
  const projectsList: Project[] = [];
  const tasksList: Task[] = [];

  rows.forEach((raw, idx) => {
    const store = String(raw['Store'] || raw['store'] || 'HCM').toUpperCase().trim() as 'HCM' | 'HN';
    const floor = String(raw['Floor'] || raw['floor'] || raw['Location'] || raw['location'] || 'L1').toUpperCase().trim();
    const unitCode = String(raw['Unit Code'] || raw['unit'] || raw['Unit'] || '').trim();
    if (!unitCode) return;

    const brandName = String(raw['Brand / Shop Name'] || raw['brandName'] || raw['Brand'] || unitCode).trim();
    const shopType = String(raw['Shop Type'] || raw['shopType'] || raw['Category'] || 'General').trim();
    const sizeVal = Number(String(raw['Contract Size (m2)'] ?? raw['size'] ?? 0).replace(/,/g, '.')) || 0;
    const mdStatus = String(raw['MD Status'] || raw['mdStatus'] || 'Operating').trim();
    const projCode = String(raw['Project Code'] || raw['projectCode'] || unitCode).trim();
    const projStatus = String(raw['Project Status'] || raw['projectStatus'] || raw['Status'] || 'On process').trim();
    const startDate = String(raw['Start Date'] || raw['start'] || '2026-01-01').trim();
    const handoverDate = String(raw['Handover Date'] || raw['handover'] || startDate).trim();
    const finishDate = String(raw['Finish Date'] || raw['finish'] || '2026-12-31').trim();
    const openingDate = String(raw['Opening Date'] || raw['opening'] || finishDate).trim();
    const salesAmount = Number(String(raw['Sales Amount'] ?? raw['sales'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const profitAmount = Number(String(raw['Profit Amount'] ?? raw['profit'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const marginVal = Number(String(raw['Margin (%)'] ?? raw['margin'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const party = String(raw['Party / Contractor'] || raw['party'] || 'Internal').trim();
    const notes = String(raw['Notes / Detail'] || raw['detail'] || '').trim();
    const year = Number(raw['Year'] || raw['year'] || new Date().getFullYear()) || new Date().getFullYear();

    const brandCode = `BR_${unitCode.replace(/[^a-zA-Z0-9]/g, '_')}`;

    unitInfoList.push({
      unit: unitCode,
      store,
      floor,
      location: floor,
      brandCode,
      brandName,
      shopType,
      size: sizeVal,
      area: sizeVal,
      year,
    });

    salesList.push({
      unit: unitCode,
      brandCode,
      brandName,
      store,
      floor,
      salesAmount,
      amount: salesAmount,
      year,
    });

    profitsList.push({
      unit: unitCode,
      brandCode,
      store,
      floor,
      profitAmount,
      amount: profitAmount,
      margin: marginVal,
      year,
    });

    mdStatusList.push({
      unit: unitCode,
      store,
      floor,
      mdStatus,
      status: mdStatus,
      notes,
      year,
    });

    projectStatusList.push({
      unit: unitCode,
      code: projCode,
      store,
      floor,
      location: floor,
      projectStatus: projStatus,
      status: projStatus,
      startDate,
      endDate: finishDate,
      handoverDate,
      openingDate,
      party,
      detail: notes,
      year,
    });

    projectLinkList.push({
      unit: unitCode,
      code: projCode,
      projectCode: projCode,
      store,
      floor,
    });

    const projId = `proj_${store}_${floor}_${unitCode}_${idx}`;
    projectsList.push({
      id: projId,
      no: idx + 1,
      code: projCode,
      name: `${brandName} (${unitCode})`,
      store,
      location: floor,
      year,
      status: projStatus as any,
      mdStatus,
      shopType,
      area: sizeVal,
      start: startDate,
      handover: handoverDate,
      opening: openingDate,
      party,
      detail: notes,
      description: notes,
      budget: salesAmount,
      actual: profitAmount,
    } as Project);

    tasksList.push({
      id: `task_${projId}_1`,
      projectId: projId,
      projectCode: projCode,
      projectStore: store,
      projectYear: year,
      name: `${brandName} - Fitout & Handover`,
      start: startDate,
      finish: finishDate,
      duration: '15',
      durationManual: false,
      finishManual: false,
      runningStatus: projStatus.toLowerCase().includes('complete') ? 'Completed' : 'On process',
      party,
      detail: notes,
    } as Task);
  });

  // Update PictureMapping DataStore
  const dataStore = useDataStore.getState();
  dataStore.setUnitInfo(unitInfoList);
  dataStore.setSales(salesList);
  dataStore.setProfits(profitsList);
  dataStore.setMdStatus(mdStatusList);
  dataStore.setProjectStatus(projectStatusList);
  dataStore.setProjectLink(projectLinkList);

  // Update AppStore for LayoutTab Aggregator
  const appStore = useAppStore.getState();
  appStore.setProjects(projectsList);
  appStore.setTasks(tasksList);

  try {
    localStorage.setItem(LOCAL_COMPARISON_STORAGE_KEY, JSON.stringify(rows));
    const consolidated = useDataStore.getState().getConsolidatedSaveData();
    saveLayoutConfigToDisk(consolidated).catch(() => {});
  } catch {}

  return {
    matchedUnits: unitInfoList.length,
    projectsCount: projectsList.length,
  };
}

export async function importComparisonExcelOrCsvFile(file: File): Promise<{
  matchedUnits: number;
  projectsCount: number;
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
  const result = applyComparisonRowsToStores(rows);

  // Background upload imported file to R2 (under layout/ and root) and sync unified state
  import('./r2UnifiedSyncService').then(({ uploadImportedFileToR2, syncAllDataToCloudR2 }) => {
    uploadImportedFileToR2(file, 'layout').catch(() => {});
    syncAllDataToCloudR2({ silent: true }).catch(() => {});
  }).catch(() => {});

  return result;
}

export function hydrateSavedComparisonRows(): void {
  try {
    const raw = localStorage.getItem(LOCAL_COMPARISON_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        applyComparisonRowsToStores(parsed);
        return;
      }
    }
    // Seed initial sample comparison data so the user immediately sees how comparison works
    applyComparisonRowsToStores(SAMPLE_COMPARISON_DATA);
  } catch {}
}

export function exportFullStandaloneWorkspaceJson(): void {
  const dataState = useDataStore.getState().getConsolidatedSaveData();
  const comparisonRaw = localStorage.getItem(LOCAL_COMPARISON_STORAGE_KEY);
  const comparisonRows = comparisonRaw ? JSON.parse(comparisonRaw) : SAMPLE_COMPARISON_DATA;

  const payload = {
    app: 'Taka-Layout-Standalone',
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    layoutState: dataState,
    comparisonRows,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Taka_Layout_Workspace_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFullStandaloneWorkspaceJson(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (parsed?.layoutState) {
    useDataStore.getState().setLoadedCloudData(parsed.layoutState);
    await saveLayoutConfigToDisk(parsed.layoutState);
  }
  if (Array.isArray(parsed?.comparisonRows)) {
    applyComparisonRowsToStores(parsed.comparisonRows);
  }
}

export function getSavedComparisonRows(): ComparisonRowInput[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMPARISON_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...SAMPLE_COMPARISON_DATA];
}

export function updateSavedComparisonRows(rows: ComparisonRowInput[]): {
  matchedUnits: number;
  projectsCount: number;
} {
  const result = applyComparisonRowsToStores(rows);

  // Trigger background R2 sync and local disk cache update
  import('./r2UnifiedSyncService').then(({ syncAllDataToCloudR2 }) => {
    syncAllDataToCloudR2({ silent: true }).catch(() => {});
  }).catch(() => {});

  return result;
}
