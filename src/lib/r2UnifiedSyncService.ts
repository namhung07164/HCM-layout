/**
 * Comprehensive R2 Cloud Synchronization Service for Layout & Picture Mapping
 * Handles:
 * 1. Synchronizing 100% of workspace state under folder `layout/` (`layout/layout_config.json`, `mapping_config.json`)
 * 2. Automatic cloud pull when opening the app (with 0ms local-disk hydration fallback)
 * 3. Real-time debounced auto-sync to Cloud R2 & cross-tab BroadcastChannel sync during edits
 * 4. Automatic cloud save on app close / exit + Live R2 Sync Status observable + Smart Partition Merge
 */

import {
  getStoredR2CredentialsAsync,
  getS3Sdk,
  uploadSingleR2File,
  downloadR2JsonFile,
  R2Credentials,
} from '../components/PictureMapping/lib/r2Upload';
import { useDataStore } from '../components/PictureMapping/DataContext';
import { useAppStore } from '../store/useAppStore';
import {
  saveLayoutConfigToDisk,
  getCachedLayoutConfigFromDisk,
  isValidLayoutConfig,
} from './layoutConfigCache';
import {
  buildUnifiedWorkspacePayload,
  applyUnifiedWorkspacePayload,
  isApplyingRemoteWorkspacePayload,
  mergeRemoteAndLocalPayloads,
} from './r2WorkspacePayloadService';

export { buildUnifiedWorkspacePayload, applyUnifiedWorkspacePayload };

export type R2SyncStatusType = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

export interface R2SyncStatusState {
  status: R2SyncStatusType;
  lastSyncedAt: number | null;
  detail?: string;
}

const LAYOUT_R2_CONFIG_KEY = 'layout/layout_config.json';
const ROOT_MAPPING_CONFIG_KEY = 'mapping_config.json';
const REALTIME_CHANNEL_NAME = 'hcm_layout_realtime_sync';

let isAutoSaving = false;
let pendingAutoSave = false;
let isPullingFromCloud = false;
let lastCloudPullTime = 0;
let _lastKnownRemotePayload: any = null;

// Live sync status observable for Header UI
let _syncStatusState: R2SyncStatusState = {
  status: 'synced',
  lastSyncedAt: null,
};
const _statusListeners = new Set<(state: R2SyncStatusState) => void>();

function updateSyncStatus(patch: Partial<R2SyncStatusState>): void {
  _syncStatusState = { ..._syncStatusState, ...patch };
  _statusListeners.forEach((cb) => {
    try {
      cb(_syncStatusState);
    } catch {}
  });
}

export function getR2SyncStatus(): R2SyncStatusState {
  return _syncStatusState;
}

export function subscribeR2SyncStatus(cb: (state: R2SyncStatusState) => void): () => void {
  _statusListeners.add(cb);
  cb(_syncStatusState);
  return () => {
    _statusListeners.delete(cb);
  };
}

// Pre-warmed S3 client cache for fast zero-latency exit saves
let _prewarmedS3Client: any = null;
let _prewarmedCredsKey = '';

// Dirty tracker for debounced auto-save
let _autoSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _hasUnsavedEdits = false;
let _isLifecycleBound = false;
let _realtimeChannel: BroadcastChannel | null = null;

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
 * Marks workspace as modified and schedules a debounced real-time auto-save to Cloudflare R2.
 */
