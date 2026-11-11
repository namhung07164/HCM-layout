/**
 * Comprehensive R2 Cloud Synchronization Service for Layout & Picture Mapping
 * Handles:
 * 1. Synchronizing layout and comparison data under folder `layout/` (e.g. `layout/layout_config.json`, `layout/comparison_latest.csv`)
 * 2. Automatic cloud pull when opening Layout tab
 * 3. Local disk caching (IndexedDB + CacheStorage + localStorage)
 * 4. Auto-save on app close / unload (pagehide / visibilitychange / beforeunload)
 */

import { getStoredR2CredentialsAsync, getS3Sdk, uploadSingleR2File, downloadR2JsonFile, R2Credentials } from '../components/PictureMapping/lib/r2Upload';
import { useDataStore } from '../components/PictureMapping/DataContext';
import { useAppStore } from '../store/useAppStore';
import { saveLayoutConfigToDisk, getCachedLayoutConfigFromDisk, isValidLayoutConfig } from './layoutConfigCache';
import { applyComparisonRowsToStores } from './standaloneComparisonService';

const LOCAL_COMPARISON_STORAGE_KEY = 'taka_standalone_comparison_rows_v1';
const LAYOUT_R2_CONFIG_KEY = 'layout/layout_config.json';
const ROOT_MAPPING_CONFIG_KEY = 'mapping_config.json';

let isAutoSaving = false;
let pendingAutoSave = false;
let isPullingFromCloud = false;

/**
 * Builds the complete unified workspace payload to be synced to R2 cloud.
 */
export function buildUnifiedWorkspacePayload() {
  const dataStore = useDataStore.getState();
  const consolidated = dataStore.getConsolidatedSaveData();
  const comparisonRaw = localStorage.getItem(LOCAL_COMPARISON_STORAGE_KEY);
  let comparisonRows: any[] = [];
  try {
    if (comparisonRaw) {
      comparisonRows = JSON.parse(comparisonRaw);
    }
  } catch {}

  const currentAppYear = useAppStore.getState().globalYearFilter;
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
  };
}

/**
 * Uploads imported CSV or Excel file directly to R2 under root & layout/ folder.
 */
export async function uploadImportedFileToR2(
  file: File,
  folder: 'root' | 'layout' = 'layout'
): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    const creds = await getStoredR2CredentialsAsync();
    if (!creds) {
      console.info('[R2 Upload] No R2 credentials configured, skip file upload.');
      return { success: false, error: 'Chưa cấu hình R2 credentials' };
    }

    const { S3Client } = await getS3Sdk();
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${creds.accountId.trim()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: creds.accessKeyId.trim(),
        secretAccessKey: creds.secretAccessKey.trim(),
      },
    });

    const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const timestamp = Date.now();
    const key = folder === 'layout' ? `layout/${cleanName}` : cleanName;

    const res = await uploadSingleR2File({ name: key, blob: file }, creds, s3);

    // Also save as latest copy for quick retrieval
    const ext = cleanName.endsWith('.xlsx') ? 'xlsx' : 'csv';
    const latestKey = folder === 'layout' ? `layout/comparison_latest.${ext}` : `dynamic_rules_latest.${ext}`;
    await uploadSingleR2File({ name: latestKey, blob: file }, creds, s3).catch(() => {});

    return { success: res.success, key, error: res.error };
  } catch (err: any) {
    console.warn('[R2 Upload] Upload imported file error:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Saves unified app data to Cloudflare R2 across both `layout/` and root folders.
 */
export async function syncAllDataToCloudR2(options?: {
  silent?: boolean;
}): Promise<{ success: boolean; message: string }> {
  if (isAutoSaving) {
    pendingAutoSave = true;
    return { success: true, message: 'Đang xếp hàng đồng bộ R2...' };
  }

  isAutoSaving = true;
  try {
    const creds = await getStoredR2CredentialsAsync();
    if (!creds) {
      return { success: false, message: 'Chưa cấu hình R2 Cloudflare.' };
    }

    const { S3Client } = await getS3Sdk();
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${creds.accountId.trim()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: creds.accessKeyId.trim(),
        secretAccessKey: creds.secretAccessKey.trim(),
      },
    });

    const payload = buildUnifiedWorkspacePayload();

    // 1. Save locally to disk cache (IndexedDB + CacheStorage)
    await saveLayoutConfigToDisk(payload);

    // 2. Upload to layout/layout_config.json
    const layoutBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const resLayout = await uploadSingleR2File({ name: LAYOUT_R2_CONFIG_KEY, blob: layoutBlob }, creds, s3);

    // 3. Upload to root mapping_config.json for PictureMapping backward compatibility
    const rootBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    await uploadSingleR2File({ name: ROOT_MAPPING_CONFIG_KEY, blob: rootBlob }, creds, s3).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('taka_cloud_sync_updated', {
          detail: {
            timestamp: payload.timestamp,
            store: payload.store,
            location: payload.location,
            storeLocationData: payload.storeLocationData,
          },
        })
      );
    }

    if (!options?.silent) {
      useAppStore.getState().setToast({
        title: 'Cloud R2 Synced',
        message: 'Đã lưu đồng bộ dữ liệu vào thư mục layout/ trên Cloudflare R2.',
        type: 'success',
      });
    }

    return {
      success: resLayout.success,
      message: resLayout.success
        ? 'Đã đồng bộ thành công vào thư mục layout/ trên R2!'
        : resLayout.error || 'Lỗi khi lưu lên R2.',
    };
  } catch (err: any) {
    console.warn('[SyncAllDataToCloudR2] Error:', err);
    return { success: false, message: err?.message || String(err) };
  } finally {
    isAutoSaving = false;
    if (pendingAutoSave) {
      pendingAutoSave = false;
      syncAllDataToCloudR2({ silent: true }).catch(() => {});
    }
  }
}

