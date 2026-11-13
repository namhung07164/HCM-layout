import React, { useState, FC } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  Bell, 
  Check, 
  SlidersHorizontal, 
  RefreshCw, 
  Printer, 
  Download, 
  Settings,
  Palette,
  Eye,
  EyeOff,
  Building2,
  TrendingUp,
  Tag,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DebouncedSearchInput } from '../DebouncedSearchInput';
import { LayoutPaintCategoriesSection } from './LayoutPaintCategoriesSection';
import { LayoutEditModeAlertsAndExportTabs } from './LayoutEditModeAlertsAndExportTabs';

export interface LayoutEditModeModalProps {
  showMenu: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSmartAlertCollapsed: boolean;
  setIsSmartAlertCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  layoutTooltipVisibility: any;
  setLayoutTooltipVisibility: React.Dispatch<React.SetStateAction<any>>;
  resetLayoutTooltipVisibility: () => void;
  canWrite: boolean;
  handleTriggerExport: () => void;
  isExporting: boolean;
  exportStatus: string | null;
  setIsPrintPreview: React.Dispatch<React.SetStateAction<boolean>>;
  isPrintPreview: boolean;
  handleExport: () => void;
  onOpenR2Config: () => void;
  version?: any;
  storeFilter?: string;
}

type EditTab = 'paint' | 'fields' | 'alerts' | 'export';

