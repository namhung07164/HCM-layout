import { doc, getDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../lib/firebase';
import { setDoc } from '../../lib/firestoreWrites';
import { removeUndefinedDeep } from '../../lib/firestoreSanitizer';
import { bumpConfigVersion } from '../../lib/configCacheService';
import { Task } from '../../types';
import { sortGroupTasks } from '../../lib/ganttUtilsParts/taskSortingAndCodes';
import {
  DEFAULT_LEGO_PARTS_BIN,
  DEFAULT_STEM_PRESETS,
  StemConnectorType,
  StemDepartmentId,
  StemLibraryBlockTemplate,
  StemPresetBlockSeed,
  StemPresetPackage,
} from './stemLibraryTypes';

const LOCAL_STEM_STORAGE_KEY = 'taka_stem_library_v1';
const FIRESTORE_STEM_DOC_ID = 'stem_task_library';

export interface StemLibraryPersistedConfig {
  customPresets: StemPresetPackage[];
  customParts: StemLibraryBlockTemplate[];
  presetOverrides?: Record<string, StemPresetPackage>;
  updatedAt: string;
  updatedBy?: string;
}

let memoryConfigCache: StemLibraryPersistedConfig | null = null;
let hasHydratedFromCloud = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeStemLibraryConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadLocalStemConfig(): StemLibraryPersistedConfig {
  if (memoryConfigCache) return memoryConfigCache;
  if (typeof window === 'undefined') {
    return { customPresets: [], customParts: [], presetOverrides: {}, updatedAt: '' };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STEM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryConfigCache = {
        customPresets: Array.isArray(parsed?.customPresets) ? parsed.customPresets : [],
        customParts: Array.isArray(parsed?.customParts) ? parsed.customParts : [],
        presetOverrides:
          parsed?.presetOverrides && typeof parsed.presetOverrides === 'object'
            ? parsed.presetOverrides
            : {},
        updatedAt: String(parsed?.updatedAt || ''),
        updatedBy: parsed?.updatedBy,
      };
      return memoryConfigCache;
    }
  } catch {
    // ignore storage errors
  }
  memoryConfigCache = { customPresets: [], customParts: [], presetOverrides: {}, updatedAt: '' };
  return memoryConfigCache;
}

function saveLocalStemConfig(cfg: StemLibraryPersistedConfig) {
  memoryConfigCache = cfg;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCAL_STEM_STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // ignore quota error
    }
  }
  notifyListeners();
}

export function applyRemoteStemLibraryConfig(data: Partial<StemLibraryPersistedConfig>): void {
  if (!data || typeof data !== 'object') return;
  const local = loadLocalStemConfig();
  const remoteUpdatedAt = String(data.updatedAt || '');
  if (local.updatedAt && remoteUpdatedAt && remoteUpdatedAt < local.updatedAt) return;
  saveLocalStemConfig({
    customPresets: Array.isArray(data.customPresets) ? data.customPresets : local.customPresets,
    customParts: Array.isArray(data.customParts) ? data.customParts : local.customParts,
    presetOverrides:
      data.presetOverrides && typeof data.presetOverrides === 'object'
        ? data.presetOverrides
        : local.presetOverrides || {},
    updatedAt: remoteUpdatedAt || new Date().toISOString(),
    updatedBy: data.updatedBy || local.updatedBy,
  });
}

export async function hydrateStemConfigFromFirestoreOnce(): Promise<StemLibraryPersistedConfig> {
  const local = loadLocalStemConfig();
  if (hasHydratedFromCloud) return local;
  hasHydratedFromCloud = true;

  try {
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'taka_config', FIRESTORE_STEM_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      applyRemoteStemLibraryConfig(snap.data() as Partial<StemLibraryPersistedConfig>);
      return loadLocalStemConfig();
    }
  } catch {
    // fallback silently to local cache
  }
  return local;
}

export async function persistStemConfigUnified(
  nextConfig: StemLibraryPersistedConfig,
  userEmail?: string
): Promise<void> {
  const stamped: StemLibraryPersistedConfig = removeUndefinedDeep({
    ...nextConfig,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail || nextConfig.updatedBy || 'PM',
  });
  // 0ms Local & Memory update
  saveLocalStemConfig(stamped);

  // Sync to taka_config/stem_task_library + bump static config version
  try {
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'taka_config', FIRESTORE_STEM_DOC_ID);
    await setDoc(docRef, stamped, { merge: true });
    await bumpConfigVersion('parties');
  } catch (err) {
    console.warn('[StemLibrary] Cloud config sync deferred:', err);
  }
}

