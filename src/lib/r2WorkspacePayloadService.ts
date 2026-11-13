/**
 * Workspace Payload Builder & Hydrator for Cloudflare R2 & Local Disk Cache
 * Consolidates 100% of Floor Layout & Picture Mapping state into a unified payload.
 */

import { useDataStore } from '../components/PictureMapping/DataContext';
import { useAppStore } from '../store/useAppStore';
import { saveLayoutConfigToDisk } from './layoutConfigCache';
import { applyComparisonRowsToStores } from './standaloneComparisonService';
import {
  getSavedCustomPaintCategories,
  getSavedPaintGroupMappings,
  getSavedActivePaintFilter,
  hydratePaintCategoriesFromCloud,
} from '../components/LayoutTabParts/layoutPaintCategoriesService';
import { localDb } from './localDb';

import {
  getStoredR2CredentialsAsync,
  getS3Sdk,
  uploadSingleR2File,
  R2Credentials,
} from '../components/PictureMapping/lib/r2Upload';

const LOCAL_COMPARISON_STORAGE_KEY = 'taka_standalone_comparison_rows_v1';
const LAYOUT_SETTINGS_CACHE_KEY = 'hcm_layout_settings_v1';

let _prewarmedS3Client: any = null;
let _prewarmedCredsKey = '';

/**
 * Gets or creates a singleton S3 Client instance to eliminate SDK re-initialization overhead.
 */
export async function getOrCreateS3Client(): Promise<{ s3: any; creds: R2Credentials } | null> {
  const creds = await getStoredR2CredentialsAsync();
  if (!creds) return null;
  const credsKey = `${creds.accountId}:${creds.accessKeyId}:${creds.bucketName}`;
  if (_prewarmedS3Client && _prewarmedCredsKey === credsKey) {
    return { s3: _prewarmedS3Client, creds };
  }
  try {
    const { S3Client } = await getS3Sdk();
    _prewarmedS3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${creds.accountId.trim()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: creds.accessKeyId.trim(),
        secretAccessKey: creds.secretAccessKey.trim(),
      },
    });
    _prewarmedCredsKey = credsKey;
    return { s3: _prewarmedS3Client, creds };
  } catch (e) {
    console.warn('[R2 S3Client] Failed to initialize S3 SDK client:', e);
    return null;
  }
}

/**
 * Uploads imported CSV or Excel file directly to R2 under root & layout/ folder.
 */
export async function uploadImportedFileToR2(
  file: File,
  folder: 'root' | 'layout' = 'layout'
): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    const clientBundle = await getOrCreateS3Client();
    if (!clientBundle) {
      return { success: false, error: 'Chưa cấu hình R2 credentials' };
    }
    const { s3, creds } = clientBundle;

    const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = folder === 'layout' ? `layout/${cleanName}` : cleanName;

    const res = await uploadSingleR2File({ name: key, blob: file }, creds, s3);

    const ext = cleanName.endsWith('.xlsx') ? 'xlsx' : 'csv';
    const latestKey =
      folder === 'layout' ? `layout/comparison_latest.${ext}` : `dynamic_rules_latest.${ext}`;
    await uploadSingleR2File({ name: latestKey, blob: file }, creds, s3).catch(() => {});

    return { success: res.success, key, error: res.error };
  } catch (err: any) {
    console.warn('[R2 Upload] Upload imported file error:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

let _isApplyingRemotePayload = false;

export function isApplyingRemoteWorkspacePayload(): boolean {
  return _isApplyingRemotePayload;
}

/**
 * Collects all unit and legend custom images stored in localStorage.
 */
export function collectAllUnitAndLegendImagesFromStorage(): Record<string, any[]> {
  const map: Record<string, any[]> = {};
  if (typeof window === 'undefined') return map;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('hcm_unit_images_') || k.startsWith('taka_unit_images_')) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalizedKey = k.replace(/^(hcm_unit_images_|taka_unit_images_)/, '');
          map[normalizedKey] = parsed;
        }
      }
    }
  } catch {}
  return map;
}

/**
 * Restores unit and legend custom images into localStorage.
 */
export function restoreUnitAndLegendImagesToStorage(unitImagesMap?: Record<string, any[]>): void {
  if (!unitImagesMap || typeof unitImagesMap !== 'object' || typeof window === 'undefined') return;
  try {
    let changed = false;
    for (const [suffixKey, list] of Object.entries(unitImagesMap)) {
      if (!Array.isArray(list)) continue;
      const serialized = JSON.stringify(list);
      localStorage.setItem(`hcm_unit_images_${suffixKey}`, serialized);
      localStorage.setItem(`taka_unit_images_${suffixKey}`, serialized);
      changed = true;
    }
    if (changed) {
      window.dispatchEvent(new CustomEvent('taka_unit_images_changed'));
    }
  } catch {}
}

/**
 * Builds the complete unified workspace payload to be synced to R2 cloud.
 */