/**
 * Loads full cloud data from Cloudflare R2 (checks `layout/layout_config.json` first, falls back to `mapping_config.json`).
 */
export async function loadUnifiedDataFromCloudR2(options?: {
  silent?: boolean;
}): Promise<{ success: boolean; source?: string; message: string }> {
  if (isPullingFromCloud) {
    return { success: true, message: 'Đang tải dữ liệu từ Cloud...' };
  }

  isPullingFromCloud = true;
  try {
    const creds = await getStoredR2CredentialsAsync();
    let data: any = null;
    let source = '';

    if (creds) {
      const { S3Client } = await getS3Sdk();
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${creds.accountId.trim()}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: creds.accessKeyId.trim(),
          secretAccessKey: creds.secretAccessKey.trim(),
        },
      });

      // Try layout/layout_config.json first
      const layoutRes = await downloadR2JsonFile<any>(LAYOUT_R2_CONFIG_KEY, creds, s3);
      if (layoutRes.success && layoutRes.data && isValidLayoutConfig(layoutRes.data)) {
        data = layoutRes.data;
        source = 'R2 layout/ folder';
      } else {
        // Fallback to root mapping_config.json
        const rootRes = await downloadR2JsonFile<any>(ROOT_MAPPING_CONFIG_KEY, creds, s3);
        if (rootRes.success && rootRes.data && isValidLayoutConfig(rootRes.data)) {
          data = rootRes.data;
          source = 'R2 root folder';
        }
      }
    }

    // Fallback to local disk cache if R2 unavailable
    if (!data) {
      const diskData = await getCachedLayoutConfigFromDisk();
      if (diskData && isValidLayoutConfig(diskData)) {
        data = diskData;
        source = 'Local Disk Cache';
      }
    }

    if (!data) {
      return { success: false, message: 'Chưa có cấu hình trên Cloudflare R2.' };
    }

    // Apply to DataStore
    useDataStore.getState().loadFullCloudData(data);
    await saveLayoutConfigToDisk(data);

    // Apply comparison rows if available
    if (Array.isArray(data.comparisonRows) && data.comparisonRows.length > 0) {
      applyComparisonRowsToStores(data.comparisonRows);
    }

    if (!options?.silent) {
      useAppStore.getState().setToast({
        title: 'Loaded from Cloud R2',
        message: `Đã nạp dữ liệu từ ${source}.`,
        type: 'success',
      });
    }

    return {
      success: true,
      source,
      message: `Đã tải thành công từ ${source}.`,
    };
  } catch (err: any) {
    console.warn('[LoadUnifiedDataFromCloudR2] Error:', err);
    return { success: false, message: err?.message || String(err) };
  } finally {
    isPullingFromCloud = false;
  }
}

/**
 * Initializes auto-save on browser unload / tab close / visibility hidden.
 */
let isLifecycleBound = false;
export function initAutoSaveOnAppClose(): void {
  if (typeof window === 'undefined' || isLifecycleBound) return;
  isLifecycleBound = true;

  const triggerSaveOnExit = () => {
    try {
      // 1. Immediately backup to local cache
      const payload = buildUnifiedWorkspacePayload();
      localStorage.setItem('taka_mapping_config_backup', JSON.stringify(payload));
      saveLayoutConfigToDisk(payload).catch(() => {});

      // 2. Trigger asynchronous background save to Cloud R2
      syncAllDataToCloudR2({ silent: true }).catch(() => {});
    } catch (_e) {}
  };

  window.addEventListener('beforeunload', triggerSaveOnExit);
  window.addEventListener('pagehide', triggerSaveOnExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerSaveOnExit();
    }
  });
}