export function getAllStemPresets(): StemPresetPackage[] {
  const { customPresets, presetOverrides } = loadLocalStemConfig();
  const overrides = presetOverrides || {};
  const builtIns = DEFAULT_STEM_PRESETS.map((p) =>
    overrides[p.id] ? { ...overrides[p.id], id: p.id, isBuiltIn: true } : p
  );
  return [...builtIns, ...(customPresets || [])];
}

export function hasBuiltInPresetOverride(presetId: string): boolean {
  const { presetOverrides } = loadLocalStemConfig();
  return Boolean(presetOverrides && presetOverrides[presetId]);
}

export function getAllStemPartsBin(): StemLibraryBlockTemplate[] {
  const { customParts } = loadLocalStemConfig();
  return [...DEFAULT_LEGO_PARTS_BIN, ...(customParts || [])];
}

export async function saveCustomStemPreset(
  preset: Omit<StemPresetPackage, 'id' | 'isBuiltIn' | 'createdAt'>,
  userEmail?: string
): Promise<StemPresetPackage> {
  const current = loadLocalStemConfig();
  const newPreset: StemPresetPackage = {
    ...preset,
    id: `custom-preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    createdBy: userEmail || 'PM',
  };

  // Also register any unique blocks into customParts if not already in bin
  const existingNames = new Set(
    [...DEFAULT_LEGO_PARTS_BIN, ...current.customParts].map((p) => p.name.trim().toLowerCase())
  );
  const newCustomParts: StemLibraryBlockTemplate[] = [...current.customParts];
  newPreset.blocks.forEach((b, idx) => {
    const key = b.name.trim().toLowerCase();
    if (key && !existingNames.has(key)) {
      existingNames.add(key);
      newCustomParts.push({
        id: `custom-part-${Date.now()}-${idx}`,
        name: b.name.trim(),
        defaultDuration: b.duration,
        department: b.department,
        party: b.party || 'PMO',
        delegation: b.delegation,
        defaultConnector: b.connectorToPrev === 'NONE' ? 'FS' : b.connectorToPrev,
      });
    }
  });

  await persistStemConfigUnified(
    {
      ...current,
      customPresets: [newPreset, ...current.customPresets],
      customParts: newCustomParts,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
    },
    userEmail
  );

  return newPreset;
}

export async function updateStemPreset(
  updatedPreset: StemPresetPackage,
  userEmail?: string
): Promise<void> {
  const current = loadLocalStemConfig();
  if (updatedPreset.isBuiltIn || DEFAULT_STEM_PRESETS.some((p) => p.id === updatedPreset.id)) {
    const nextOverrides = {
      ...(current.presetOverrides || {}),
      [updatedPreset.id]: { ...updatedPreset, isBuiltIn: true },
    };
    await persistStemConfigUnified(
      {
        ...current,
        presetOverrides: nextOverrides,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail,
      },
      userEmail
    );
  } else {
    const nextCustom = (current.customPresets || []).map((p) =>
      p.id === updatedPreset.id ? { ...updatedPreset, isBuiltIn: false } : p
    );
    await persistStemConfigUnified(
      {
        ...current,
        customPresets: nextCustom,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail,
      },
      userEmail
    );
  }
}

export async function resetBuiltInStemPreset(presetId: string, userEmail?: string): Promise<void> {
  const current = loadLocalStemConfig();
  const nextOverrides = { ...(current.presetOverrides || {}) };
  delete nextOverrides[presetId];
  await persistStemConfigUnified(
    {
      ...current,
      presetOverrides: nextOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
    },
    userEmail
  );
}

export async function deleteCustomStemPreset(presetId: string, userEmail?: string): Promise<void> {
  const current = loadLocalStemConfig();
  const filtered = current.customPresets.filter((p) => p.id !== presetId);
  await persistStemConfigUnified(
    {
      ...current,
      customPresets: filtered,
      updatedAt: new Date().toISOString(),
    },
    userEmail
  );
}

/**
 * Auto-classifies a task into one of the 4 STEM department compartments based on task name and party.
 */
export function inferStemDepartment(name?: string, party?: string): StemDepartmentId {
  const text = `${name || ''} ${party || ''}`.toLowerCase();
  if (
    /pccc|mep|hvac|sprinkler|exhaust|waterproof|gas|plumbing|điện|nước|chữa cháy|ống gió|cấp thoát/i.test(
      text
    )
  ) {
    return 'mep_pccc';
  }
  if (
    /it\b|pos\b|cabling|wifi|wi-fi|final|inspection|nghiệm thu|handover|bàn giao|opening|khai trương|hoarding down|tháo rào|cleaning/i.test(
      text
    )
  ) {
    return 'it_pos_handover';
  }
  if (
    /hoarding|dựng rào|thạch cao|gypsum|ceiling|trần|tường|partition|floor|sàn|millwork|ffd|nội thất|signage|biển hiệu|demolition|tháo dỡ|kitchen|bếp|vm\b/i.test(
      text
    )
  ) {
    return 'interior_hoarding';
  }
  return 'prep_bql';
}

/**
 * 1-Click Capture Serializer:
 * Strips concrete project codes and dates from selected tasks, preserving
 * task names, durations, responsible parties, delegation flags, relative FS/SS/FF connectors,
 * and Parent Task ID / Parent-Child Hierarchy.
 */
export function extractStemBlocksFromTasks(selectedTasks: Task[]): StemPresetBlockSeed[] {
  if (!selectedTasks || selectedTasks.length === 0) return [];
  const sorted = sortGroupTasks(selectedTasks);

  // Build lookup maps for resolving parentTaskId and predecessor references within the captured set
  const indexById = new Map<string, number>();
  const indexByCode = new Map<string, number>();
  const indexByName = new Map<string, number>();

  sorted.forEach((t, idx) => {
    if (t.id) indexById.set(String(t.id).trim().toLowerCase(), idx);
    if (t.taskCodePhu) indexByCode.set(String(t.taskCodePhu).trim().toLowerCase(), idx);
    if (t.name) {
      const nLower = String(t.name).trim().toLowerCase();
      if (!indexByName.has(nLower)) indexByName.set(nLower, idx);
    }
  });

  const resolveTaskIndex = (ref?: string): number | null => {
    if (!ref) return null;
    const lower = String(ref).trim().toLowerCase();
    if (!lower) return null;
    if (indexById.has(lower)) return indexById.get(lower)!;
    if (indexByCode.has(lower)) return indexByCode.get(lower)!;
    if (indexByName.has(lower)) return indexByName.get(lower)!;
    return null;
  };

  const parentIndexSet = new Set<number>();
  const rawBlocks: StemPresetBlockSeed[] = sorted.map((t, idx) => {
    const rawDurStr = String(t.duration ?? '').trim();
    const rawDur = parseFloat(rawDurStr);
    const safeDuration =
      rawDurStr !== '' && !isNaN(rawDur) && rawDur >= 0 ? Number(rawDur.toFixed(1)) : 2;
    const prevTask = idx > 0 ? sorted[idx - 1] : null;

    let parentBlockIndex: number | null = null;
    let parentTaskId: string | undefined;
    const rawParent = String(t.parentTaskId || (t as any).parentId || '').trim();
    if (rawParent) {
      const pIdx = resolveTaskIndex(rawParent);
      if (pIdx !== null && pIdx !== idx) {
        parentBlockIndex = pIdx;
        parentIndexSet.add(pIdx);
      } else {
        parentTaskId = rawParent;
      }
    }

    let connectorToPrev: StemConnectorType = 'FS';
    let predecessorBlockIndex: number | null = null;
    let externalPredecessor: string | undefined;
    const rawPred = String(t.predecessor || '').trim();

    if (idx > 0) {
      if (!rawPred && (!t.predecessors || t.predecessors.length === 0)) {
        if (prevTask?.start && t.start && prevTask.start.slice(0, 10) === t.start.slice(0, 10)) {
          connectorToPrev = 'SS';
        } else {
          connectorToPrev = 'FS';
        }
      } else {
        const upperPred = rawPred.toUpperCase();
        if (upperPred.includes('SS')) {
          connectorToPrev = 'SS';
        } else if (upperPred.includes('FF')) {
          connectorToPrev = 'FF';
        } else {
          connectorToPrev = 'FS';
        }
        const strippedRef = rawPred.replace(/(FS|SS|FF|SF)([+-]\d+(\.\d+)?d?)?$/i, '').trim();
        const predIdx = resolveTaskIndex(strippedRef);
        if (predIdx !== null && predIdx !== idx) {
          predecessorBlockIndex = predIdx;
        } else if (strippedRef) {
          externalPredecessor = rawPred;
        }
      }
    }

    return {
      name: String(t.name || `Task Step ${idx + 1}`).trim(),
      duration: safeDuration,
      department: inferStemDepartment(t.name, t.party),
      party: String(t.party || 'PMO').trim() || 'PMO',
      delegation: Boolean(t.delegation),
      connectorToPrev,
      lagDays: 0,
      parentBlockIndex,
      ...(parentTaskId ? { parentTaskId } : {}),
      ...(t.isModularParent ? { isModularParent: true } : {}),
      ...(predecessorBlockIndex !== null ? { predecessorBlockIndex } : {}),
      ...(externalPredecessor ? { externalPredecessor } : {}),
      ...(t.taskCodePhu ? { codeRef: String(t.taskCodePhu).trim() } : {}),
    };
  });

  parentIndexSet.forEach((pIdx) => {
    if (rawBlocks[pIdx]) {
      rawBlocks[pIdx].isModularParent = true;
    }
  });

  return rawBlocks;
}
