/**
 * Comprehensive R2 Cloud Synchronization Service for Layout & Picture Mapping
 * Handles:
 * 1. Synchronizing layout and comparison data under folder `layout/` (`layout/layout_config.json`, `mapping_config.json`)
 * 2. Automatic cloud pull when opening the app (with instant local-disk hydration fallback)
 * 3. Continuous debounced auto-sync to Cloud R2 during edits
 * 4. Automatic cloud save on app close / exit (beforeunload / pagehide / visibilitychange hidden)
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

// Pre-warmed S3 client cache for fast zero-latency exit saves
let _prewarmedS3Client: any = null;
let _prewarmedCredsKey = '';

// Dirty tracker for debounced auto-save
let _autoSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _hasUnsavedEdits = false;
let _isLifecycleBound = false;

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
 * Marks workspace as modified and schedules a debounced auto-save to Cloudflare R2.
 */
export function markWorkspaceDirty(delayMs = 2500): void {
  _hasUnsavedEdits = true;
  if (_autoSaveDebounceTimer) {
    clearTimeout(_autoSaveDebounceTimer);
  }
  _autoSaveDebounceTimer = setTimeout(() => {
    _autoSaveDebounceTimer = null;
    if (_hasUnsavedEdits) {
      _hasUnsavedEdits = false;
      syncAllDataToCloudR2({ silent: true }).catch(() => {});
    }
  }, delayMs);
}

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
    const clientBundle = await getOrCreateS3Client();
    if (!clientBundle) {
      console.info('[R2 Upload] No R2 credentials configured, skip file upload.');
      return { success: false, error: 'Chưa cấu hình R2 credentials' };
    }
    const { s3, creds } = clientBundle;

    const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
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
    const clientBundle = await getOrCreateS3Client();
    const payload = buildUnifiedWorkspacePayload();

    // 1. Immediately save synchronously to local disk cache (IndexedDB + CacheStorage + localStorage)
    await saveLayoutConfigToDisk(payload);
    try {
      localStorage.setItem('taka_mapping_config_backup', JSON.stringify(payload));
    } catch {}

    if (!clientBundle) {
      return { success: false, message: 'Chưa cấu hình R2 Cloudflare (đã lưu bộ nhớ đệm cục bộ).' };
    }
    const { s3, creds } = clientBundle;

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
 * Loads full cloud data from Cloudflare R2 on app open or tab switch
 * (checks `layout/layout_config.json` first, falls back to `mapping_config.json`, then local disk cache).
 */
export async function loadUnifiedDataFromCloudR2(options?: {
  silent?: boolean;
  initialBoot?: boolean;
}): Promise<{ success: boolean; source?: string; message: string }> {
  if (isPullingFromCloud) {
    return { success: true, message: 'Đang tải dữ liệu từ Cloud...' };
  }

  isPullingFromCloud = true;
  try {
    const clientBundle = await getOrCreateS3Client();
    let data: any = null;
    let source = '';

    if (clientBundle) {
      const { s3, creds } = clientBundle;

      // Try layout/layout_config.json first
      const layoutRes = await downloadR2JsonFile<any>(LAYOUT_R2_CONFIG_KEY, creds, s3);
      if (layoutRes.success && layoutRes.data && isValidLayoutConfig(layoutRes.data)) {
        data = layoutRes.data;
        source = 'Cloud R2 (layout/layout_config.json)';
      } else {
        // Fallback to root mapping_config.json
        const rootRes = await downloadR2JsonFile<any>(ROOT_MAPPING_CONFIG_KEY, creds, s3);
        if (rootRes.success && rootRes.data && isValidLayoutConfig(rootRes.data)) {
          data = rootRes.data;
          source = 'Cloud R2 (mapping_config.json)';
        }
      }
    }

    // Fallback to local disk cache if R2 unavailable or offline
    if (!data) {
      const diskData = await getCachedLayoutConfigFromDisk();
      if (diskData && isValidLayoutConfig(diskData)) {
        data = diskData;
        source = 'Local Disk Cache';
      }
    }

    if (!data) {
      if (options?.initialBoot && !clientBundle) {
        useAppStore.getState().setToast({
          title: 'Chế độ Local Cache',
          message: 'Đang sử dụng dữ liệu bộ nhớ cục bộ. Bạn có thể cấu hình Cloudflare R2 để kích hoạt đồng bộ đám mây.',
          type: 'info',
        });
      }
      return { success: false, message: 'Chưa có cấu hình trên Cloudflare R2.' };
    }

    // Apply to DataStore
    useDataStore.getState().loadFullCloudData(data);
    await saveLayoutConfigToDisk(data);

    // Apply comparison rows if available
    if (Array.isArray(data.comparisonRows) && data.comparisonRows.length > 0) {
      applyComparisonRowsToStores(data.comparisonRows);
    }

    // Notify LayoutViewer and other listeners to update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('taka_cloud_sync_updated', {
          detail: {
            timestamp: data.timestamp || Date.now(),
            store: data.store,
            location: data.location,
            storeLocationData: data.storeLocationData,
          },
        })
      );
    }

    if (!options?.silent || options?.initialBoot) {
      useAppStore.getState().setToast({
        title: source.includes('Cloud R2') ? 'Cloudflare R2' : 'Local Cache',
        message: source.includes('Cloud R2')
          ? `Đã tự động tải cấu hình mới nhất từ ${source}.`
          : `Đã nạp dữ liệu từ ${source}.`,
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
 * Initializes auto-save on browser unload / tab close / visibility hidden / mobile exit.
 * Also subscribes to active data changes to keep Cloud R2 continuously updated.
 */
export function initAutoSaveOnAppClose(): void {
  if (typeof window === 'undefined' || _isLifecycleBound) return;
  _isLifecycleBound = true;

  // Pre-warm S3 client in background immediately on boot
  getOrCreateS3Client().catch(() => {});

  // 1. Subscribe to active data changes to continuously schedule background auto-save
  try {
    useDataStore.subscribe((state, prevState) => {
      if (
        state.storeLocationData !== prevState.storeLocationData ||
        state.mapUnits !== prevState.mapUnits ||
        state.mapVersions !== prevState.mapVersions ||
        state.unitInfo !== prevState.unitInfo ||
        state.sales !== prevState.sales ||
        state.activeMapVersionId !== prevState.activeMapVersionId
      ) {
        markWorkspaceDirty(3000);
      }
    });
  } catch (subErr) {
    console.warn('[AutoSave] DataStore subscription warning:', subErr);
  }

  // 2. Trigger save on app close / exit
  const triggerSaveOnExit = () => {
    try {
      if (_autoSaveDebounceTimer) {
        clearTimeout(_autoSaveDebounceTimer);
        _autoSaveDebounceTimer = null;
      }
      _hasUnsavedEdits = false;

      // 1. Synchronously backup to local cache
      const payload = buildUnifiedWorkspacePayload();
      try {
        localStorage.setItem('taka_mapping_config_backup', JSON.stringify(payload));
      } catch {}
      saveLayoutConfigToDisk(payload).catch(() => {});

      // 2. Immediately trigger background save to Cloud R2
      syncAllDataToCloudR2({ silent: true }).catch(() => {});
    } catch (_e) {}
  };

  window.addEventListener('beforeunload', triggerSaveOnExit);
  window.addEventListener('pagehide', triggerSaveOnExit);
  window.addEventListener('freeze', triggerSaveOnExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerSaveOnExit();
    }
  });

  // Listen for custom comparison row updates
  window.addEventListener('taka_comparison_data_saved', () => {
    markWorkspaceDirty(1500);
  });
}