export function markWorkspaceDirty(delayMs = 1500): void {
  if (isApplyingRemoteWorkspacePayload()) return;
  _hasUnsavedEdits = true;
  updateSyncStatus({ status: 'pending', detail: 'Chờ lưu thay đổi...' });
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
  updateSyncStatus({ status: 'syncing', detail: 'Đang lưu R2...' });
  try {
    const clientBundle = await getOrCreateS3Client();
    const rawLocalPayload = buildUnifiedWorkspacePayload();
    const payload = _lastKnownRemotePayload
      ? mergeRemoteAndLocalPayloads(_lastKnownRemotePayload, rawLocalPayload)
      : rawLocalPayload;

    // 1. Immediately persist to local disk cache (IndexedDB + CacheStorage + localStorage)
    await saveLayoutConfigToDisk(payload);
    try {
      localStorage.setItem('taka_mapping_config_backup', JSON.stringify(payload));
    } catch {}

    // Broadcast across same-origin browser tabs for 0ms cross-tab real-time sync
    try {
      _realtimeChannel?.postMessage({
        type: 'WORKSPACE_UPDATED',
        timestamp: payload.timestamp,
      });
    } catch {}

    if (!clientBundle) {
      updateSyncStatus({ status: 'offline', detail: 'Local Cache' });
      return {
        success: false,
        message: 'Chưa cấu hình R2 Cloudflare (đã lưu bộ nhớ đệm cục bộ).',
      };
    }
    const { s3, creds } = clientBundle;

    // 2. Upload to layout/layout_config.json
    const jsonBytes = JSON.stringify(payload, null, 2);
    const layoutBlob = new Blob([jsonBytes], { type: 'application/json' });
    const resLayout = await uploadSingleR2File(
      { name: LAYOUT_R2_CONFIG_KEY, blob: layoutBlob },
      creds,
      s3
    );

    // 3. Upload to root mapping_config.json for PictureMapping compatibility
    const rootBlob = new Blob([jsonBytes], { type: 'application/json' });
    await uploadSingleR2File({ name: ROOT_MAPPING_CONFIG_KEY, blob: rootBlob }, creds, s3).catch(
      () => {}
    );

    if (resLayout.success) {
      _lastKnownRemotePayload = payload;
      updateSyncStatus({
        status: 'synced',
        lastSyncedAt: Date.now(),
        detail: 'Đã lưu R2',
      });
    } else {
      updateSyncStatus({
        status: 'error',
        detail: resLayout.error || 'Lỗi lưu R2',
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('taka_cloud_sync_updated', {
          detail: {
            timestamp: payload.timestamp,
            store: payload.store,
            location: payload.location,
            storeLocationData: payload.storeLocationData,
            fullData: payload,
          },
        })
      );
    }

    if (!options?.silent) {
      useAppStore.getState().setToast({
        title: 'Cloud R2 Synced',
        message: 'Đã lưu đồng bộ toàn bộ dữ liệu lên Cloudflare R2 (layout/).',
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
    updateSyncStatus({ status: 'error', detail: 'Lỗi kết nối R2' });
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
 * Loads full cloud data from Cloudflare R2 on app open, focus, or manual refresh
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
  lastCloudPullTime = Date.now();
  updateSyncStatus({ status: 'syncing', detail: 'Đang tải R2...' });
  try {
    const clientBundle = await getOrCreateS3Client();
    let data: any = null;
    let source = '';

    if (clientBundle) {
      const { s3, creds } = clientBundle;

      const layoutRes = await downloadR2JsonFile<any>(LAYOUT_R2_CONFIG_KEY, creds, s3);
      if (layoutRes.success && layoutRes.data && isValidLayoutConfig(layoutRes.data)) {
        data = layoutRes.data;
        source = 'Cloud R2 (layout/layout_config.json)';
      } else {
        const rootRes = await downloadR2JsonFile<any>(ROOT_MAPPING_CONFIG_KEY, creds, s3);
        if (rootRes.success && rootRes.data && isValidLayoutConfig(rootRes.data)) {
          data = rootRes.data;
          source = 'Cloud R2 (mapping_config.json)';
        }
      }
    }

    if (!data) {
      const diskData = await getCachedLayoutConfigFromDisk();
      if (diskData && isValidLayoutConfig(diskData)) {
        data = diskData;
        source = 'Local Disk Cache';
      }
    }

    if (!data) {
      updateSyncStatus({
        status: clientBundle ? 'synced' : 'offline',
        detail: clientBundle ? 'Sẵn sàng' : 'Local Cache',
      });
      if (options?.initialBoot && !clientBundle) {
        useAppStore.getState().setToast({
          title: 'Chế độ Local Cache',
          message:
            'Đang sử dụng dữ liệu bộ nhớ cục bộ. Bạn có thể cấu hình Cloudflare R2 để kích hoạt đồng bộ đám mây.',
          type: 'info',
        });
      }
      return { success: false, message: 'Chưa có cấu hình trên Cloudflare R2.' };
    }

    if (source.includes('Cloud R2')) {
      _lastKnownRemotePayload = data;
      updateSyncStatus({
        status: 'synced',
        lastSyncedAt: Date.now(),
        detail: 'Đã đồng bộ R2',
      });
    } else {
      updateSyncStatus({
        status: clientBundle ? 'synced' : 'offline',
        detail: 'Local Cache',
      });
    }

    await applyUnifiedWorkspacePayload(data, { persistToDisk: true });

    if (!options?.silent || options?.initialBoot) {
      useAppStore.getState().setToast({
        title: source.includes('Cloud R2') ? 'Cloudflare R2' : 'Local Cache',
        message: source.includes('Cloud R2')
          ? `Đã tự động tải đầy đủ dữ liệu mới nhất từ ${source}.`
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
    updateSyncStatus({ status: 'error', detail: 'Lỗi tải R2' });
    return { success: false, message: err?.message || String(err) };
  } finally {
    isPullingFromCloud = false;
  }
}

/**
 * Initializes real-time sync subscriptions and auto-save on browser unload / tab close / visibility hidden / mobile exit.
 */
export function initAutoSaveOnAppClose(): void {
  if (typeof window === 'undefined' || _isLifecycleBound) return;
  _isLifecycleBound = true;

  getOrCreateS3Client().catch(() => {});

  // 1. Cross-tab BroadcastChannel for real-time multi-tab synchronization
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      _realtimeChannel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      _realtimeChannel.onmessage = (ev) => {
        if (ev?.data?.type === 'WORKSPACE_UPDATED' && !isAutoSaving) {
          getCachedLayoutConfigFromDisk()
            .then((diskData) => {
              if (diskData && isValidLayoutConfig(diskData)) {
                applyUnifiedWorkspacePayload(diskData, { persistToDisk: false }).catch(() => {});
              }
            })
            .catch(() => {});
        }
      };
    }
  } catch {}

  // 2. Subscribe to DataStore mutations for real-time debounced R2 sync
  try {
    useDataStore.subscribe((state, prevState) => {
      if (isApplyingRemoteWorkspacePayload()) return;
      if (
        state.storeLocationData !== prevState.storeLocationData ||
        state.mapUnits !== prevState.mapUnits ||
        state.mapVersions !== prevState.mapVersions ||
        state.unitInfo !== prevState.unitInfo ||
        state.classInfo !== prevState.classInfo ||
        state.actualClassInfo !== prevState.actualClassInfo ||
        state.sales !== prevState.sales ||
        state.profits !== prevState.profits ||
        state.subFees !== prevState.subFees ||
        state.mdStatus !== prevState.mdStatus ||
        state.projectStatus !== prevState.projectStatus ||
        state.projectLink !== prevState.projectLink ||
        state.basePlan !== prevState.basePlan ||
        state.units !== prevState.units ||
        state.reviewSelectedLabels !== prevState.reviewSelectedLabels ||
        state.reviewLabelColors !== prevState.reviewLabelColors ||
        state.activeMapVersionId !== prevState.activeMapVersionId
      ) {
        markWorkspaceDirty(1500);
      }
    });
  } catch {}

  // 3. Subscribe to AppStore (projects & tasks) mutations for real-time R2 sync
  try {
    useAppStore.subscribe((state, prevState) => {
      if (isApplyingRemoteWorkspacePayload()) return;
      if (state.projects !== prevState.projects || state.tasks !== prevState.tasks) {
        markWorkspaceDirty(1500);
      }
    });
  } catch {}

  // 4. Listen for comparison, paint category, layout URL, and unit image updates
  const handleCustomRealtimeMutation = () => markWorkspaceDirty(1200);
  window.addEventListener('taka_comparison_data_saved', handleCustomRealtimeMutation);
  window.addEventListener('taka_paint_categories_updated', handleCustomRealtimeMutation);
  window.addEventListener('taka_unit_images_changed', handleCustomRealtimeMutation);
  window.addEventListener('taka_layout_settings_updated', handleCustomRealtimeMutation);

  // 5. Real-time Cloud R2 revalidation when returning to the tab/window
  const handleWindowFocusOrVisible = () => {
    if (document.visibilityState === 'visible' && !_hasUnsavedEdits && !isAutoSaving) {
      if (Date.now() - lastCloudPullTime > 20000) {
        loadUnifiedDataFromCloudR2({ silent: true }).catch(() => {});
      }
    }
  };
  window.addEventListener('focus', handleWindowFocusOrVisible);

  // 6. Trigger immediate save on app close / exit / backgrounding
  const triggerSaveOnExit = (e?: BeforeUnloadEvent) => {
    try {
      const hadUnsavedOrInFlight = _hasUnsavedEdits || isAutoSaving;
      if (_autoSaveDebounceTimer) {
        clearTimeout(_autoSaveDebounceTimer);
        _autoSaveDebounceTimer = null;
      }
      _hasUnsavedEdits = false;

      const payload = buildUnifiedWorkspacePayload();
      try {
        localStorage.setItem('taka_mapping_config_backup', JSON.stringify(payload));
      } catch {}
      saveLayoutConfigToDisk(payload).catch(() => {});
      syncAllDataToCloudR2({ silent: true }).catch(() => {});

      // If an upload to R2 was actively in progress or unsaved edits were just flushed on tab close,
      // signal the browser so in-flight network sockets have time to complete.
      if (e && hadUnsavedOrInFlight) {
        e.preventDefault();
        e.returnValue = '';
      }
    } catch (_e) {}
  };

  window.addEventListener('beforeunload', triggerSaveOnExit);
  window.addEventListener('pagehide', () => triggerSaveOnExit());
  window.addEventListener('freeze', () => triggerSaveOnExit());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerSaveOnExit();
    } else if (document.visibilityState === 'visible') {
      handleWindowFocusOrVisible();
    }
  });
}
