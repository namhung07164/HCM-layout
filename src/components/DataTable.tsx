import { useShallow } from 'zustand/react/shallow';
import React, { useRef, useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Trash2, Database, Search, Lock, Unlock, Download, X, RefreshCw, Eye, EyeOff, Plus, Copy } from 'lucide-react';
import { cn, autoFormatRow } from '../lib/utils';
import { useDataStore } from '../DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { FixedSizeList } from 'react-window';

interface ColumnDef<T> {
  key: any;
  label: string;
  summary?: React.ReactNode | ((filteredData: T[]) => React.ReactNode);
  renderCell?: (val: any, row: T, updateRow: (newRow: T) => void, isLocked: boolean) => React.ReactNode;
  isNumeric?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { label: string; value: string }[];
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onDataChange: (newData: T[]) => void;
  onUpdateData?: (newData: T[]) => void;
  title: string;
  description: string;
  subHeader?: React.ReactNode;
  importConfig?: {
    expectedHeaders: string[];
    mapping: (row: any) => T;
  };
  storageKey?: string; // To persist column visibility per tab
  defaultFilters?: Record<string, string>;
  readonly?: boolean;
}

const formatDate = (date: Date) => {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
};

// Extracted Row component for react-window to prevent unmounting and focus loss
const areEqual = (prevProps: any, nextProps: any) => {
  if (prevProps.index !== nextProps.index || prevProps.style !== nextProps.style) return false;
  if (prevProps.data.visibleColumns !== nextProps.data.visibleColumns) return false;
  if (prevProps.data.isLocked !== nextProps.data.isLocked) return false;
  // Deep check the actual row data object reference
  if (prevProps.data.filteredData[prevProps.index] !== nextProps.data.filteredData[nextProps.index]) return false;
  return true;
};

const Row = React.memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
  const {  filteredData, visibleColumns, isLocked, onDataChange, originalData } = data;
  const row = filteredData[index];
  
  const updateRow = (newRow: any) => {
    // Add auto-update timestamp
    const updatedRow = {
      ...newRow,
      update: formatDate(new Date())
    };

    // Find the index of this row in the original 'data' array
    const dataIndex = originalData.indexOf(row);
    if (dataIndex > -1) {
      const newData = [...originalData];
      newData[dataIndex] = updatedRow;
      onDataChange(newData);
    }
  };

  const deleteRow = () => {
    if (isLocked) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa dòng này?')) {
      const dataIndex = originalData.indexOf(row);
      if (dataIndex > -1) {
        const newData = [...originalData];
        newData.splice(dataIndex, 1);
        onDataChange(newData);
      }
    }
  };

  const duplicateRow = () => {
    if (isLocked) return;
    const dataIndex = originalData.indexOf(row);
    if (dataIndex > -1) {
      const duplicatedRow = {
        ...row,
        update: formatDate(new Date())
      };
      const newData = [...originalData];
      newData.splice(dataIndex + 1, 0, duplicatedRow);
      onDataChange(newData);
    }
  };

  return (
    <div 
      style={style} 
      className="flex border-b border-slate-800/30 hover:bg-brand-600/5 transition-colors group text-sm items-center pr-4"
    >
      {visibleColumns.map((col: any) => {
        const isCode = col.key.toString().toLowerCase().includes('code');
        const isName = col.key.toString().toLowerCase().includes('name');
        const isUpdateField = col.key === 'update';

        return (
          <div 
            key={col.key.toString()} 
            className={cn(
              "px-8 py-4 font-light flex-1 min-w-[200px]",
              isCode ? "font-mono text-brand-400/80 text-xs" : 
              isName ? "serif italic text-slate-200" :
              isUpdateField ? "font-mono text-[10px] text-slate-500 truncate" :
              "text-slate-400 font-sans"
            )}
          >
            {isUpdateField ? (row[col.key] || '-') : (col.renderCell 
              ? col.renderCell(row[col.key], row, updateRow, isLocked)
              : typeof row[col.key] === 'number' 
                ? Number(row[col.key]).toLocaleString('en-US', { maximumFractionDigits: 2 })
                : (row[col.key] || '-'))}
          </div>
        );
      })}
      
      {/* Row Actions */}
      <div className="w-24 flex justify-center shrink-0 gap-1">
        <button
          onClick={duplicateRow}
          disabled={isLocked || !!row.locked}
          className={cn(
            "p-2 rounded-full transition-all opacity-0 group-hover:opacity-100",
            (isLocked || !!row.locked)
              ? "text-slate-700 cursor-not-allowed" 
              : "text-slate-500 hover:text-brand-400 hover:bg-brand-900/20 active:scale-90"
          )}
          title="Nhân bản dòng này"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={deleteRow}
          disabled={isLocked || !!row.locked}
          className={cn(
            "p-2 rounded-full transition-all opacity-0 group-hover:opacity-100",
            (isLocked || !!row.locked)
              ? "text-slate-700 cursor-not-allowed" 
              : "text-slate-500 hover:text-red-400 hover:bg-red-900/20 active:scale-90"
          )}
          title="Xóa dòng này"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the specific row data or columns/locks have changed
  return prevProps.index === nextProps.index &&
         prevProps.data.filteredData[prevProps.index] === nextProps.data.filteredData[nextProps.index] &&
         prevProps.data.visibleColumns === nextProps.data.visibleColumns &&
         prevProps.data.isLocked === nextProps.data.isLocked;
});

