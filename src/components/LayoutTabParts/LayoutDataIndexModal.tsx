import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X,
  Search,
  Filter,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react';
import { ComparisonRowInput, getSavedComparisonRows, updateSavedComparisonRows } from '../../lib/standaloneComparisonService';
import { useDataStore } from '../PictureMapping/DataContext';
import { useAppStore } from '../../store/useAppStore';

interface LayoutDataIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStore: string;
  activeLocation: string;
  activeYear: string;
}

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
  const [isDirty, setIsDirty] = useState(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);

  const setToast = useAppStore((s) => s.setToast);
  const storeLocationData = useDataStore((s) => s.storeLocationData);

  // Load current saved rows when modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedComparisonRows();
      setRows(saved);
      setIsDirty(false);
      setEditingRowIdx(null);
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
      const rProjCode = String(row['Project Code'] || '').trim();
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
          rProjCode.toLowerCase().includes(q) ||
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

  // Add new row
  const handleAddRow = useCallback(() => {
    const newRow: ComparisonRowInput = {
      Store: (activeStore === 'HN' ? 'HN' : 'HCM'),
      Floor: activeLocation || 'L1',
      'Unit Code': `U-${Date.now().toString().slice(-4)}`,
      'Brand / Shop Name': 'New Tenant',
      'Shop Type': 'General',
      'Contract Size (m2)': 50,
      'MD Status': 'Operating',
      'Project Code': `PROJ-${Date.now().toString().slice(-4)}`,
      'Project Status': 'On process',
      'Start Date': `${activeYear || '2026'}-01-01`,
      'Finish Date': `${activeYear || '2026'}-12-31`,
      'Sales Amount': 100000000,
      'Profit Amount': 20000000,
      'Margin (%)': 20,
      'Party / Contractor': 'Internal',
      'Notes / Detail': '',
      Year: Number(activeYear) || 2026,
    };
    setRows((prev) => [newRow, ...prev]);
    setIsDirty(true);
    setEditingRowIdx(0);
  }, [activeStore, activeLocation, activeYear]);

  // Save changes
  const handleSaveAll = useCallback(() => {
    const res = updateSavedComparisonRows(rows);
    setIsDirty(false);
    setToast({
      title: 'Dữ liệu Index đã được lưu',
      message: `Đã cập nhật ${res.matchedUnits} đơn vị và ${res.projectsCount} dự án vào hệ thống & Cloud R2.`,
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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-7xl h-[92vh] max-h-[920px] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
              IDX
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
                <span>Layout Data Index & Project Matching</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {rows.length} rows
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bảng quản lý chi tiết toàn bộ dữ liệu import CSV/Excel • Kiểm tra khớp CAD Polygon • Chỉnh sửa thủ công trực tiếp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95 animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportXLSX}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title="Xuất dữ liệu hiện tại ra Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã Unit, Brand, Project..."
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

            {/* Store Filter */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value as any)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả Store</option>
              <option value="HCM">HCM</option>
              <option value="HN">HN</option>
            </select>

            {/* Floor Filter */}
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả Tầng</option>
              {availableFloors.map((f) => (
                <option key={f} value={f}>
                  Tầng {f}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="all">Tất cả Trạng thái</option>
              {availableStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm dòng mới</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 shadow-xs">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-28">Match CAD?</th>
                <th className="py-2.5 px-3 w-16">Store</th>
                <th className="py-2.5 px-3 w-16">Floor</th>
                <th className="py-2.5 px-3 w-24">Unit Code</th>
                <th className="py-2.5 px-3 min-w-[140px]">Brand / Shop</th>
                <th className="py-2.5 px-3 w-24">Shop Type</th>
                <th className="py-2.5 px-3 w-20">Size (m²)</th>
                <th className="py-2.5 px-3 w-24">MD Status</th>
                <th className="py-2.5 px-3 w-28">Project Code</th>
                <th className="py-2.5 px-3 w-24">Project Status</th>
                <th className="py-2.5 px-3 w-24">Start Date</th>
                <th className="py-2.5 px-3 w-24">Finish Date</th>
                <th className="py-2.5 px-3 w-28">Sales (VND)</th>
                <th className="py-2.5 px-3 w-28">Profit (VND)</th>
                <th className="py-2.5 px-3 w-16">Margin %</th>
                <th className="py-2.5 px-3 min-w-[120px]">Contractor</th>
                <th className="py-2.5 px-3 min-w-[160px]">Notes / Detail</th>
                <th className="py-2.5 px-3 w-14 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-400">
                    Không tìm thấy dòng dữ liệu nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ row, originalIndex }, idx) => {
                  const unitCode = String(row['Unit Code'] || '').trim().toUpperCase();
                  const isCadMatched = cadUnitCodeSet.has(unitCode);

                  return (
                    <tr
                      key={originalIndex}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* CAD Match Status */}
                      <td className="py-2 px-3">
                        {isCadMatched ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Matched CAD</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            title={`Mã unit "${unitCode}" chưa khớp với nhãn CAD polygon nào trong bản vẽ.`}
                          >
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>No CAD Unit</span>
                          </span>
                        )}
                      </td>

                      {/* Store */}
                      <td className="py-1 px-1">
                        <select
                          value={row['Store'] || 'HCM'}
                          onChange={(e) => handleCellChange(originalIndex, 'Store', e.target.value)}
                          className="w-full bg-transparent p-1 rounded font-bold border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none cursor-pointer"
                        >
                          <option value="HCM">HCM</option>
                          <option value="HN">HN</option>
                        </select>
                      </td>

                      {/* Floor */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Floor'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Floor', e.target.value)}
                          className="w-full bg-transparent p-1 rounded font-bold text-center border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Unit Code */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Unit Code'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Unit Code', e.target.value)}
                          className="w-full bg-transparent p-1 rounded font-mono font-bold text-indigo-600 dark:text-indigo-400 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Brand Name */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Brand / Shop Name'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Brand / Shop Name', e.target.value)}
                          className="w-full bg-transparent p-1 rounded font-semibold border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Shop Type */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Shop Type'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Shop Type', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Contract Size */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={row['Contract Size (m2)'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Contract Size (m2)', Number(e.target.value))}
                          className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* MD Status */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['MD Status'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'MD Status', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Project Code */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Project Code'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Project Code', e.target.value)}
                          className="w-full bg-transparent p-1 rounded font-mono border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Project Status */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Project Status'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Project Status', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Start Date */}
                      <td className="py-1 px-1">
                        <input
                          type="date"
                          value={row['Start Date'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Start Date', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Finish Date */}
                      <td className="py-1 px-1">
                        <input
                          type="date"
                          value={row['Finish Date'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Finish Date', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Sales Amount */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={row['Sales Amount'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Sales Amount', Number(e.target.value))}
                          className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Profit Amount */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={row['Profit Amount'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Profit Amount', Number(e.target.value))}
                          className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Margin % */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={row['Margin (%)'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Margin (%)', Number(e.target.value))}
                          className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Contractor */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Party / Contractor'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Party / Contractor', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Notes */}
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row['Notes / Detail'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Notes / Detail', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="py-1 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(originalIndex)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>
              Hiển thị <strong>{filteredRows.length}</strong> / <strong>{rows.length}</strong> dòng
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Matched CAD: {filteredRows.filter((r) => cadUnitCodeSet.has(String(r.row['Unit Code'] || '').trim().toUpperCase())).length}
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
