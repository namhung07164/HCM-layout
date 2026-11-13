import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Search, Filter, Plus, Save, Download, FileSpreadsheet, TrendingUp, Tag, Building2, Layers } from 'lucide-react';
import { ComparisonRowInput, getSavedComparisonRows, updateSavedComparisonRows, downloadComparisonTemplate } from '../../lib/standaloneComparisonService';
import { useDataStore } from '../PictureMapping/DataContext';
import { useAppStore } from '../../store/useAppStore';
import { LayoutDataIndexTable } from './LayoutDataIndexTable';

interface LayoutDataIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStore: string;
  activeLocation: string;
  activeYear: string;
}

type ColumnCategory = 'all' | 'attributes' | 'metrics' | 'projects';

export const LayoutDataIndexModal: React.FC<LayoutDataIndexModalProps> = React.memo(({
  isOpen,
  onClose,
  activeStore,
  activeLocation,
  activeYear,
}) => {
  const [rows, setRows] = useState<ComparisonRowInput[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState<'all' | 'HCM' | 'HN'>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [columnCategory, setColumnCategory] = useState<ColumnCategory>('all');
  const [isDirty, setIsDirty] = useState(false);

  const setToast = useAppStore((s) => s.setToast);
  const projects = useAppStore((s) => s.projects);
  const storeLocationData = useDataStore((s) => s.storeLocationData);

  // Load current saved rows when modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedComparisonRows();
      setRows(saved);
      setIsDirty(false);
    }
  }, [isOpen]);

  // Extract all CAD Unit Codes available in the CAD drawings to calculate match status
  const cadUnitCodeSet = useMemo(() => {
    const set = new Set<string>();
    if (!storeLocationData) return set;
    Object.values(storeLocationData).forEach((part) => {
      if (Array.isArray(part?.mapUnits)) {
        part.mapUnits.forEach((u: any) => {
          const code = (u.name || u.unitCode || u.unit || '').trim().toUpperCase();
          if (code) set.add(code);
        });
      }
    });
    return set;
  }, [storeLocationData]);

  // Existing Project Codes in project store
  const existingProjectCodeSet = useMemo(() => {
    const set = new Set<string>();
    (projects || []).forEach((p) => {
      const code = (p.code || p.id || '').trim().toUpperCase();
      if (code) set.add(code);
    });
    return set;
  }, [projects]);

  // Available floors from rows for filter dropdown
  const availableFloors = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const f = String(r['Floor'] || r['floor'] || '').trim().toUpperCase();
      if (f) s.add(f);
    });
    return Array.from(s).sort();
  }, [rows]);

  // Available project statuses
  const availableStatuses = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const st = String(r['Project Status'] || r['projectStatus'] || r['MD Status'] || '').trim();
      if (st) s.add(st);
    });
    return Array.from(s).sort();
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.map((row, originalIndex) => ({ row, originalIndex })).filter(({ row }) => {
      const rStore = String(row['Store'] || 'HCM').toUpperCase().trim();
      const rFloor = String(row['Floor'] || 'L1').toUpperCase().trim();
      const rUnit = String(row['Unit Code'] || '').trim();
      const rBrand = String(row['Brand / Shop Name'] || '').trim();
      const rBrandCode = String(row['Brand Code'] || '').trim();
      const rVendorCode = String(row['Vendor Code'] || '').trim();
      const rClassCode = String(row['Class Code'] || '').trim();
      const rProjCode = String(row['Project Code'] || '').trim();
      const rProjName = String(row['Project Name'] || '').trim();
      const rProjStatus = String(row['Project Status'] || '').trim();
      const rShopType = String(row['Shop Type'] || '').trim();

      if (storeFilter !== 'all' && rStore !== storeFilter) return false;
      if (floorFilter !== 'all' && rFloor !== floorFilter) return false;
      if (statusFilter !== 'all' && rProjStatus !== statusFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          rUnit.toLowerCase().includes(q) ||
          rBrand.toLowerCase().includes(q) ||
          rBrandCode.toLowerCase().includes(q) ||
          rVendorCode.toLowerCase().includes(q) ||
          rClassCode.toLowerCase().includes(q) ||
          rProjCode.toLowerCase().includes(q) ||
          rProjName.toLowerCase().includes(q) ||
          rShopType.toLowerCase().includes(q) ||
          rFloor.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [rows, storeFilter, floorFilter, statusFilter, searchTerm]);

  // Row update handler
  const handleCellChange = useCallback((originalIndex: number, field: keyof ComparisonRowInput, val: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[originalIndex] = {
        ...next[originalIndex],
        [field]: val,
      };
      return next;
    });
    setIsDirty(true);
  }, []);

  // Delete row
  const handleDeleteRow = useCallback((originalIndex: number) => {
    if (!confirm('Bạn có chắc muốn xóa dòng dữ liệu này?')) return;
    setRows((prev) => prev.filter((_, idx) => idx !== originalIndex));
    setIsDirty(true);
  }, []);

  // Add new row with full fields
  const handleAddRow = useCallback(() => {
    const timestamp = Date.now().toString().slice(-4);
    const newRow: ComparisonRowInput = {
      Store: (activeStore === 'HN' ? 'HN' : 'HCM'),
      Floor: activeLocation || 'L1',
      'Unit Code': `U-${timestamp}`,
      'Brand / Shop Name': 'New Brand',
      'Brand Code': `BR-${timestamp}`,
      'Vendor Code': `VN-${timestamp}`,
      'Class Code': 'FNB',
      'Shop Type': 'General',
      'Contract Size (m2)': 50,
      'MD Status': 'Operating',
      'MD Notes': 'Operational unit',
      'Task': 'Opening',
      'Project Code': `PROJ-${timestamp}`,
      'Project Name': `Fitout U-${timestamp}`,
      'Project Status': 'On process',
      'Act Status': 'On Track',
      'Start Date': `${activeYear || '2026'}-01-01`,
      'Finish Date': `${activeYear || '2026'}-12-31`,
      'Sales Amount': 150000000,
      'Sales by CP': 120000000,
      'Sales by HCMcate': 140000000,
      'Profit Amount': 30000000,
      'Profit by CP': 25000000,
      'Profit by HCMcate': 28000000,
      'Margin (%)': 20,
      'Margin by CP (%)': 20.8,
      'HCM Sales Effi': 3000000,
      'HCM Margin (%)': 20,
      'Budget': 50000000,
      'Actual Cost': 45000000,
      'Party / Contractor': 'TAKASHIMAYA VN',
      'Notes / Detail': 'Mới khởi tạo từ Index',
      Year: Number(activeYear) || 2026,
    };
    setRows((prev) => [newRow, ...prev]);
    setIsDirty(true);
  }, [activeStore, activeLocation, activeYear]);

  // Save changes
  const handleSaveAll = useCallback(() => {
    const res = updateSavedComparisonRows(rows);
    setIsDirty(false);
    setToast({
      title: 'Dữ liệu Index đã được lưu',
      message: `Đã cập nhật ${res.matchedUnits} đơn vị và ${res.projectsCount} dự án vào hệ thống, Tab Dynamic & Cloud R2.`,
      type: 'success',
    });
  }, [rows, setToast]);

  // Export current table to Excel
  const handleExportXLSX = useCallback(async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Index_Comparison_Data');
    XLSX.writeFile(wb, `Layout_Index_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [rows]);

  if (!isOpen) return null;

  const showAttributes = columnCategory === 'all' || columnCategory === 'attributes';
  const showMetrics = columnCategory === 'all' || columnCategory === 'metrics';
  const showProjects = columnCategory === 'all' || columnCategory === 'projects';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-[96vw] h-[92vh] max-h-[940px] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md font-extrabold text-sm tracking-wider">
              INDEX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Bảng Dữ Liệu Index & Match Dự Án (Layout Data Index)
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {rows.length} records
                </span>
                {isDirty && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                    Chưa lưu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toàn bộ dữ liệu import CSV/Excel • Đầy đủ 35 trường so sánh Dynamic (Thuộc tính, Tài chính, App Real-time) • Khớp CAD & Dự án tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadComparisonTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
              title="Tải mẫu Excel 35 cột chuẩn tab Dynamic"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Tải Mẫu Chuẩn (35 Cột)</span>
            </button>

            <button
              type="button"
              onClick={handleExportXLSX}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title="Xuất bảng hiện tại ra file Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95 animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu & Đồng bộ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Pill Switcher & Filters */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          
          {/* Column Category Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setColumnCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                columnCategory === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất cả cột (All)</span>
            </button>

            <button
              type="button"
              onClick={() => setColumnCategory('attributes')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                columnCategory === 'attributes'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              <span>1. Thuộc tính (Attributes)</span>
            </button>

            <button
              type="button"
              onClick={() => setColumnCategory('metrics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                columnCategory === 'metrics'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>2. Chỉ số tài chính (Metrics)</span>
            </button>

            <button
              type="button"
              onClick={() => setColumnCategory('projects')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                columnCategory === 'projects'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              <span>3. Dự án & Thi công (Project & Task)</span>
            </button>
          </div>

          {/* Quick Filters & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm Unit, Brand, Project, Class..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Store */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value as any)}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả Store</option>
              <option value="HCM">HCM</option>
              <option value="HN">HN</option>
            </select>

            {/* Floor */}
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả Tầng</option>
              {availableFloors.map((f) => (
                <option key={f} value={f}>
                  Tầng {f}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="all">Tất cả Trạng thái</option>
              {availableStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Add row */}
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm dòng</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <LayoutDataIndexTable
          filteredRows={filteredRows}
          cadUnitCodeSet={cadUnitCodeSet}
          existingProjectCodeSet={existingProjectCodeSet}
          showAttributes={showAttributes}
          showMetrics={showMetrics}
          showProjects={showProjects}
          handleCellChange={handleCellChange}
          handleDeleteRow={handleDeleteRow}
        />

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Hiển thị <strong>{filteredRows.length}</strong> / <strong>{rows.length}</strong> dòng
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Matched CAD: {filteredRows.filter((r) => cadUnitCodeSet.has(String(r.row['Unit Code'] || '').trim().toUpperCase())).length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
              Matched Dự án: {filteredRows.filter((r) => {
                const code = String(r.row['Project Code'] || '').trim().toUpperCase();
                return Boolean(code && existingProjectCodeSet.has(code));
              }).length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              Chưa có CAD: {filteredRows.filter((r) => !cadUnitCodeSet.has(String(r.row['Unit Code'] || '').trim().toUpperCase())).length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 font-semibold transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!isDirty}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-white transition-all shadow-sm ${
                isDirty
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isDirty ? 'Lưu thay đổi & Đồng bộ' : 'Đã lưu'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
});