export default function DataTable<T extends Record<string, any>>({
  columns: initialColumns,
  data,
  onDataChange,
  onUpdateData,
  title,
  description,
  subHeader,
  importConfig,
  storageKey,
  defaultFilters,
  readonly = false
}: DataTableProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isSaving, isAppLocked, setIsAppLocked } = useDataStore(useShallow(state => ({
    isSaving: state.isSaving,
    isAppLocked: state.isAppLocked,
    setIsAppLocked: state.setIsAppLocked
  })));
  const [filters, setFilters] = useState<Record<string, string>>(defaultFilters || {});
  const [showFilters, setShowFilters] = useState(false);
  
  const isLocked = isAppLocked;
  const setIsLocked = setIsAppLocked;
  
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [containerHeight, setContainerHeight] = useState(400);
  const [containerWidth, setContainerWidth] = useState(1000);
  
  // Custom columns state
  const [dynamicColumns, setDynamicColumns] = useState<ColumnDef<T>[]>([]);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`datatable_hidden_${title}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [enableAutoFormat, setEnableAutoFormat] = useState(true);

  useEffect(() => {
    localStorage.setItem(`datatable_hidden_${title}`, JSON.stringify(Array.from(hiddenColumnKeys)));
  }, [hiddenColumnKeys, title]);

  // Merge predefined columns with dynamic ones and ensure 'update' is at start
  const allColumns = useMemo(() => {
    const merged = [...initialColumns, ...dynamicColumns];
    // Ensure update is at the beginning if it exists
    const updateCol = merged.find(c => c.key === 'update');
    const others = merged.filter(c => c.key !== 'update');
    if (updateCol) return [updateCol, ...others];
    
    // If update col not defined, add it
    return [{ key: 'update' as keyof T, label: 'Update' }, ...others];
  }, [initialColumns, dynamicColumns]);

  const visibleColumns = useMemo(() => {
    return allColumns.filter(col => !hiddenColumnKeys.has(col.key.toString()));
  }, [allColumns, hiddenColumnKeys]);

  // Update container height/width for virtualization
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight);
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [showFilters]);

  const handleImportClick = () => {
    if (isLocked) {
      alert('Vui lòng mở khóa để thực hiện chức năng này');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUpdateClick = () => {
    if (isLocked) {
      alert('Vui lòng mở khóa để thực hiện chức năng này');
      return;
    }
    updateFileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, isUpdate: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true, // Use worker for large files
      complete: (results) => {
        let importedData: T[];
        if (importConfig) {
          importedData = results.data.map(importConfig.mapping);
        } else {
          importedData = results.data as T[];
        }

        if (enableAutoFormat) {
          importedData = importedData.map(autoFormatRow);
        }

        // Add default update date to imported data
        const now = formatDate(new Date());
        const dataWithUpdate = importedData.map(item => ({
          ...item,
          update: item.update || now
        }));

        if (isUpdate && onUpdateData) {
          onUpdateData(dataWithUpdate);
        } else {
          onDataChange([...data, ...dataWithUpdate]);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
        if (updateFileInputRef.current) updateFileInputRef.current.value = '';
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        alert('Error parsing CSV file');
      }
    });
  };

  const handleClear = () => {
    if (isLocked) {
      alert('Vui lòng mở khóa để thực hiện chức năng này');
      return;
    }
    if (confirm('Are you sure you want to clear all data?')) {
      onDataChange([]);
    }
  };

  const handleAddRow = () => {
    if (isLocked) {
      alert('Vui lòng mở khóa để thực hiện chức năng này');
      return;
    }
    const newRowObject: any = {};
    allColumns.forEach(col => {
      if (col.key === 'update') {
        newRowObject[col.key as string] = formatDate(new Date());
      } else {
        newRowObject[col.key as string] = '';
      }
    });
    const newRow = newRowObject as T;
    onDataChange([newRow, ...data]);
  };

  const handleAddColumn = () => {
    if (isLocked) {
      alert('Vui lòng mở khóa để thực hiện chức năng này');
      return;
    }
    const colName = prompt('Nhập tên cột mới:');
    if (!colName) return;

    const colKey = colName.toLowerCase().replace(/\s+/g, '_') as keyof T;
    
    // Check if exists
    if (allColumns.find(c => c.key === colKey)) {
      alert('Cột này đã tồn tại');
      return;
    }

    setDynamicColumns(prev => [...prev, {
      key: colKey,
      label: colName,
      renderCell: (val: any, row: T, updateRow: (newRow: T) => void, locked: boolean) => (
        <input 
          type="text"
          value={val || ''} 
          onChange={(e) => updateRow({ ...row, [colKey]: e.target.value })}
          disabled={locked}
          className={cn(
            "bg-transparent border-0 text-slate-300 w-full outline-none",
            locked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/50 hover:bg-slate-800/80 focus:bg-brand-900/40 focus:text-brand-100 rounded px-2 py-1.5 transition-all shadow-inner shadow-black/20 border border-slate-700/50 hover:border-slate-600 focus:border-brand-500/50"
          )}
          placeholder="..."
        />
      )
    }]);
  };

  const toggleColumn = (key: string) => {
    setHiddenColumnKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDeleteColumn = (colKey: keyof T) => {
    if (isLocked) {
      alert('Vui lòng mở khóa để thực hiện chức năng này');
      return;
    }
    const colDef = dynamicColumns.find(c => c.key === colKey);
    if (!colDef) return;

    if (confirm(`Bạn có chắc chắn muốn xóa cột "${colDef.label}"?`)) {
      setDynamicColumns(prev => prev.filter(c => c.key !== colKey));
      setHiddenColumnKeys(prev => {
        const next = new Set(prev);
        next.delete(colKey.toString());
        return next;
      });
      
      // Clear data for this column in all rows
      const newData = data.map(row => {
        const newRow = { ...row };
        delete newRow[colKey as string];
        return newRow;
      });
      onDataChange(newData);
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      alert('Không có dữ liệu để xuất');
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '16041985') {
      setIsLocked(false);
      setShowPasswordPrompt(false);
      setPassword('');
    } else {
      alert('Mật khẩu không chính xác');
    }
  };

  const filteredData = useMemo(() => {
    // Pre-calculate active filters and their corresponding columns
    const activeFilters = Object.entries(filters)
      .filter(([_, filterValue]) => Boolean(filterValue))
      .map(([key, filterValue]) => {
        return {
          key,
          searchVal: String(filterValue).toLowerCase(),
          column: allColumns.find(c => c.key.toString() === key)
        };
      });

    if (activeFilters.length === 0) return data;

    return data.filter(row => {
      return activeFilters.every(({ key, searchVal, column }) => {
        const cellValue = String(row[key] || '').toLowerCase();
        if (column?.filterType === 'select') {
          return cellValue === searchVal;
        }
        return cellValue.includes(searchVal);
      });
    });
  }, [data, filters, allColumns]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const itemData = useMemo(() => ({ 
    filteredData, 
    visibleColumns, 
    isLocked: isLocked || readonly, 
    onDataChange, 
    originalData: data 
  }), [filteredData, visibleColumns, isLocked, readonly, onDataChange, data]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between glass shrink-0 z-20 gap-4">
        <div>
          <h3 className="text-xl font-light italic serif tracking-wide text-white">{title}</h3>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">{description}</p>
          {subHeader && <div className="mt-4">{subHeader}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e, false)}
            accept=".csv"
            className="hidden"
          />
          <input
            type="file"
            ref={updateFileInputRef}
            onChange={(e) => handleFileChange(e, true)}
            accept=".csv"
            className="hidden"
          />
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 border text-xs font-bold uppercase tracking-widest rounded transition-all active:scale-95",
              showFilters || activeFilterCount > 0 
                ? "bg-brand-600/20 text-brand-400 border-brand-500/30" 
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            )}
          >
            <Search size={14} />
            Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <button
            onClick={() => setShowColumnToggle(!showColumnToggle)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 border text-xs font-bold uppercase tracking-widest rounded transition-all active:scale-95",
              showColumnToggle 
                ? "bg-purple-600/20 text-purple-400 border-purple-500/30" 
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            )}
            title="Ẩn/Hiện Cột"
          >
            <Eye size={14} />
            Columns
          </button>

          {!readonly && (
            <>
              <button
                onClick={handleAddColumn}
                disabled={isLocked}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 border text-xs font-bold uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed",
                  isLocked 
                    ? "bg-slate-900 border-slate-800 text-slate-600" 
                    : "bg-cyan-900/10 border-cyan-800/50 text-cyan-400 hover:bg-cyan-900/20"
                )}
              >
                <Plus size={14} />
                Add Col
              </button>

              <button
                onClick={handleAddRow}
                disabled={isLocked}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 border text-xs font-bold uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap",
                  isLocked 
                    ? "bg-slate-900 border-slate-800 text-slate-600" 
                    : "bg-green-900/10 border-green-800/50 text-green-400 hover:bg-green-900/20"
                )}
              >
                <Database size={14} />
                Add Row
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 text-xs font-bold uppercase tracking-widest text-slate-300 rounded hover:bg-slate-700 transition-all active:scale-95"
          >
            <Download size={14} />
            Export CSV
          </button>

          {!readonly && (
            <>
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap px-2 cursor-pointer hover:text-slate-300">
                <input 
                  type="checkbox" 
                  checked={enableAutoFormat} 
                  onChange={(e) => setEnableAutoFormat(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-500/50 w-3.5 h-3.5 cursor-pointer"
                  disabled={isLocked}
                />
                Auto-Format
              </label>

              <button
                onClick={handleImportClick}
                disabled={isLocked}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 border text-xs font-bold uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed",
                  isLocked 
                    ? "bg-slate-900 border-slate-800 text-slate-600" 
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                )}
              >
                <Upload size={14} />
                Import CSV
              </button>

              {onUpdateData && (
                <button
                  onClick={handleUpdateClick}
                  disabled={isLocked}
                  title="Cập nhật thông tin còn thiếu dựa vào Class Code"
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 border text-xs font-bold uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap",
                    isLocked 
                      ? "bg-slate-900 border-slate-800 text-slate-600" 
                      : "bg-brand-900/10 border-brand-800/50 text-brand-400 hover:bg-brand-900/20"
                  )}
                >
                  <RefreshCw size={14} className={isLocked ? "" : "animate-spin-slow"} />
                  Update CSV
                </button>
              )}

              <button
                onClick={handleClear}
                disabled={isLocked}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 border rounded text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed",
                  isLocked
                    ? "border-slate-900 text-slate-600 font-bold"
                    : "border-slate-800 text-slate-500 hover:bg-red-900/10 hover:text-red-400 hover:border-red-900/30"
                )}
              >
                <Trash2 size={14} />
                Clear
              </button>

              <button
                onClick={() => isLocked ? setShowPasswordPrompt(true) : setIsLocked(true)}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-90",
                  isLocked 
                    ? "bg-red-950/20 text-red-500 border border-red-900/30 hover:bg-red-950/40" 
                    : "bg-green-950/20 text-green-500 border border-green-900/30 hover:bg-green-950/40"
                )}
              >
                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Column Toggle Panel */}
      <AnimatePresence>
        {showColumnToggle && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900/80 border-b border-slate-800 px-8 py-4 z-10"
          >
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mr-2">Hiện/Ẩn Cột:</span>
              {allColumns.map(col => {
                const isHidden = hiddenColumnKeys.has(col.key.toString());
                return (
                  <button
                    key={col.key.toString()}
                    onClick={() => toggleColumn(col.key.toString())}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all",
                      isHidden 
                        ? "bg-slate-800 text-slate-600 border border-slate-700 opacity-50" 
                        : "bg-purple-600/10 text-purple-400 border border-purple-500/30"
                    )}
                  >
                    {isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                    {col.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Prompt Overlay */}
      <AnimatePresence>
        {showPasswordPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161B22] border border-slate-800 p-8 rounded-2xl shadow-2xl w-80 relative"
            >
              <button 
                onClick={() => setShowPasswordPrompt(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-brand-600/20 rounded-full flex items-center justify-center text-brand-400 mb-2">
                  <Lock size={24} />
                </div>
                <h4 className="text-lg font-light serif italic text-white">Xác thực quyền</h4>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Nhập mật khẩu để mở khóa</p>
                
                <form onSubmit={handleUnlock} className="w-full space-y-4">
                  <input
                    autoFocus
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl text-center text-lg tracking-widest text-white outline-none focus:border-brand-500 transition-all font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-brand-900/20"
                  >
                    Unlock
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Content with Virtualization */}
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar font-sans border-t border-slate-800/30">
        <div style={{ minWidth: `${Math.max(containerWidth, visibleColumns.length * 200 + 100)}px` }} className="h-full flex flex-col">
          <div className="flex bg-slate-800/80 backdrop-blur-md sticky top-0 z-10 shadow-sm shadow-black/20 font-bold pr-4">
            {visibleColumns.map((col) => {
              const isDynamic = dynamicColumns.some(dc => dc.key === col.key);
              
              return (
                <div key={col.key.toString()} className="flex-1 px-8 py-4 border-b border-slate-700/50 flex flex-col justify-end min-w-[200px] group/header relative">
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] whitespace-normal break-words mb-1 pr-4">
                        {col.label}
                      </div>
                      {isDynamic && !isLocked && (
                        <button
                          onClick={() => handleDeleteColumn(col.key)}
                          className="text-slate-600 hover:text-red-400 opacity-0 group-hover/header:opacity-100 transition-all p-1 -mr-2 bg-red-900/10 rounded"
                          title="Xóa cột này"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {col.summary && (
                      <div className="text-xs font-mono text-brand-400 mb-2 mt-auto">
                        {typeof col.summary === 'function' ? col.summary(filteredData as any) : col.summary}
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {(showFilters || col.filterType === 'select') && (
                      <motion.div
                        initial={col.filterType === 'select' ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={col.filterType === 'select' ? undefined : { height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2"
                      >
                        {col.filterType === 'select' ? (
                          <select 
                            value={filters[col.key.toString()] || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, [col.key.toString()]: e.target.value }))}
                            className="w-full bg-slate-700 border border-slate-600 text-slate-100 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider outline-none focus:border-brand-500 transition-colors cursor-pointer"
                          >
                            <option className="bg-slate-700 text-white" value="">ALL</option>
                            {col.filterOptions?.map(opt => (
                              <option className="bg-slate-700 text-white" key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type="text"
                            placeholder="..."
                            value={filters[col.key.toString()] || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, [col.key.toString()]: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-slate-700 text-slate-300 px-2 py-1.5 rounded text-xs font-normal outline-none focus:border-brand-500 transition-colors placeholder:text-slate-600 font-mono"
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {/* Action Column Header */}
            <div className="w-24 border-b border-slate-700/50 shrink-0" />
          </div>

          {filteredData.length === 0 ? (
            <div className="px-8 py-32 text-center h-full flex flex-col items-center justify-center">
              <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center text-slate-700">
                  {data.length > 0 ? <Search size={32} /> : <Database size={32} />}
                </div>
                <p className="text-xs font-light italic serif tracking-wider text-slate-500 underline underline-offset-8">
                  {data.length > 0 ? 'No matching records found' : 'No records found in current batch'}
                </p>
              </div>
            </div>
          ) : (
            <FixedSizeList
              height={containerHeight - (showFilters ? 90 : 50)} // Rough estimate for header height
              itemCount={filteredData.length}
              itemSize={56} // Approximate height of each row
              width="100%"
              className="custom-scrollbar"
              style={{ overflowX: 'hidden' }}
              itemData={itemData}
            >
              {Row}
            </FixedSizeList>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/50 glass flex items-center justify-between px-8 shrink-0">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex gap-4">
          <span>Total: <span className="text-slate-300">{data.length}</span></span>
          {activeFilterCount > 0 && (
            <span>Filtered: <span className="text-brand-400">{filteredData.length}</span></span>
          )}
        </div>
        <div className="text-[10px] text-slate-600 italic serif">
          * {isSaving ? 'Saving to local storage...' : 'Data is automatically backed up locally.'}
        </div>
      </div>
    </div>
  );
}

