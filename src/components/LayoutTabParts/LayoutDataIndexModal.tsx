import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Search, Plus, Save, Download, FileSpreadsheet, TrendingUp, Tag, Building2, Layers, Wand2, AlertTriangle } from 'lucide-react';
import { ComparisonRowInput, getSavedComparisonRows, updateSavedComparisonRows, downloadComparisonTemplate } from '../../lib/standaloneComparisonService';
import { useDataStore } from '../PictureMapping/DataContext';
import { useAppStore } from '../../store/useAppStore';
import { LayoutDataIndexTable } from './LayoutDataIndexTable';
import {
  computeCadUnitCodeSet,
  computeActiveFloorCadUnits,
  extractAvailableFloors,
  extractAvailableStatuses,
  filterComparisonRows,
  createComparisonRow,
} from './layoutDataIndexHelpers';

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
  const activeMapUnits = useDataStore((s) => s.mapUnits);

  useEffect(() => {
    if (isOpen) {
      setRows(getSavedComparisonRows());
      setIsDirty(false);
    }
  }, [isOpen]);

  const cadUnitCodeSet = useMemo(() => computeCadUnitCodeSet(storeLocationData), [storeLocationData]);

  const activeFloorCadUnits = useMemo(
    () => computeActiveFloorCadUnits(storeLocationData, activeStore, activeLocation, activeMapUnits),
    [storeLocationData, activeStore, activeLocation, activeMapUnits]
  );

  const existingProjectCodeSet = useMemo(() => {
    const set = new Set<string>();
    (projects || []).forEach((p) => {
      const code = (p.code || p.id || '').trim().toUpperCase();
      if (code) set.add(code);
    });
    return set;
  }, [projects]);

  const availableFloors = useMemo(() => extractAvailableFloors(rows), [rows]);
  const availableStatuses = useMemo(() => extractAvailableStatuses(rows), [rows]);
  const filteredRows = useMemo(
    () => filterComparisonRows(rows, storeFilter, floorFilter, statusFilter, searchTerm),
    [rows, storeFilter, floorFilter, statusFilter, searchTerm]
  );

  const emptyUnitCodeCount = useMemo(() => {
    return rows.filter((r) => !String(r['Unit Code'] || '').trim()).length;
  }, [rows]);

  const handleCellChange = useCallback((originalIndex: number, field: keyof ComparisonRowInput, val: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[originalIndex] = { ...next[originalIndex], [field]: val };
      return next;
    });
    setIsDirty(true);
  }, []);

  const handleDeleteRow = useCallback((originalIndex: number) => {
    if (!confirm('Bạn có chắc muốn xóa dòng dữ liệu này?')) return;
    setRows((prev) => prev.filter((_, idx) => idx !== originalIndex));
    setIsDirty(true);
  }, []);

  const handleAddRow = useCallback(() => {
    const newRow = createComparisonRow(activeStore, activeLocation, activeYear);
    setRows((prev) => [newRow, ...prev]);
    setIsDirty(true);
  }, [activeStore, activeLocation, activeYear]);

  // 1-Click Auto-fill / populate CAD Unit Codes from the active floor layout
  const handleAutoFillCadUnits = useCallback(() => {
    if (activeFloorCadUnits.length === 0) {
      setToast({
        title: 'Chưa có dữ liệu CAD',
        message: `Không tìm thấy gian hàng CAD nào tại Store ${activeStore}, Tầng ${activeLocation}.`,
        type: 'warning',
      });
      return;
    }

    setRows((prev) => {
      const next = [...prev];
      const existingCodesOnFloor = new Set<string>();

      // Track existing codes and fill empty Unit Code rows first
      const blankRowIndices: number[] = [];
      next.forEach((r, idx) => {
        const rStore = String(r['Store'] || 'HCM').toUpperCase().trim();
        const rFloor = String(r['Floor'] || 'L1').toUpperCase().trim();
        const rUnit = String(r['Unit Code'] || '').trim().toUpperCase();

        if (rStore === (activeStore || 'HCM').toUpperCase() && rFloor === (activeLocation || 'L1').toUpperCase()) {
          if (rUnit) {
            existingCodesOnFloor.add(rUnit);
          } else {
            blankRowIndices.push(idx);
          }
        }
      });

      let filledCount = 0;
      let addedCount = 0;

      // 1. Fill into rows that currently have blank Unit Codes
      const remainingCadUnits = activeFloorCadUnits.filter((c) => !existingCodesOnFloor.has(c.code));
      for (let i = 0; i < blankRowIndices.length && i < remainingCadUnits.length; i++) {
        const rowIdx = blankRowIndices[i];
        const cad = remainingCadUnits[i];
        next[rowIdx] = {
          ...next[rowIdx],
          'Unit Code': cad.code,
          'Contract Size (m2)': next[rowIdx]['Contract Size (m2)'] || cad.size || 50,
          'Project Code': next[rowIdx]['Project Code'] || `PROJ-${cad.code.replace(/[^a-zA-Z0-9]/g, '_')}`,
        };
        existingCodesOnFloor.add(cad.code);
        filledCount++;
      }

      // 2. For remaining CAD units without any row, append new rows
      const stillUnmatchedCadUnits = activeFloorCadUnits.filter((c) => !existingCodesOnFloor.has(c.code));
      stillUnmatchedCadUnits.forEach((cad) => {
        const newRow = createComparisonRow(activeStore, activeLocation, activeYear, cad.code, cad.size);
        next.push(newRow);
        addedCount++;
      });

      setToast({
        title: 'Đã nạp mã CAD thành công',
        message: `Đã điền ${filledCount} dòng trống và thêm ${addedCount} gian hàng CAD từ tầng ${activeLocation} (${activeStore}).`,
        type: 'success',
      });

      return next;
    });

    setIsDirty(true);
  }, [activeFloorCadUnits, activeStore, activeLocation, activeYear, setToast]);

  const handleSaveAll = useCallback(() => {
    const res = updateSavedComparisonRows(rows);
    setIsDirty(false);
    setToast({
      title: 'Dữ liệu Index đã được lưu',
      message: `Đã cập nhật ${res.matchedUnits} đơn vị và ${res.projectsCount} dự án vào hệ thống, Tab Dynamic & Cloud R2.`,
      type: 'success',
    });
  }, [rows, setToast]);

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
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md font-extrabold text-sm tracking-wider">
              INDEX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Bảng Dữ Liệu Index & Khớp Dự Án (Layout Data Index)
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {rows.length} dòng
                </span>
                {isDirty && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                    Chưa lưu
                  </span>
                )}
                {emptyUnitCodeCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>{emptyUnitCodeCount} dòng thiếu Unit Code</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đầy đủ 35 trường so sánh Dynamic (Thuộc tính, Tài chính, App Real-time) • Khớp CAD & Dự án tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillCadUnits}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors shadow-xs active:scale-95"
              title={`Tự động nạp mã CAD của tầng ${activeLocation} (${activeStore}) vào bảng`}
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Nạp mã từ CAD mặt bằng ({activeFloorCadUnits.length})</span>
            </button>

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
              <span>2. Tài chính (Metrics)</span>
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
              <span>3. Dự án & Thi công</span>
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
              Chưa khớp CAD: {filteredRows.filter((r) => !cadUnitCodeSet.has(String(r.row['Unit Code'] || '').trim().toUpperCase())).length}
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