export function buildUnifiedWorkspacePayload() {
  const dataStore = useDataStore.getState();
  const appStore = useAppStore.getState();

  let comparisonRows: any[] = [];
  try {
    const comparisonRaw = localStorage.getItem(LOCAL_COMPARISON_STORAGE_KEY);
    if (comparisonRaw) {
      comparisonRows = JSON.parse(comparisonRaw);
    }
  } catch {}

  let layoutSettings: Record<string, any> = {};
  try {
    const rawSettings = localStorage.getItem(LAYOUT_SETTINGS_CACHE_KEY);
    if (rawSettings) {
      layoutSettings = JSON.parse(rawSettings) || {};
    }
  } catch {}

  const paintCategoriesConfig = {
    categories: getSavedCustomPaintCategories(),
    groupMappings: getSavedPaintGroupMappings(),
    activePaintFilter: getSavedActivePaintFilter(),
    updatedAt: new Date().toISOString(),
  };

  const unitImagesMap = collectAllUnitAndLegendImagesFromStorage();
  const currentAppYear = appStore.globalYearFilter;
  const targetYear = currentAppYear && currentAppYear !== 'all' ? currentAppYear : '2026';

  return {
    app: 'Taka-Layout-Standalone',
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
    store: dataStore.store || 'HCM',
    location: dataStore.location || 'L1',
    year: targetYear,
    globalYearFilter: targetYear,
    activeMapVersionId: dataStore.activeMapVersionId,
    reviewSelectedLabels: dataStore.reviewSelectedLabels || [],
    reviewLabelColors: dataStore.reviewLabelColors || {},
    storeLocationData: dataStore.storeLocationData || {},
    mapUnits: dataStore.mapUnits || [],
    versions: dataStore.mapVersions || [],
    unitInfo: dataStore.unitInfo || [],
    classInfo: dataStore.classInfo || [],
    actualClassInfo: dataStore.actualClassInfo || [],
    sales: dataStore.sales || [],
    profits: dataStore.profits || [],
    subFees: dataStore.subFees || [],
    mdStatus: dataStore.mdStatus || [],
    projectStatus: dataStore.projectStatus || [],
    projectLink: dataStore.projectLink || [],
    basePlan: dataStore.basePlan || [],
    units: dataStore.units || [],
    comparisonRows,
    projects: appStore.projects || [],
    tasks: appStore.tasks || [],
    layoutSettings,
    paintCategoriesConfig,
    unitImagesMap,
  };
}

/**
 * Applies a unified workspace payload into DataStore, AppStore, IndexedDB, and LocalStorage.
 */
export async function applyUnifiedWorkspacePayload(
  data: any,
  options?: { persistToDisk?: boolean }
): Promise<void> {
  if (!data || typeof data !== 'object') return;
  _isApplyingRemotePayload = true;
  try {
    // 1. Hydrate DataStore (floorplans, polygons, dynamic rules, partitions)
    useDataStore.getState().loadFullCloudData(data);

    // 2. Hydrate Comparison Rows (unitInfo, sales, profits, mdStatus, projectStatus, projects, tasks)
    if (Array.isArray(data.comparisonRows) && data.comparisonRows.length > 0) {
      applyComparisonRowsToStores(data.comparisonRows);
    }

    // 3. Restore Projects & Tasks if explicitly saved (preserves attached imageLinks, comments, custom edits)
    const appStore = useAppStore.getState();
    if (Array.isArray(data.projects) && data.projects.length > 0) {
      appStore.setProjects(data.projects);
      localDb.projects.bulkPut(data.projects).catch(() => {});
    }
    if (Array.isArray(data.tasks) && data.tasks.length > 0) {
      appStore.setTasks(data.tasks);
      localDb.tasks.bulkPut(data.tasks).catch(() => {});
    }

    // 4. Restore Layout Settings (custom floor URLs)
    if (data.layoutSettings && typeof data.layoutSettings === 'object') {
      try {
        localStorage.setItem(LAYOUT_SETTINGS_CACHE_KEY, JSON.stringify(data.layoutSettings));
      } catch {}
    }

    // 5. Restore Paint Categories Config (Edit Mode filters & group mappings)
    if (data.paintCategoriesConfig && typeof data.paintCategoriesConfig === 'object') {
      hydratePaintCategoriesFromCloud(data.paintCategoriesConfig);
    }

    // 6. Restore Unit & Color Legend Attached Images
    if (data.unitImagesMap && typeof data.unitImagesMap === 'object') {
      restoreUnitAndLegendImagesToStorage(data.unitImagesMap);
    }

    // 7. Save to Local Disk Cache (IndexedDB + CacheStorage + localStorage)
    if (options?.persistToDisk !== false) {
      await saveLayoutConfigToDisk(data);
      try {
        localStorage.setItem('taka_mapping_config_backup', JSON.stringify(data));
      } catch {}
    }

    // 8. Notify all UI listeners (LayoutViewer, Settings, Tooltips) in 0ms
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('taka_cloud_sync_updated', {
          detail: {
            timestamp: data.timestamp || Date.now(),
            store: data.store,
            location: data.location,
            storeLocationData: data.storeLocationData,
            fullData: data,
          },
        })
      );
    }
  } finally {
    _isApplyingRemotePayload = false;
  }
}

