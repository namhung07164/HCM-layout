import { parseDateTime } from '../../lib/utils';
import { parsePredecessorToken } from '../../lib/predecessorMatchUtils';
import { splitPredecessors } from '../../lib/ganttUtils';
import { inferStemDepartment } from './stemLibraryConfigService';
import { StemConnectorType, StemPresetBlockSeed } from './stemLibraryTypes';

export interface ParsedStemCsvResult {
  blocks: StemPresetBlockSeed[];
  sourceProjectCode: string;
  suggestedTitle: string;
  suggestedSubtitle: string;
}

/**
 * RFC-4180 compliant CSV line splitter supporting quoted commas and escaped quotes.
 */
function parseCsvLines(csvText: string): string[][] {
  const cleaned = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }
  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow);
  }
  return rows;
}

function normalizeHeaderKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses a CSV file (standard Taka-PM task export or template CSV) into STEM Library blocks,
 * preserving Parent Task ID / Parent Task Code hierarchy, Milestones (0d), and Predecessors.
 */
export function parseStemBlocksFromCsvText(
  csvText: string,
  fileName?: string
): ParsedStemCsvResult {
  const matrix = parseCsvLines(csvText);
  if (matrix.length < 2) {
    return {
      blocks: [],
      sourceProjectCode: 'CSV',
      suggestedTitle: 'Gói Import CSV',
      suggestedSubtitle: 'Imported from CSV',
    };
  }

  const headers = matrix[0].map(normalizeHeaderKey);
  const findCol = (...candidates: string[]): number => {
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colProjectCode = findCol('projectcode', 'code', 'maduan');
  const colSubtaskCode = findCol('subtaskcode', 'taskcodephu', 'taskcode', 'subcode', 'id', 'no');
  const colTaskName = findCol('taskname', 'name', 'title', 'tencongviec', 'task');
  const colParentCode = findCol(
    'parenttaskcode',
    'parenttaskid',
    'parentid',
    'parentcode',
    'parent',
    'taskcha'
  );
  const colStart = findCol('start', 'startdate', 'batdau');
  const colFinish = findCol('finish', 'end', 'enddate', 'ketthuc');
  const colDuration = findCol('duration', 'days', 'songay');
  const colParty = findCol('party', 'pic', 'department', 'bophan');
  const colPredecessor = findCol('predecessor', 'predecessors', 'connector', 'linhkien');
  const colDelegation = findCol('delegation', 'uyquyen', 'del');

  const dataRows = matrix.slice(1).filter((row) => {
    const nameVal = colTaskName !== -1 ? row[colTaskName] : row[0];
    return Boolean(nameVal && String(nameVal).trim());
  });

  // 1. Index rows by Sub-task code, #suffix, and Task name for Parent & Predecessor resolution
  const rowIndexByCode = new Map<string, number>();
  const rowIndexByHashNum = new Map<string, number>();
  const rowIndexByName = new Map<string, number>();
  let detectedProjectCode = '';

  dataRows.forEach((row, idx) => {
    const pCode = colProjectCode !== -1 ? String(row[colProjectCode] || '').trim() : '';
    if (pCode && !detectedProjectCode) detectedProjectCode = pCode;

    const subCode = colSubtaskCode !== -1 ? String(row[colSubtaskCode] || '').trim() : '';
    if (subCode) {
      const lower = subCode.toLowerCase();
      if (!rowIndexByCode.has(lower)) rowIndexByCode.set(lower, idx);
      const hashMatch = lower.match(/#(\d+)$/);
      if (hashMatch && !rowIndexByHashNum.has(`#${hashMatch[1]}`)) {
        rowIndexByHashNum.set(`#${hashMatch[1]}`, idx);
      }
    }
    rowIndexByHashNum.set(`#${idx + 1}`, idx);

    const tName = colTaskName !== -1 ? String(row[colTaskName] || '').trim() : '';
    if (tName && !rowIndexByName.has(tName.toLowerCase())) {
      rowIndexByName.set(tName.toLowerCase(), idx);
    }
  });

  const resolveRowIndexRef = (rawRef: string): number | null => {
    if (!rawRef) return null;
    const clean = rawRef.trim();
    const lower = clean.toLowerCase();
    if (rowIndexByCode.has(lower)) return rowIndexByCode.get(lower)!;
    if (rowIndexByName.has(lower)) return rowIndexByName.get(lower)!;

    // Only match bare #number if prefix matches detectedProjectCode or has no project prefix
    const hashIdx = lower.indexOf('#');
    if (hashIdx !== -1) {
      const prefix = lower.slice(0, hashIdx).trim();
      const suffix = lower.slice(hashIdx).trim();
      if (!prefix || (detectedProjectCode && prefix === detectedProjectCode.toLowerCase())) {
        if (rowIndexByHashNum.has(suffix)) return rowIndexByHashNum.get(suffix)!;
      }
    }
    return null;
  };

  // 2. Build raw blocks and link parentBlockIndex & predecessorBlockIndex
  const blocks: StemPresetBlockSeed[] = dataRows.map((row, idx) => {
    const name =
      (colTaskName !== -1 ? String(row[colTaskName] || '').trim() : '') || `Task #${idx + 1}`;
    const subCode = colSubtaskCode !== -1 ? String(row[colSubtaskCode] || '').trim() : '';
    const party = (colParty !== -1 ? String(row[colParty] || '').trim() : '') || 'PMO';
    const rawDel =
      colDelegation !== -1 ? String(row[colDelegation] || '').trim().toLowerCase() : '';
    const delegation =
      rawDel === 'true' || rawDel === '1' || rawDel === 'yes' || rawDel === 'x';

    // Duration: preserve 0 for milestones or parent summaries; fallback to start->finish span
    const rawDurStr = colDuration !== -1 ? String(row[colDuration] ?? '').trim() : '';
    let duration = 0;
    if (rawDurStr !== '') {
      const parsedDur = parseFloat(rawDurStr);
      duration = !isNaN(parsedDur) && parsedDur >= 0 ? Number(parsedDur.toFixed(1)) : 1;
    } else {
      const sDate = colStart !== -1 ? parseDateTime(row[colStart]) : null;
      const fDate = colFinish !== -1 ? parseDateTime(row[colFinish]) : null;
      if (sDate && fDate && !isNaN(sDate.getTime()) && !isNaN(fDate.getTime())) {
        const span = Math.max(0, (fDate.getTime() - sDate.getTime()) / 86400000);
        duration = Number(span.toFixed(1));
      } else {
        duration = 0;
      }
    }

    // Parent task resolution
    const rawParent = colParentCode !== -1 ? String(row[colParentCode] || '').trim() : '';
    let parentBlockIndex: number | null = null;
    let parentTaskId: string | undefined;
    if (rawParent) {
      const resolvedParentIdx = resolveRowIndexRef(rawParent);
      if (resolvedParentIdx !== null && resolvedParentIdx !== idx) {
        parentBlockIndex = resolvedParentIdx;
      } else {
        parentTaskId = rawParent;
      }
    }

    // Predecessor resolution
    const rawPred = colPredecessor !== -1 ? String(row[colPredecessor] || '').trim() : '';
    let connectorToPrev: StemConnectorType = idx === 0 ? 'FS' : 'FS';
    let lagDays = 0;
    let predecessorBlockIndex: number | null = null;
    let externalPredecessor: string | undefined;

    if (rawPred) {
      const tokens = splitPredecessors(rawPred);
      if (tokens.length > 0) {
        const parsedTok = parsePredecessorToken(tokens[0]);
        const suffixUpper = String(parsedTok.suffix || 'FS').toUpperCase();
        const relMatch = suffixUpper.match(/^(FS|SS|FF|SF)/);
        const relUpper = relMatch ? relMatch[1] : 'FS';
        if (relUpper === 'SS' || relUpper === 'FF' || relUpper === 'FS') {
          connectorToPrev = relUpper as StemConnectorType;
        }
        const lagMatch = suffixUpper.match(/([+-])(\d+(?:\.\d+)?)/);
        if (lagMatch) {
          const val = parseFloat(lagMatch[2]) || 0;
          lagDays = lagMatch[1] === '-' ? -val : val;
        }
        const refQuery = String(parsedTok.query || '').trim();
        const internalPredIdx = resolveRowIndexRef(refQuery);
        if (internalPredIdx !== null && internalPredIdx !== idx) {
          predecessorBlockIndex = internalPredIdx;
        } else if (refQuery) {
          externalPredecessor = rawPred;
        }
      }
    }

    return {
      name,
      duration,
      department: inferStemDepartment(name, party),
      party,
      delegation,
      connectorToPrev,
      lagDays,
      parentBlockIndex,
      ...(parentTaskId ? { parentTaskId } : {}),
      ...(predecessorBlockIndex !== null ? { predecessorBlockIndex } : {}),
      ...(externalPredecessor ? { externalPredecessor } : {}),
      ...(subCode ? { codeRef: subCode } : {}),
    };
  });

  // 3. Mark parent blocks as isModularParent = true, and ensure normal leaf blocks without duration default to >= 1d unless explicitly 0 in CSV
  const parentIndices = new Set<number>();
  blocks.forEach((b) => {
    if (typeof b.parentBlockIndex === 'number' && b.parentBlockIndex >= 0) {
      parentIndices.add(b.parentBlockIndex);
    }
  });

  blocks.forEach((b, idx) => {
    const rawDurStr =
      colDuration !== -1 ? String(dataRows[idx]?.[colDuration] ?? '').trim() : '';
    if (parentIndices.has(idx)) {
      b.isModularParent = true;
    } else if (b.duration === 0 && rawDurStr === '') {
      b.duration = 2;
    }
  });

  const cleanFileName = (fileName || '')
    .replace(/\.(csv|txt)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  const sourceCode = detectedProjectCode || cleanFileName || 'CSV';

  return {
    blocks,
    sourceProjectCode: sourceCode,
    suggestedTitle: `Gói ${detectedProjectCode || 'CSV'} (${blocks.length} khối)`,
    suggestedSubtitle: `Imported từ ${fileName || sourceCode} — Bảo toàn cấu trúc Parent Task & Predecessor`,
  };
}

/**
 * Computes realistic total duration of a template/workbench without double-counting
 * modular parent summary blocks or parallel SS/FF branches.
 */
export function computeEffectivePresetDays(
  blocks: Array<{
    duration: number;
    isModularParent?: boolean;
    parentBlockIndex?: number | null;
    connectorToPrev?: StemConnectorType;
  }>
): number {
  if (!blocks || blocks.length === 0) return 0;
  const parentSet = new Set<number>();
  blocks.forEach((b, i) => {
    if (b.isModularParent) parentSet.add(i);
    if (typeof b.parentBlockIndex === 'number') parentSet.add(b.parentBlockIndex);
  });

  const leafBlocks = blocks.filter((_, idx) => !parentSet.has(idx));
  const targetList = leafBlocks.length > 0 ? leafBlocks : blocks;

  let currentStageMax = 0;
  let totalSpan = 0;
  targetList.forEach((b, idx) => {
    const dur = Math.max(0, Number(b.duration) || 0);
    if (idx === 0) {
      currentStageMax = dur;
    } else if (b.connectorToPrev === 'SS' || b.connectorToPrev === 'FF') {
      currentStageMax = Math.max(currentStageMax, dur);
    } else {
      totalSpan += currentStageMax;
      currentStageMax = dur;
    }
  });
  totalSpan += currentStageMax;
  return Number(totalSpan.toFixed(1));
}
