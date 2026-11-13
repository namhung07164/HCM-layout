import React from 'react';
import { Bell, Check, Download, Printer, RefreshCw, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LayoutEditModeAlertsAndExportTabsProps {
  activeTab: string;
  layoutTooltipVisibility: any;
  setLayoutTooltipVisibility: (val: any) => void;
  canWrite: boolean;
  handleTriggerExport: () => void;
  isExporting: boolean;
  exportStatus: string;
  onClose: () => void;
  setIsPrintPreview: (val: boolean) => void;
  isPrintPreview: boolean;
  handleExport: () => void;
  onOpenR2Config: () => void;
}

export const LayoutEditModeAlertsAndExportTabs: React.FC<LayoutEditModeAlertsAndExportTabsProps> = React.memo(({
  activeTab,
  layoutTooltipVisibility,
  setLayoutTooltipVisibility,
  canWrite,
  handleTriggerExport,
  isExporting,
  exportStatus,
  onClose,
  setIsPrintPreview,
  isPrintPreview,
  handleExport,
  onOpenR2Config,
}) => {
  return (
    <>
      {/* TAB 3: Smart Alerts & Badges */}
      {activeTab === 'alerts' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-3 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <div className="text-xs font-bold text-red-900 dark:text-red-200">
                  Cảnh báo thông minh trên bản đồ CAD (Smart Alerts & Badges)
                </div>
                <div className="text-[11px] text-red-700/80 dark:text-red-300/80">
                  Hiển thị các huy hiệu màu sắc trực tiếp trên polygon từng gian hàng để phát hiện nhanh rủi ro
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLayoutTooltipVisibility({
                    notifications: true,
                    alertOverdue: true,
                    alertDelay: true,
                    alertHandover: true,
                    alertOpening: true,
                    alertOpeningRisk: true,
                  });
                }}
                className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-500 cursor-pointer"
              >
                Bật tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayoutTooltipVisibility({
                    notifications: false,
                    alertOverdue: false,
                    alertDelay: false,
                    alertHandover: false,
                    alertOpening: false,
                    alertOpeningRisk: false,
                  });
                }}
                className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
              >
                Tắt tất cả
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { key: 'notifications', label: 'Tất cả Huy hiệu Cảnh báo', desc: 'Công tắc tổng cho toàn bộ badge' },
              { key: 'alertOverdue', label: 'Công việc Quá hạn (Overdue)', desc: 'Nhiệm vụ chưa hoàn thành đã quá ngày kết thúc' },
              { key: 'alertDelay', label: 'Dự án Chậm tiến độ (Delay)', desc: 'Trạng thái dự án bị chậm trễ tiến độ' },
              { key: 'alertOpeningRisk', label: 'Nguy cơ Khai trương (Opening Risk)', desc: 'Tiến độ <80% khi còn dưới 5 ngày' },
              { key: 'alertHandover', label: 'Thông báo Bàn giao (Handover)', desc: 'Thời điểm bàn giao trong vòng 3 ngày tới' },
              { key: 'alertOpening', label: 'Thông báo Khai trương (Opening)', desc: 'Thời điểm khai trương trong vòng 3 ngày tới' },
            ].map((item) => {
              const isActive = (layoutTooltipVisibility as any)?.[item.key] !== false;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setLayoutTooltipVisibility((prev: any) => ({
                      ...prev,
                      [item.key]: !isActive,
                    }));
                  }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-left transition-all active:scale-95 touch-manipulation cursor-pointer",
                    isActive
                      ? "bg-red-500/10 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100"
                  )}
                >
                  <div className="min-w-0 flex-1 pr-1">
                    <div className="text-xs font-bold leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ml-2",
                      isActive
                        ? "bg-red-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-transparent"
                    )}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Export & Cloud Actions */}
      {activeTab === 'export' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            Các tác vụ đồng bộ hóa đám mây Cloudflare R2, lưu ảnh mặt bằng CAD độ phân giải cao và xem trước bản in.
          </div>

          {canWrite && (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Áp dụng Quy tắc Dynamic & Đồng bộ Cloud R2
                </h3>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  Tự động tính toán lại toàn bộ quy tắc phân tầng Dynamic và lưu trữ đồng bộ lên Cloudflare R2.
                </p>
              </div>
              <button 
                type="button"
                onClick={handleTriggerExport}
                disabled={isExporting}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer active:scale-95"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isExporting && "animate-spin")} />
                <span>{isExporting ? (exportStatus || 'Đang xử lý...') : 'Trigger Export & R2'}</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button 
              type="button"
              onClick={() => {
                onClose();
                setIsPrintPreview(!isPrintPreview);
              }}
              className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Xem trước bản in (Print Preview)</span>
            </button>

            <button 
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-2 p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất ảnh CAD HD (Export Image)</span>
            </button>

            {canWrite && (
              <button 
                type="button"
                onClick={() => {
                  onClose();
                  onOpenR2Config();
                }}
                className="flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 active:scale-95 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Cấu hình Cloud R2 Storage</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
});
