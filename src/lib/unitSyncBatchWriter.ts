import { patchLocalRecord } from './localDb';
import { useAppStore } from '../store/useAppStore';
import { useDataStore } from '../components/PictureMapping/DataContext';
import { saveLayoutConfigToDisk } from './layoutConfigCache';

let _mappingCloudPersistTimer: ReturnType<typeof setTimeout> | null = null;
const pendingProjectPatches = new Map<string, Record<string, any>>();
let projectPatchTimer: ReturnType<typeof setTimeout> | null = null;

export function queueProjectPatch(docId: string, payload: Record<string, any>) {
  pendingProjectPatches.set(docId, payload);
  if (projectPatchTimer) clearTimeout(projectPatchTimer);
  projectPatchTimer = setTimeout(() => {
    projectPatchTimer = null;
    const entries = Array.from(pendingProjectPatches.entries());
    pendingProjectPatches.clear();
    entries.forEach(([id, patch]) => {
      patchLocalRecord('taka_projects', id, patch).catch(() => {});
      useAppStore.getState().optimisticUpdateProjects([{ id, ...patch } as any]);
    });
  }, 400);
}

export function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sanitizeForFirestore);
  const out: Record<string, any> = {};
  for (const k of Object.keys(val)) {
    if (val[k] !== undefined) out[k] = sanitizeForFirestore(val[k]);
  }
  return out;
}

/**
 * Debounced persistence of Picture Mapping storeLocationData to local disk cache.
 * Firestore network calls eliminated in standalone local-first mode.
 */
export function schedulePersistMappingConfigToFirestore() {
  if (typeof window === 'undefined') return;
  if (_mappingCloudPersistTimer) {
    clearTimeout(_mappingCloudPersistTimer);
  }
  _mappingCloudPersistTimer = setTimeout(async () => {
    _mappingCloudPersistTimer = null;
    try {
      const state = useDataStore.getState();
      const consolidated = state.getConsolidatedSaveData();
      if (!consolidated.storeLocationData || Object.keys(consolidated.storeLocationData).length === 0) {
        return;
      }
      saveLayoutConfigToDisk(consolidated).catch(() => {});
    } catch (err) {
      console.warn('[unitProjectSizeSync] Local disk save warning:', err);
    }
  }, 600);
}
