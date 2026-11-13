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
  fastHashLayoutPayload,
  getOrCreateS3Client,
  uploadImportedFileToR2,
} from './r2WorkspacePayloadService';

export {
  buildUnifiedWorkspacePayload,
  applyUnifiedWorkspacePayload,
  getOrCreateS3Client,
  uploadImportedFileToR2,
};

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
let _lastSyncedFingerprint = '';

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

// Dirty tracker for debounced auto-save
let _autoSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _hasUnsavedEdits = false;
let _isLifecycleBound = false;
let _realtimeChannel: BroadcastChannel | null = null;

export function hasUnsavedLayoutEdits(): boolean {
  return _hasUnsavedEdits;
}

/**
 * Marks workspace as modified and schedules an idle auto-save to Cloudflare R2 (45s).
 * Instant local cache + cross-tab BroadcastChannel persists immediately with 0ms latency.
 * Does NOT hammer R2 continuously while typing or navigating.
 */
export function markWorkspaceDirty(delayMs = 45000): void {
  if (isApplyingRemoteWorkspacePayload()) return;
  const currentHash = fastHashLayoutPayload();
  if (_lastSyncedFingerprint && currentHash === _lastSyncedFingerprint) {
    return;
  }
  _hasUnsavedEdits = true;
  updateSyncStatus({ status: 'pending', detail: 'Chờ lưu R2 (Có thay đổi)' });

  try {
    const rawLocalPayload = buildUnifiedWorkspacePayload();
    saveLayoutConfigToDisk(rawLocalPayload).catch(() => {});
    localStorage.setItem('taka_mapping_config_backup', JSON.stringify(rawLocalPayload));
    _realtimeChannel?.postMessage({
      type: 'WORKSPACE_UPDATED',
      timestamp: rawLocalPayload.timestamp,
    });
  } catch {}

  if (_autoSaveDebounceTimer) {
    clearTimeout(_autoSaveDebounceTimer);
  }
  _autoSaveDebounceTimer = setTimeout(() => {
    _autoSaveDebounceTimer = null;
    if (_hasUnsavedEdits) {
      syncAllDataToCloudR2({ silent: true }).catch(() => {});
    }
  }, delayMs);
}

/**
 * Saves unified app data to Cloudflare R2 across both `layout/` and root folders.
 */
export async function syncAllDataToCloudR2(options?: {
  silent?: boolean;
  force?: boolean;
}): Promise<{ success: boolean; message: string }> {
  if (isAutoSaving) {
    pendingAutoSave = true;
    return { success: true, message: 'Đang xếp hàng đồng bộ R2...' };
  }

  const rawLocalPayload = buildUnifiedWorkspacePayload();
  const currentHash = fastHashLayoutPayload(rawLocalPayload);

  // If not forced and fingerprint matches last saved R2 state, no need to upload!
  if (!options?.force && _lastSyncedFingerprint && currentHash === _lastSyncedFingerprint && !_hasUnsavedEdits) {
    updateSyncStatus({ status: 'synced', detail: 'Dữ liệu không đổi' });
    return { success: true, message: 'Dữ liệu không thay đổi, không cần lưu R2.' };
  }

  isAutoSaving = true;
  updateSyncStatus({ status: 'syncing', detail: 'Đang lưu R2...' });
  try {
    const clientBundle = await getOrCreateS3Client();
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
      _lastSyncedFingerprint = currentHash;
      _hasUnsavedEdits = false;
      if (_autoSaveDebounceTimer) {
        clearTimeout(_autoSaveDebounceTimer);
        _autoSaveDebounceTimer = null;
      }
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

    _lastSyncedFingerprint = fastHashLayoutPayload(data);
    _hasUnsavedEdits = false;

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
 * Initializes safe change subscriptions and auto-save on app close / tab exit.
 * Only saves to R2 when actual layout data was modified.
 */
export function initAutoSaveOnAppClose(): void {
  if (typeof window === 'undefined' || _isLifecycleBound) return;
  _isLifecycleBound = true;

  getOrCreateS3Client().catch(() => {});

  // 1. Cross-tab BroadcastChannel for real-time multi-tab synchronization (0 HTTP calls)
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

  // 2. Subscribe to DataStore layout mutations
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
        markWorkspaceDirty();
      }
    });
  } catch {}

  // 3. Subscribe to AppStore (projects & tasks) mutations
  try {
    useAppStore.subscribe((state, prevState) => {
      if (isApplyingRemoteWorkspacePayload()) return;
      if (state.projects !== prevState.projects || state.tasks !== prevState.tasks) {
        markWorkspaceDirty();
      }
    });
  } catch {}

  // 4. Listen for comparison, paint category, layout URL, and unit image updates
  const handleCustomRealtimeMutation = () => markWorkspaceDirty();
  window.addEventListener('taka_comparison_data_saved', handleCustomRealtimeMutation);
  window.addEventListener('taka_paint_categories_updated', handleCustomRealtimeMutation);
  window.addEventListener('taka_unit_images_changed', handleCustomRealtimeMutation);
  window.addEventListener('taka_layout_settings_updated', handleCustomRealtimeMutation);

  // 5. Trigger save on app close / exit ONLY IF there are actual unsaved layout edits
  const triggerSaveOnExit = (e?: BeforeUnloadEvent) => {
    try {
      if (!_hasUnsavedEdits) return;
      if (_autoSaveDebounceTimer) {
        clearTimeout(_autoSaveDebounceTimer);
        _autoSaveDebounceTimer = null;
      }
      const payload = buildUnifiedWorkspacePayload();
      try {
        localStorage.setItem('taka_mapping_config_backup', JSON.stringify(payload));
      } catch {}
      saveLayoutConfigToDisk(payload).catch(() => {});
      syncAllDataToCloudR2({ silent: true, force: true }).catch(() => {});

      if (e) {
        e.preventDefault();
        e.returnValue = '';
      }
    } catch (_e) {}
  };

  window.addEventListener('beforeunload', triggerSaveOnExit);
  window.addEventListener('pagehide', () => triggerSaveOnExit());
  window.addEventListener('freeze', () => triggerSaveOnExit());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _hasUnsavedEdits) {
      const payload = buildUnifiedWorkspacePayload();
      saveLayoutConfigToDisk(payload).catch(() => {});
    }
  });
}
