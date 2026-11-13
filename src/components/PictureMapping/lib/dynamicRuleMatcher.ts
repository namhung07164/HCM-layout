import { GroupRule } from '../components/DataMapping/types';

export interface DynamicUnitSummaryItem {
  unitId: string;
  unitName: string;
  store: string;
  location: string;
  year: string;
  // Real-time App Project Data (Strictly from Zustand tasks & projects)
  hasAppProject: boolean;
  appProjectCode: string;
  appProjectName?: string;
  projectName: string;
  appProjectStatus: string; // 'On process' | 'Upcoming' | 'Completed' | 'Delay' | ''
  appProjectYear: string;
  appProjectMdStatus: string;
  appProjectActStatus: string;
  appProjectDetail: string;
  appProjectDescription: string;
  appProjectParty: string;
  appProjectShopType?: string;
  shopType?: string;
  appProjectBudget: number;
  appProjectActual: number;
  appProjectSizeM2?: number;
  planProgress: number;
  actProgress: number;
  matchedTasksCount: number;
  task: string;
  activeTasks?: string[];
  matchedProject?: any;
  // Excel / Master Business Data
  size: number;
  sizeM2?: number;
  sales: number;
  salesByCp: number;
  salesByHcmcate?: number;
  profit: number;
  profitByCp: number;
  profitByHcmcate?: number;
  margin: number;
  marginByCp: number;
  hcmSalesEffi: number;
  hcmMargin: number;
  mdStatus: string;
  mdNotes: string;
  excelProjectStatus: string;
  vendorCode: string;
  brandCode: string;
  brandName: string;
  classCode: string;
  // Dynamic Evaluation Result
  matchedGroupId: string | null;
  matchedGroupName: string | null;
  color: string; // Hex color
  opacity: number;
  hatchPattern?: string;
  symbol?: string;
  matchedRuleReason: string;
  isRestricted?: boolean;
}

/**
 * Robustly resolves rule field value from either DynamicUnitSummaryItem or generic data dictionary.
 * Supports case-insensitivity, spaces, Vietnamese aliases, and seamless fallback between
 * App Real-time projects and Excel/Master records (e.g. Shop Type <-> App: Shop Type).
 */
export function resolveRuleValue(field: string, data: DynamicUnitSummaryItem | Record<string, any>): any {
  if (!field || !data) return '';

  const rawVal = (data as any)[field];
  if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
    return rawVal;
  }

  const f = String(field).toLowerCase().trim().replace(/[\s_\-:]+/g, '');

  // 1. Metric / Financial Fields
  if (f === 'sales' || f === 'salesamount' || f === 'salesvnd' || f === 'doanhthu') {
    return (data as any).sales ?? (data as any).salesAmount ?? 0;
  }
  if (f === 'salesbycp' || f === 'salescp') {
    return (data as any).salesByCp ?? 0;
  }
  if (f === 'salesbyhcmcate' || f === 'saleshcmcate') {
    return (data as any).salesByHcmcate ?? 0;
  }
  if (f === 'profit' || f === 'profitamount' || f === 'profitvnd' || f === 'loinhuan') {
    return (data as any).profit ?? (data as any).profitAmount ?? 0;
  }
  if (f === 'profitbycp' || f === 'profitcp') {
    return (data as any).profitByCp ?? 0;
  }
  if (f === 'profitbyhcmcate' || f === 'profithcmcate') {
    return (data as any).profitByHcmcate ?? 0;
  }
  if (f === 'margin' || f === 'marginvnd' || f === 'marginpercent' || f === 'margin%') {
    return (data as any).margin ?? 0;
  }
  if (f === 'marginbycp' || f === 'margincp' || f === 'margincp%') {
    return (data as any).marginByCp ?? 0;
  }
  if (f === 'hcmsaleseffi' || f === 'saleseffi') {
    return (data as any).hcmSalesEffi ?? 0;
  }
  if (f === 'hcmmargin' || f === 'hcmmargin%') {
    return (data as any).hcmMargin ?? 0;
  }

  // 2. Floor / Location / Year
  if (f === 'floor' || f === 'location' || f === 'tang' || f === 'appfloor' || f === 'appprojectfloor') {
    return (data as any).location || (data as any).floor || '';
  }
  if (f === 'year' || f === 'appprojectyear' || f === 'appyear' || f === 'nam') {
    return (data as any).appProjectYear || (data as any).year || '';
  }

  // 3. Shop Type (Bi-directional lookup between Real-time App & Master Data)
  if (f === 'shoptype' || f === 'appprojectshoptype' || f === 'appshoptype' || f === 'category' || f === 'loaigianhang') {
    return (data as any).appProjectShopType || (data as any).shopType || (data as any).category || '';
  }

  // 4. Project Code & Name
  if (f === 'projectcode' || f === 'appprojectcode' || f === 'appcode' || f === 'projcode' || f === 'code' || f === 'maproject') {
    return (data as any).appProjectCode || (data as any).projectCode || (data as any).unitName || (data as any).unit || '';
  }
  if (f === 'projectname' || f === 'appprojectname' || f === 'appname' || f === 'name' || f === 'tenduan') {
    return (data as any).appProjectName || (data as any).projectName || '';
  }

  // 5. Unit / Brand / Class / Vendor
  if (f === 'unit' || f === 'unitcode' || f === 'unitname' || f === 'magianhang') {
    return (data as any).unitName || (data as any).unit || (data as any).unitId || '';
  }
  if (f === 'brandname' || f === 'brand' || f === 'shopname' || f === 'tenhang') {
    return (data as any).brandName || '';
  }
  if (f === 'brandcode' || f === 'mabrand') {
    return (data as any).brandCode || '';
  }
  if (f === 'vendorcode' || f === 'mavendor' || f === 'vendor') {
    return (data as any).vendorCode || '';
  }
  if (f === 'classcode' || f === 'class' || f === 'nganhhang') {
    return (data as any).classCode || '';
  }

  // 6. Statuses & Tasks
  if (f === 'mdstatus' || f === 'appprojectmdstatus' || f === 'appmdstatus') {
    return (data as any).appProjectMdStatus || (data as any).mdStatus || '';
  }
  if (f === 'actstatus' || f === 'appprojectactstatus' || f === 'appactstatus' || f === 'actualstatus') {
    return (data as any).appProjectActStatus || (data as any).actStatus || '';
  }
  if (f === 'status' || f === 'projectstatus' || f === 'appprojectstatus' || f === 'appstatus') {
    return (data as any).appProjectStatus || (data as any).excelProjectStatus || (data as any).status || '';
  }
  if (f === 'task' || f === 'tasks' || f === 'apptask' || f === 'tasksummarize' || f === 'tasksummaries' || f === 'taskname') {
    return (data as any).task || '';
  }
  if (f === 'mdnotes' || f === 'notes') {
    return (data as any).mdNotes || (data as any).notes || '';
  }

  // 7. Area & Project Details
  if (f === 'size' || f === 'sizem2' || f === 'area' || f === 'dientich' || f === 'appprojectsizem2' || f === 'appsizem2') {
    return (data as any).sizeM2 ?? (data as any).appProjectSizeM2 ?? (data as any).size ?? 0;
  }
  if (f === 'budget' || f === 'appbudget' || f === 'appprojectbudget') {
    return (data as any).appProjectBudget ?? 0;
  }
  if (f === 'actual' || f === 'actualcost' || f === 'appactual' || f === 'appprojectactual') {
    return (data as any).appProjectActual ?? 0;
  }
  if (f === 'party' || f === 'contractor' || f === 'appparty' || f === 'appprojectparty') {
    return (data as any).appProjectParty || (data as any).party || '';
  }
  if (f === 'detail' || f === 'appdetail' || f === 'appprojectdetail') {
    return (data as any).appProjectDetail || (data as any).detail || '';
  }
  if (f === 'description' || f === 'appdescription' || f === 'appprojectdescription') {
    return (data as any).appProjectDescription || (data as any).description || '';
  }

  return (data as any)[field] ?? '';
}

