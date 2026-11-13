import { useDataStore } from '../components/PictureMapping/DataContext';
import { useAppStore } from '../store/useAppStore';
import { saveLayoutConfigToDisk } from './layoutConfigCache';
import { Project, Task } from '../types';
import {
  ComparisonRowInput,
  SAMPLE_COMPARISON_DATA,
  COMPARISON_TEMPLATE_COL_WIDTHS,
} from './comparisonTemplateSpec';

export type { ComparisonRowInput };
export { SAMPLE_COMPARISON_DATA };

const LOCAL_COMPARISON_STORAGE_KEY = 'taka_standalone_comparison_rows_v1';

export async function downloadComparisonTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(SAMPLE_COMPARISON_DATA);
  ws['!cols'] = COMPARISON_TEMPLATE_COL_WIDTHS;
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
  const classInfoList: any[] = [];
  const projectsList: Project[] = [];
  const tasksList: Task[] = [];

  rows.forEach((raw, idx) => {
    // 1. Basic & Attributes
    const store = String(raw['Store'] || raw['store'] || 'HCM').toUpperCase().trim() as 'HCM' | 'HN';
    const floor = String(raw['Floor'] || raw['floor'] || raw['Location'] || raw['location'] || 'L1').toUpperCase().trim();
    const unitCode = String(raw['Unit Code'] || raw['unit'] || raw['Unit'] || raw['unitCode'] || '').trim();
    if (!unitCode) return;

    const brandName = String(raw['Brand / Shop Name'] || raw['brandName'] || raw['Brand'] || raw['brand'] || unitCode).trim();
    const brandCode = String(raw['Brand Code'] || raw['brandCode'] || `BR_${unitCode.replace(/[^a-zA-Z0-9]/g, '_')}`).trim();
    const vendorCode = String(raw['Vendor Code'] || raw['vendorCode'] || `V_${unitCode.replace(/[^a-zA-Z0-9]/g, '_')}`).trim();
    const classCode = String(raw['Class Code'] || raw['classCode'] || '').trim();
    const shopType = String(raw['Shop Type'] || raw['shopType'] || raw['Category'] || 'General').trim();
    const sizeVal = Number(String(raw['Contract Size (m2)'] ?? raw['Size (m2)'] ?? raw['size'] ?? raw['area'] ?? 0).replace(/,/g, '.')) || 0;
    const year = Number(raw['Year'] || raw['year'] || new Date().getFullYear()) || new Date().getFullYear();

    // 2. MD Status & Task
    const mdStatus = String(raw['MD Status'] || raw['mdStatus'] || 'Operating').trim();
    const mdNotes = String(raw['MD Notes'] || raw['mdNotes'] || raw['Notes / Detail'] || raw['detail'] || '').trim();
    const taskName = String(raw['Task'] || raw['task'] || raw['Task Name'] || `${brandName} - Fitout & Handover`).trim();

    // 3. Project & Real-time App Data
    const projCode = String(raw['Project Code'] || raw['projectCode'] || unitCode).trim();
    const projName = String(raw['Project Name'] || raw['projectName'] || `${brandName} (${unitCode})`).trim();
    const projStatus = String(raw['Project Status'] || raw['projectStatus'] || raw['Status'] || 'On process').trim();
    const actStatus = String(
      raw['Act Status'] ||
      raw['actStatus'] ||
      raw['Actual Status'] ||
      (projStatus.toLowerCase().includes('complete') ? 'Completed' : 'On process')
    ).trim();

    const startDate = String(raw['Start Date'] || raw['start'] || `${year}-01-01`).trim();
    const handoverDate = String(raw['Handover Date'] || raw['handover'] || startDate).trim();
    const finishDate = String(raw['Finish Date'] || raw['finish'] || `${year}-12-31`).trim();
    const openingDate = String(raw['Opening Date'] || raw['opening'] || finishDate).trim();
    const party = String(raw['Party / Contractor'] || raw['party'] || 'Internal').trim();
    const notes = String(raw['Notes / Detail'] || raw['detail'] || mdNotes).trim();

    // 4. Financial & Performance Metrics
    const salesAmount = Number(String(raw['Sales Amount'] ?? raw['Sales'] ?? raw['sales'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const salesByCp = Number(String(raw['Sales by CP'] ?? raw['salesByCp'] ?? raw['sales_by_cp'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const salesByHcmcate = Number(String(raw['Sales by HCMcate'] ?? raw['salesByHcmcate'] ?? raw['sales_by_hcmcate'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;

    const profitAmount = Number(String(raw['Profit Amount'] ?? raw['Profit'] ?? raw['profit'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const profitByCp = Number(String(raw['Profit by CP'] ?? raw['profitByCp'] ?? raw['profit_by_cp'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const profitByHcmcate = Number(String(raw['Profit by HCMcate'] ?? raw['profitByHcmcate'] ?? raw['profit_by_hcmcate'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;

    const marginVal = Number(String(raw['Margin (%)'] ?? raw['Margin'] ?? raw['margin'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const marginByCp = Number(String(raw['Margin by CP (%)'] ?? raw['Margin by CP'] ?? raw['marginByCp'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;

    const hcmSalesEffi = Number(String(raw['HCM Sales Effi'] ?? raw['hcmSalesEffi'] ?? raw['salesEffi'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
    const hcmMargin = Number(String(raw['HCM Margin (%)'] ?? raw['HCM Margin'] ?? raw['hcmMargin'] ?? 0).replace(/[^0-9.-]/g, '')) || 0;

    const budget = Number(String(raw['Budget'] ?? raw['budget'] ?? salesAmount).replace(/[^0-9.-]/g, '')) || salesAmount;
    const actual = Number(String(raw['Actual Cost'] ?? raw['Actual'] ?? raw['actual'] ?? profitAmount).replace(/[^0-9.-]/g, '')) || profitAmount;

    // Unit Info (Attributes for Dynamic Rule Evaluation)
    unitInfoList.push({
      unit: unitCode,
      store,
      floor,
      location: floor,
      brandCode,
      brandName,
      vendorCode,
      classCode,
      shopType,
      size: sizeVal,
      area: sizeVal,
      year,
      status: 'Active',
    });

    // Sales Data (Metrics for Dynamic Rule Evaluation)
    salesList.push({
      unit: unitCode,
      brandCode,
      brandName,
      vendorCode,
      classCode,
      store,
      floor,
      salesAmount,
      sales: salesAmount,
      amount: salesAmount,
      salesByCp,
      salesByHcmcate,
      year,
    });

    // Profits Data (Metrics for Dynamic Rule Evaluation)
    profitsList.push({
      unit: unitCode,
      brandCode,
      vendorCode,
      classCode,
      store,
      floor,
      profitAmount,
      profit: profitAmount,
      amount: profitAmount,
      profitByCp,
      profitByHcmcate,
      margin: marginVal,
      marginByCp,
      year,
    });

    // MD Status Data
    mdStatusList.push({
      unit: unitCode,
      store,
      floor,
      mdStatus,
      status: mdStatus,
      notes: mdNotes || notes,
      mdNotes,
      year,
    });

    // Project Status Data
    projectStatusList.push({
      unit: unitCode,
      code: projCode,
      store,
      floor,
      location: floor,
      projectStatus: projStatus,
      status: projStatus,
      actStatus,
      startDate,
      endDate: finishDate,
      handoverDate,
      openingDate,
      party,
      detail: notes,
      task: taskName,
      year,
    });

    // Project Link Data
    projectLinkList.push({
      unit: unitCode,
      code: projCode,
      projectCode: projCode,
      store,
      floor,
    });

    // Class Info (if classCode is specified, sync HCM sales efficiency and margin)
    if (classCode) {
      classInfoList.push({
        classCode,
        name: shopType || brandName,
        salesEffi: hcmSalesEffi,
        hcmSalesEffi,
        profitEffi: hcmSalesEffi * (hcmMargin / 100),
        margin: hcmMargin / 100,
        hcmMargin: hcmMargin / 100,
      });
    }

    // App Project
    const projId = `proj_${store}_${floor}_${unitCode}_${idx}`;
    projectsList.push({
      id: projId,
      no: idx + 1,
      code: projCode,
      name: projName,
      store,
      location: floor,
      year,
      status: projStatus as any,
      actStatus,
      mdStatus,
      shopType,
      area: sizeVal,
      sizeM2: sizeVal,
      start: startDate,
      handover: handoverDate,
      opening: openingDate,
      party,
      detail: notes,
      description: notes,
      budget,
      actual,
    } as Project);

    // App Task
    tasksList.push({
      id: `task_${projId}_1`,
      projectId: projId,
      projectCode: projCode,
      projectStore: store,
      projectYear: year,
      name: taskName,
      start: startDate,
      finish: finishDate,
      duration: '15',
      durationManual: false,
      finishManual: false,
      runningStatus: actStatus.toLowerCase().includes('complete') ? 'Completed' : 'On process',
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
  if (classInfoList.length > 0) {
    dataStore.setClassInfo(classInfoList);
  }

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
  const [XLSX, buffer] = await Promise.all([import('xlsx'), file.arrayBuffer()]);
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
  const { applyUnifiedWorkspacePayload, syncAllDataToCloudR2 } = await import('./r2UnifiedSyncService');
  if (parsed?.layoutState) {
    await applyUnifiedWorkspacePayload({
      ...parsed.layoutState,
      comparisonRows: parsed.comparisonRows,
    });
  } else {
    await applyUnifiedWorkspacePayload(parsed);
  }
  await syncAllDataToCloudR2({ silent: true }).catch(() => {});
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

  // Mark dirty and persist to local cache without hammering R2 on every cell edit
  import('./r2UnifiedSyncService').then(({ markWorkspaceDirty }) => {
    markWorkspaceDirty();
  }).catch(() => {});

  return result;
}