export const LayoutEditModeModal: React.FC<LayoutEditModeModalProps> = ({
  showMenu,
  onClose,
  searchQuery,
  setSearchQuery,
  layoutTooltipVisibility,
  setLayoutTooltipVisibility,
  resetLayoutTooltipVisibility,
  canWrite,
  handleTriggerExport,
  isExporting,
  exportStatus,
  setIsPrintPreview,
  isPrintPreview,
  handleExport,
  onOpenR2Config,
  version,
  storeFilter,
}) => {
  const [activeTab, setActiveTab] = useState<EditTab>('paint');
  const [fieldSearch, setFieldSearch] = useState('');

  if (!showMenu) return null;

  // Field Groups Definition for Tab 2
  const fieldGroups = [
    {
      title: 'A. Định danh & Vị trí (Identification & Location)',
      icon: Building2,
      color: 'text-blue-600 dark:text-blue-400',
      fields: [
        { key: 'projectCode', label: 'Project Code', desc: 'Mã dự án / Mã Unit' },
        { key: 'projectName', label: 'Project Name', desc: 'Tên dự án / Tên gian hàng' },
        { key: 'shopType', label: 'Shop Type', desc: 'Loại hình / Format gian hàng' },
        { key: 'floor', label: 'Floor / Store', desc: 'Tầng và Chi nhánh' },
        { key: 'area', label: 'Area (m²)', desc: 'Diện tích mặt bằng' },
        { key: 'legendColor', label: 'Legend Color', desc: 'Màu tô theo nhóm điều kiện' },
      ],
    },
    {
      title: 'B. Trạng thái & Tiến độ (Status & Progress)',
      icon: Layers,
      color: 'text-purple-600 dark:text-purple-400',
      fields: [
        { key: 'mdStatus', label: 'MD Status', desc: 'Trạng thái Merchandising' },
        { key: 'actStatus', label: 'Act Status', desc: 'Trạng thái thi công thực tế' },
        { key: 'progressBars', label: 'Progress Bars', desc: 'Thanh tiến độ Kế hoạch vs Thực tế' },
        { key: 'startDate', label: 'Start Date', desc: 'Ngày bắt đầu dự án' },
        { key: 'endDate', label: 'End Date / Finish', desc: 'Ngày kết thúc / Bàn giao' },
      ],
    },
    {
      title: 'C. Chỉ số tài chính & Dữ liệu mở rộng (Financials & Details)',
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      fields: [
        { key: 'sales', label: 'Sales (Doanh thu)', desc: 'Doanh thu gian hàng' },
        { key: 'profit', label: 'Profit (Lợi nhuận)', desc: 'Lợi nhuận gian hàng' },
        { key: 'margin', label: 'Margin (%)', desc: 'Tỷ suất lợi nhuận biên' },
        { key: 'budget', label: 'Budget (Ngân sách)', desc: 'Dự toán ngân sách' },
        { key: 'actualCost', label: 'Actual Cost', desc: 'Chi phí thi công thực tế' },
        { key: 'classCode', label: 'Class Code', desc: 'Mã phân loại ngành hàng' },
        { key: 'vendorCode', label: 'Vendor Code', desc: 'Mã nhà cung cấp' },
        { key: 'contractor', label: 'Contractor', desc: 'Nhà thầu / Đối tác' },
        { key: 'detail', label: 'Detail', desc: 'Chi tiết các hạng mục' },
        { key: 'description', label: 'Description', desc: 'Ghi chú mô tả công việc' },
      ],
    },
  ];

  // Quick Action: Enable All
  const handleEnableAllFields = () => {
    const updated: any = {};
    fieldGroups.forEach(group => {
      group.fields.forEach(f => {
        updated[f.key] = true;
      });
    });
    setLayoutTooltipVisibility(updated);
  };

  // Quick Action: Disable All
  const handleDisableAllFields = () => {
    const updated: any = {};
    fieldGroups.forEach(group => {
      group.fields.forEach(f => {
        updated[f.key] = false;
      });
    });
    setLayoutTooltipVisibility(updated);
  };

  // Filtered fields based on search
  const filteredGroups = fieldGroups.map(group => ({
    ...group,
    fields: group.fields.filter(f => {
      if (!fieldSearch.trim()) return true;
      const q = fieldSearch.toLowerCase();
      return f.label.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q) || f.key.toLowerCase().includes(q);
    }),
  })).filter(group => group.fields.length > 0);

  // Active fields count
  const allFieldKeys = fieldGroups.flatMap(g => g.fields.map(f => f.key));
  const activeFieldsCount = allFieldKeys.filter(k => (layoutTooltipVisibility as any)?.[k] !== false).length;

  const content = (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150 hide-on-actual-print print:hidden"
      style={{ zIndex: 150000 }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Quản Lý Filter & Tùy Chỉnh Hiển Thị Layout
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Edit Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy chỉnh danh mục màu vẽ (Paint Category), điều kiện Dynamic, trường dữ liệu Tooltip và cảnh báo trên mặt bằng
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('paint')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === 'paint'
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            <span>1. Màu vẽ & Nhóm điều kiện</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === 'fields'
                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-500" />
            <span>2. Trường hiển thị ({activeFieldsCount}/{allFieldKeys.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === 'alerts'
                ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Bell className="w-3.5 h-3.5 text-red-500" />
            <span>3. Cảnh báo thông minh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === 'export'
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
            <span>4. Tác vụ & Cloud</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: Paint Categories Mapping */}
          {activeTab === 'paint' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                <span className="font-bold">Hướng dẫn:</span> Chọn danh mục màu vẽ (ví dụ: <code className="font-bold">Progress</code> hoặc <code className="font-bold">Shop type</code>) hoặc bấm <code className="font-bold">Add</code> để thêm danh mục mới. Bạn có thể bật/tắt các điều kiện Dynamic được gán vào từng danh mục để tô màu tương ứng trên mặt bằng CAD.
              </div>

              <LayoutPaintCategoriesSection
                version={version}
                storeFilter={storeFilter}
                canWrite={canWrite}
              />
            </div>
          )}

          {/* TAB 2: Display & Tooltip Fields */}
          {activeTab === 'fields' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Toolbar: Search & Quick actions */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    placeholder="Tìm trường thông tin (Code, Brand, Sales...)"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  />
                  {fieldSearch && (
                    <button
                      type="button"
                      onClick={() => setFieldSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEnableAllFields}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Bật tất cả</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisableAllFields}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <EyeOff className="w-3 h-3" />
                    <span>Tắt tất cả</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => resetLayoutTooltipVisibility()}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Khôi phục cài đặt mặc định"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Mặc định</span>
                  </button>
                </div>
              </div>

              {/* Field Groups Grid */}
              <div className="space-y-4">
                {filteredGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.title} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <Icon className={cn("w-4 h-4", group.color)} />
                        <span>{group.title}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {group.fields.map((item) => {
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
                                "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all active:scale-95 touch-manipulation cursor-pointer",
                                isActive
                                  ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 shadow-2xs"
                                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100"
                              )}
                            >
                              <div className="min-w-0 flex-1 pr-1">
                                <div className="text-xs font-bold truncate leading-tight">
                                  {item.label}
                                </div>
                                <div className="text-[10px] opacity-75 truncate mt-0.5">
                                  {item.desc}
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                  isActive
                                    ? "bg-purple-600 text-white"
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
                  );
                })}
              </div>
            </div>
          )}

          <LayoutEditModeAlertsAndExportTabs
            activeTab={activeTab}
            layoutTooltipVisibility={layoutTooltipVisibility}
            setLayoutTooltipVisibility={setLayoutTooltipVisibility}
            canWrite={canWrite}
            handleTriggerExport={handleTriggerExport}
            isExporting={isExporting}
            exportStatus={exportStatus}
            onClose={onClose}
            setIsPrintPreview={setIsPrintPreview}
            isPrintPreview={isPrintPreview}
            handleExport={handleExport}
            onOpenR2Config={onOpenR2Config}
          />

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Bộ lọc & Trường hiển thị tự động lưu vào bộ nhớ tạm & Cloud</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 font-bold transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};