/**
 * Pure function to evaluate if a rule matches a unit's aggregated data
 */
export function matchSingleRule(rule: GroupRule, data: DynamicUnitSummaryItem): boolean {
  let val: any = resolveRuleValue(rule.field, data);

  const f = String(rule.field || '').toLowerCase().trim();
  if (f.includes('margin') && typeof val === 'number' && val <= 1 && val > 0) {
    val = val * 100;
  }

  const numVal = Number(String(rule.value ?? '').replace(/,/g, '').trim());
  const isNum = !isNaN(numVal) && String(rule.value ?? '').trim() !== '';

  const parsedValNum = Number(String(val ?? '').replace(/,/g, '').trim());
  const valIsNum = !isNaN(parsedValNum) && String(val ?? '').trim() !== '';

  let compareValStr = String(val ?? '').toLowerCase().trim();
  let compareRuleStr = String(rule.value ?? '').toLowerCase().trim();

  // Normalize synonym status strings
  if (compareRuleStr === 'in progress') compareRuleStr = 'on process';
  if (compareValStr === 'in progress') compareValStr = 'on process';

  switch (rule.operator) {
    case '>':
      return isNum && valIsNum ? parsedValNum > numVal : false;
    case '<':
      return isNum && valIsNum ? parsedValNum < numVal : false;
    case '>=':
      return isNum && valIsNum ? parsedValNum >= numVal : false;
    case '<=':
      return isNum && valIsNum ? parsedValNum <= numVal : false;
    case '=':
      if (isNum && valIsNum) {
        return parsedValNum === numVal;
      }
      return compareValStr === compareRuleStr;
    case 'contains': {
      const searchTerms = compareRuleStr.split(/\s+/).filter(Boolean);
      return searchTerms.every((term) => compareValStr.includes(term));
    }
    case 'or':
    case 'OR': {
      const orTerms = compareRuleStr
        .split(/[\r\n\t,;+/&|]+|\s{2,}/)
        .map((t) => {
          let tr = t.trim();
          if (tr === 'in progress') tr = 'on process';
          return tr;
        })
        .filter(Boolean);
      if (orTerms.length === 0) {
        const spaceTerms = compareRuleStr.split(/\s+/).filter(Boolean);
        return spaceTerms.some((term) => compareValStr === term || compareValStr.includes(term));
      }
      return orTerms.some((term) => {
        if (compareValStr === term) return true;
        if (compareValStr.includes(term)) return true;
        if (isNum && valIsNum && !isNaN(Number(term)) && parsedValNum === Number(term)) return true;
        return false;
      });
    }
    case 'exclude': {
      const searchTerms = compareRuleStr.split(/\s+/).filter(Boolean);
      return !searchTerms.some((term) => compareValStr.includes(term));
    }
    default:
      return false;
  }
}