/**
 * Smart Partition Merge: Combines remote R2 payload and local payload so edits on different floors/stores
 * or unit attachments across multiple devices never overwrite each other.
 */
export function mergeRemoteAndLocalPayloads(remote: any, local: any): any {
  if (!remote || typeof remote !== 'object') return local;
  if (!local || typeof local !== 'object') return remote;

  const activePartitionKey = `${local.store || 'HCM'}_${local.location || 'L1'}`;
  const mergedStoreLocationData: Record<string, any> = {
    ...(remote.storeLocationData || {}),
    ...(local.storeLocationData || {}),
  };

  // Ensure remote partitions that were updated more recently than non-active local partitions are preserved
  if (remote.storeLocationData && typeof remote.storeLocationData === 'object') {
    for (const [pKey, remotePart] of Object.entries<any>(remote.storeLocationData)) {
      if (pKey === activePartitionKey && local.storeLocationData?.[pKey]) {
        mergedStoreLocationData[pKey] = local.storeLocationData[pKey];
      } else if (!local.storeLocationData?.[pKey]) {
        mergedStoreLocationData[pKey] = remotePart;
      }
    }
  }

  const mergedUnitImagesMap: Record<string, any[]> = {
    ...(remote.unitImagesMap || {}),
    ...(local.unitImagesMap || {}),
  };

  const mergedLayoutSettings: Record<string, any> = {
    ...(remote.layoutSettings || {}),
    ...(local.layoutSettings || {}),
  };

  const mergedCategories = Array.from(
    new Set([
      ...(remote.paintCategoriesConfig?.categories || []),
      ...(local.paintCategoriesConfig?.categories || []),
    ])
  );

  return {
    ...remote,
    ...local,
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
    storeLocationData: mergedStoreLocationData,
    unitImagesMap: mergedUnitImagesMap,
    layoutSettings: mergedLayoutSettings,
    paintCategoriesConfig: {
      ...(remote.paintCategoriesConfig || {}),
      ...(local.paintCategoriesConfig || {}),
      categories:
        mergedCategories.length > 0
          ? mergedCategories
          : local.paintCategoriesConfig?.categories || [],
      groupMappings: {
        ...(remote.paintCategoriesConfig?.groupMappings || {}),
        ...(local.paintCategoriesConfig?.groupMappings || {}),
      },
    },
  };
}

/**
 * Computes a deterministic JSON fingerprint of all layout & workspace business data.
 * Transient timestamps (timestamp, updatedAt) are excluded so only actual data changes trigger dirty state.
 */
export function computeLayoutDataFingerprint(payload?: any): string {
  const p = payload || buildUnifiedWorkspacePayload();
  if (!p) return '';
  const core = {
    storeLocationData: p.storeLocationData || {},
    comparisonRows: p.comparisonRows || [],
    projects: (p.projects || []).map((proj: any) => ({
      id: proj.id,
      code: proj.code,
      name: proj.name,
      status: proj.status,
      actStatus: proj.actStatus,
      store: proj.store,
      location: proj.location,
      year: proj.year,
      budget: proj.budget,
      actualCost: proj.actualCost,
      party: proj.party,
      notes: proj.notes,
      unitCode: proj.unitCode,
    })),
    tasks: (p.tasks || []).map((t: any) => ({
      id: t.id,
      projectId: t.projectId,
      taskCodePhu: t.taskCodePhu,
      name: t.name,
      start: t.start,
      finish: t.finish,
      status: t.status,
      predecessor: t.predecessor,
    })),
    layoutSettings: p.layoutSettings || {},
    paintCategories: p.paintCategoriesConfig?.categories || [],
    paintGroupMappings: p.paintCategoriesConfig?.groupMappings || {},
    paintActiveFilter: p.paintCategoriesConfig?.activePaintFilter || '',
    unitImagesMap: p.unitImagesMap || {},
    mapUnits: p.mapUnits || [],
    unitInfo: p.unitInfo || [],
    classInfo: p.classInfo || [],
    actualClassInfo: p.actualClassInfo || [],
    sales: p.sales || [],
    profits: p.profits || [],
    subFees: p.subFees || [],
    mdStatus: p.mdStatus || [],
    projectStatus: p.projectStatus || [],
    projectLink: p.projectLink || [],
    basePlan: p.basePlan || [],
    units: p.units || [],
  };
  return JSON.stringify(core);
}

/**
 * Fast 32-bit hash for instant layout payload dirty checking without memory overhead.
 */
export function fastHashLayoutPayload(payload?: any): string {
  const str = computeLayoutDataFingerprint(payload);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `${str.length}_${hash}`;
}
