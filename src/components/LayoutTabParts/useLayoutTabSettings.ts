import React, { useCallback, useEffect, useState } from 'react';
import { executeTriggerExportProcess, triggerBackgroundR2Sync } from '../PictureMapping/lib/dynamicExportService';
import { isValidUrl } from './layoutTabSearchUtils';

interface UseLayoutTabSettingsProps {
  activeStore: string;
  locFilterStr: string;
  canWrite?: boolean;
}

const LAYOUT_SETTINGS_CACHE_KEY = 'hcm_layout_settings_v1';
const LAYOUT_EXPORT_TS_KEY = 'hcm_layout_export_ts_v1';

let sharedLayoutSettingsData: Record<string, any> | null = null;
const layoutSettingsSubscribers = new Set<(data: Record<string, any>) => void>();

function getInitialSettings(): Record<string, any> {
  if (sharedLayoutSettingsData) return sharedLayoutSettingsData;
  try {
    let raw = localStorage.getItem(LAYOUT_SETTINGS_CACHE_KEY);
    if (!raw) {
      raw = localStorage.getItem('taka_cache_layout_settings_v1');
    }
    if (raw) {
      sharedLayoutSettingsData = JSON.parse(raw) || {};
      return sharedLayoutSettingsData || {};
    }
  } catch {}
  return {};
}

export function useLayoutTabSettings({ activeStore, locFilterStr, canWrite = false }: UseLayoutTabSettingsProps) {
  const [layoutSettings, setLayoutSettings] = useState<Record<string, any>>(getInitialSettings);
  const [url, setUrl] = useState<string>('https://drive.google.com/file/d/1hxzPKKhQWhQ-tAThmgan8eNqqy5GN-Ds/preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusMessage, setExportStatusMessage] = useState<string>('');
  const [cacheBuster, setCacheBuster] = useState<number>(() => {
    try {
      let saved = Number(localStorage.getItem(LAYOUT_EXPORT_TS_KEY));
      if (!saved || saved <= 0) {
        saved = Number(localStorage.getItem('taka_layout_export_ts_v1'));
      }
      if (saved > 0) return saved;
    } catch {}
    return 1;
  });

  const docKey = `url_${activeStore}_${locFilterStr}`;

  useEffect(() => {
    layoutSettingsSubscribers.add(setLayoutSettings);
    const handleCloudUpdate = () => {
      try {
        const raw = localStorage.getItem(LAYOUT_SETTINGS_CACHE_KEY) || localStorage.getItem('taka_cache_layout_settings_v1');
        if (raw) {
          const parsed = JSON.parse(raw) || {};
          sharedLayoutSettingsData = parsed;
          setLayoutSettings(parsed);
        }
      } catch {}
    };
    window.addEventListener('taka_cloud_sync_updated', handleCloudUpdate);
    return () => {
      layoutSettingsSubscribers.delete(setLayoutSettings);
      window.removeEventListener('taka_cloud_sync_updated', handleCloudUpdate);
    };
  }, []);

  // Synchronize URL when docKey, layoutSettings, or activeStore changes
  useEffect(() => {
    if (layoutSettings[docKey] && isValidUrl(layoutSettings[docKey])) {
      setUrl(layoutSettings[docKey]);
    } else if (layoutSettings[`url_${activeStore}`] && isValidUrl(layoutSettings[`url_${activeStore}`])) {
      setUrl(layoutSettings[`url_${activeStore}`]);
    } else {
      setUrl('');
    }
  }, [docKey, layoutSettings, activeStore]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isExporting) {
      timeoutId = setTimeout(() => {
        setIsExporting(false);
        setExportStatusMessage('');
      }, 30000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isExporting]);

  const handleSave = async () => {
    if (!canWrite) return;
    try {
      const nextSettings = {
        ...layoutSettings,
        [docKey]: editUrl,
      };
      sharedLayoutSettingsData = nextSettings;
      setLayoutSettings(nextSettings);
      try {
        localStorage.setItem(LAYOUT_SETTINGS_CACHE_KEY, JSON.stringify(nextSettings));
      } catch {}
      layoutSettingsSubscribers.forEach((cb) => cb(nextSettings));
      setUrl(editUrl);
      setIsEditing(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('taka_layout_settings_updated'));
      }

      // Trigger Cloudflare R2 sync in background (Zero Firestore)
      try {
        triggerBackgroundR2Sync(activeStore as any);
      } catch {}
    } catch (error) {
      console.error('Error saving layout URL', error);
    }
  };

  const handleTriggerReExport = async () => {
    if (!canWrite || isExporting) return;
    try {
      setIsExporting(true);
      setExportStatusMessage('Bước 1/4: Đang tải dữ liệu từ Cloudflare R2...');
      const targetStore = (activeStore === 'HN' ? 'HN' : 'HCM') as 'HCM' | 'HN';
      
      const res = await executeTriggerExportProcess(targetStore, (status) => {
        setExportStatusMessage(status);
      });

      const now = Date.now();
      setCacheBuster(now);
      try {
        localStorage.setItem(LAYOUT_EXPORT_TS_KEY, String(now));
      } catch {}
      setIsExporting(false);
      setExportStatusMessage('');
      alert(`✅ ${res.message}`);
    } catch (error: any) {
      console.error('Error triggering layout export', error);
      setIsExporting(false);
      setExportStatusMessage('');
      alert(`⚠️ Lỗi khi Trigger Export:\n${error?.message || error}`);
    }
  };

  const getCleanUrl = useCallback((inputUrl: string | undefined | null) => {
    if (!inputUrl) return undefined;
    let cleanUrl = inputUrl;
    if (cleanUrl.includes('/view')) {
      cleanUrl = cleanUrl.replace('/view', '/preview');
    }
    if (cleanUrl) {
      const separator = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${separator}t=${cacheBuster}`;
    }
    return undefined;
  }, [cacheBuster]);

  const fallbackSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';

  return {
    url,
    isEditing,
    setIsEditing,
    editUrl,
    setEditUrl,
    handleSave,
    isExporting,
    exportStatusMessage,
    handleTriggerReExport,
    getCleanUrl,
    fallbackSvg,
    cacheBuster,
    setCacheBuster,
  };
}
