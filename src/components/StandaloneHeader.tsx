import React, { useRef, useState } from 'react';
import {
  Map,
  Image as ImageIcon,
  Download,
  Upload,
  FileSpreadsheet,
  FolderDown,
  FolderUp,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  CheckCircle2,
  CloudUpload,
  CloudDownload,
  RefreshCw,
} from 'lucide-react';
import { TabId } from '../types';
import { useAppStore } from '../store/useAppStore';
import {
  downloadComparisonTemplate,
  importComparisonExcelOrCsvFile,
  exportFullStandaloneWorkspaceJson,
  importFullStandaloneWorkspaceJson,
} from '../lib/standaloneComparisonService';
import {
  syncAllDataToCloudR2,
  loadUnifiedDataFromCloudR2,
  subscribeR2SyncStatus,
  getR2SyncStatus,
  R2SyncStatusState,
} from '../lib/r2UnifiedSyncService';

interface StandaloneHeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export const StandaloneHeader: React.FC<StandaloneHeaderProps> = React.memo(({
  activeTab,
  onTabChange,
  theme,
  onToggleTheme,
  isFocusMode,
  onToggleFocusMode,
}) => {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const workspaceInputRef = useRef<HTMLInputElement>(null);
  const setToast = useAppStore((s) => s.setToast);
  const [importing, setImporting] = useState(false);
  const [r2Status, setR2Status] = useState<R2SyncStatusState>(() => getR2SyncStatus());

  React.useEffect(() => {
    return subscribeR2SyncStatus((next) => setR2Status(next));
  }, []);

  const formattedSyncTime = r2Status.lastSyncedAt
    ? new Date(r2Status.lastSyncedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await importComparisonExcelOrCsvFile(file);
      setToast({
        title: 'Comparison Data Loaded',
        message: `Successfully matched ${res.matchedUnits} units across ${res.projectsCount} records.`,
      });
    } catch (err: any) {
      setToast({
        title: 'Import Error',
        message: err?.message || 'Failed to parse Excel/CSV file.',
      });
    } finally {
      setImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleWorkspaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importFullStandaloneWorkspaceJson(file);
      setToast({
        title: 'Workspace Restored',
        message: 'Floor plans, shapes, and comparison data restored successfully.',
      });
    } catch (err: any) {
      setToast({
        title: 'Restore Failed',
        message: err?.message || 'Invalid workspace JSON file.',
      });
    } finally {
      if (workspaceInputRef.current) workspaceInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 print:hidden">
      {/* Left: Brand & Main 2 Tabs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white font-black text-sm shadow-sm">
            TK
          </div>
          <div className="leading-tight">
            <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              TAKA LAYOUT
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Standalone Mapping & Comparison
            </p>
          </div>
        </div>

        {/* Navigation Pills */}
        <nav className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
          <button
            type="button"
            onClick={() => onTabChange('layout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 touch-manipulation ${
              activeTab === 'layout'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Layout & Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('picture_mapping')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 touch-manipulation ${
              activeTab === 'picture_mapping'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Picture Mapping (CAD / Studio)</span>
          </button>
        </nav>
      </div>

      {/* Right: Option A Comparison Data Controls & Utilities */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelFileChange}
          className="hidden"
        />
        <input
          ref={workspaceInputRef}
          type="file"
          accept=".json"
          onChange={handleWorkspaceFileChange}
          className="hidden"
        />

        {/* Download Excel Template */}
        <button
          type="button"
          onClick={downloadComparisonTemplate}
          title="Download Excel Template for Layout Comparison"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Template (.xlsx)</span>
        </button>

        {/* Import Comparison Excel/CSV */}
        <button
          type="button"
          onClick={() => excelInputRef.current?.click()}
          disabled={importing}
          title="Import Excel or CSV data to compare on Layout"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{importing ? 'Importing...' : 'Import Excel/CSV'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />

        {/* Save / Load Full Workspace JSON */}
        <button
          type="button"
          onClick={exportFullStandaloneWorkspaceJson}
          title="Backup entire workspace (shapes + comparison data) to JSON"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          <FolderDown className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Backup JSON</span>
        </button>

        <button
          type="button"
          onClick={() => workspaceInputRef.current?.click()}
          title="Restore workspace from JSON file"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          <FolderUp className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Load JSON</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />

        {/* Cloudflare R2 Live Sync Status Badge */}
        <button
          type="button"
          onClick={() => syncAllDataToCloudR2()}
          title={
            r2Status.status === 'synced'
              ? `Tự động đồng bộ Cloudflare R2 (Lần cuối: ${formattedSyncTime || 'vừa xong'}). Nhấn để lưu ngay.`
              : r2Status.status === 'syncing'
              ? 'Đang đồng bộ dữ liệu với Cloudflare R2...'
              : r2Status.status === 'pending'
              ? 'Đang chờ tự động lưu thay đổi lên Cloudflare R2 (nhấn để lưu ngay)'
              : 'Đang dùng bộ nhớ đệm cục bộ (Local Cache)'
          }
          className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none ${
            r2Status.status === 'syncing'
              ? 'bg-sky-50/90 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
              : r2Status.status === 'pending'
              ? 'bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              : r2Status.status === 'offline' || r2Status.status === 'error'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50'
          }`}
        >
          {r2Status.status === 'syncing' ? (
            <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                r2Status.status === 'pending'
                  ? 'bg-amber-500 animate-ping'
                  : r2Status.status === 'offline' || r2Status.status === 'error'
                  ? 'bg-slate-400'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
          )}
          <span>
            {r2Status.status === 'syncing'
              ? r2Status.detail || 'Đang đồng bộ R2...'
              : r2Status.status === 'pending'
              ? 'Chờ lưu R2...'
              : r2Status.status === 'offline'
              ? 'Local Cache'
              : r2Status.status === 'error'
              ? 'Lỗi R2 (Đã lưu Cache)'
              : formattedSyncTime
              ? `R2 Synced (${formattedSyncTime})`
              : 'Auto Cloud R2'}
          </span>
        </button>

        <button
          type="button"
          onClick={async () => {
            await syncAllDataToCloudR2();
          }}
          title="Lưu đồng bộ toàn bộ app vào thư mục layout/ trên Cloudflare R2"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/70 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all active:scale-95"
        >
          <CloudUpload className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden md:inline">Save R2</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            await loadUnifiedDataFromCloudR2();
          }}
          title="Tải lại toàn bộ dữ liệu từ thư mục layout/ trên Cloudflare R2"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          <CloudDownload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Load R2</span>
        </button>

        {/* Theme & Focus Mode */}
        <button
          type="button"
          onClick={onToggleTheme}
          title="Toggle Dark / Light Mode"
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleFocusMode}
          title="Toggle Focus Fullscreen Mode"
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
});
