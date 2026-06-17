import React from 'react';
import DataTable from './DataTable';
import { UnitDataInfo } from '../types';
import { useData } from '../DataContext';
import { cn } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';

export default function UnitsTab() {
  const { units, setUnits } = useData();

  const handleDataChange = (newData: UnitDataInfo[]) => {
    let finalData = [...newData];
    
    const unitsMap = new Map<string, UnitDataInfo[]>();
    for (const r of finalData) {
      const activeVal = r.active === 'act' || r.active === 'Active' ? 'Active' : r.active === 'Unactive' || r.active === 'unact' ? 'Unactive' : r.active || 'Active';
      if (activeVal === 'Active' && r.unit) {
        if (!unitsMap.has(r.unit)) unitsMap.set(r.unit, []);
        unitsMap.get(r.unit)!.push(r);
      }
    }

    for (const [unitName, activeRows] of unitsMap.entries()) {
       if (activeRows.length > 1) {
           const newlyUpdated = activeRows.find(r => !units.includes(r));
           if (newlyUpdated) {
               const confirmed = window.confirm(`Unit ${unitName} hiện đang có bản ghi Active khác. Bạn có muốn đặt các bản ghi khác của Unit này thành Unactive không?`);
               if (confirmed) {
                   finalData = finalData.map(r => {
                       if (r.unit === unitName && r !== newlyUpdated) {
                           return { ...r, active: 'Unactive' };
                       }
                       return r;
                   });
               } else {
                   finalData = finalData.map(r => r === newlyUpdated ? { ...r, active: 'Unactive' } : r);
               }
           }
       }
    }
    
    setUnits(finalData);
  };

  const getUniqueCount = (key: keyof UnitDataInfo) => (filteredData: UnitDataInfo[]) => {
    const uniqueVals = new Set(filteredData.map(item => item[key]).filter(Boolean));
    return uniqueVals.size > 0 ? uniqueVals.size : null;
  };

  const getSum = (key: keyof UnitDataInfo) => (filteredData: UnitDataInfo[]) => {
    let sum = 0;
    let count = 0;
    filteredData.forEach(item => {
        const val = item[key];
        if (typeof val === 'number') {
            sum += val;
            count++;
        } else if (typeof val === 'string') {
            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
            if (!isNaN(num)) {
                sum += num;
                count++;
            }
        }
    });
    if (sum === 0 && count === 0) return null;
    
    if (key === 'size') {
        return (
          <span className="flex items-center gap-1">
            {sum.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })} SQM
          </span>
        );
    }
    return sum.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const renderTextCell = React.useCallback((key: keyof UnitDataInfo) => (val: any, row: UnitDataInfo, updateRow: (newRow: UnitDataInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(units.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
    return (
      <AutocompleteCell 
        value={val || ''} 
        onChange={(newVal) => updateRow({ ...row, [key]: newVal })}
        onSelect={(item) => updateRow({ ...row, [key]: item })}
        options={options}
        minChars={0}
        isLocked={isLocked}
        placeholder="..."
      />
    );
  }, [units]);

  const renderNumericCell = React.useCallback((key: keyof UnitDataInfo) => (val: any, row: UnitDataInfo, updateRow: (newRow: UnitDataInfo) => void, isLocked: boolean) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [localVal, setLocalVal] = React.useState('');

    let displayValue = '';
    if (isFocused) {
      displayValue = localVal;
    } else {
      if (val === undefined || val === null || val === '') {
        displayValue = '';
      } else {
        displayValue = Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });
      }
    }

    return (
      <input 
        type="text"
        value={displayValue} 
        onChange={(e) => {
          setLocalVal(e.target.value);
        }}
        onFocus={() => {
          setIsFocused(true);
          setLocalVal(val === undefined || val === null ? '' : String(val));
        }}
        onBlur={() => {
          setIsFocused(false);
          const valStr = localVal.replace(/,/g, '');
          const newVal = valStr === '' || isNaN(Number(valStr)) ? undefined : Number(valStr);
          updateRow({ ...row, [key]: newVal });
        }}
        disabled={isLocked}
        className={cn(
          "bg-transparent border-0 text-slate-300 w-full outline-none font-mono text-sm",
          isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-blue-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-blue-500/50"
        )}
        placeholder="0"
      />
    );
  }, []);

  const renderActiveCell = React.useCallback(() => (val: any, row: UnitDataInfo, updateRow: (newRow: UnitDataInfo) => void, isLocked: boolean) => (
    <select
      value={val || 'Active'}
      onChange={(e) => updateRow({ ...row, active: e.target.value })}
      disabled={isLocked}
      className={cn(
        "bg-transparent border-0 w-full outline-none text-xs font-medium",
        (val === 'Unactive' || val === 'unact') ? "text-red-400" : "text-green-400",
        isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-pointer bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-blue-600/20 rounded px-1 min-w-[70px] py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-blue-500/50"
      )}
    >
      <option value="Active" className="bg-slate-900 text-green-400 font-medium">Active</option>
      <option value="Unactive" className="bg-slate-900 text-red-400 font-medium">Unactive</option>
    </select>
  ), []);

  const columns: { key: keyof UnitDataInfo; label: string; summary?: any; renderCell?: any; filterType?: string; filterOptions?: any[] }[] = React.useMemo(() => [
    { key: 'floor', label: 'Floor', summary: getUniqueCount('floor'), renderCell: renderTextCell('floor') },
    { key: 'unit', label: 'Unit', summary: getUniqueCount('unit'), renderCell: renderTextCell('unit') },
    { 
      key: 'size', 
      label: 'Size', 
      summary: getSum('size'),
      renderCell: renderNumericCell('size')
    },
    { 
      key: 'active', 
      label: 'Status', 
      summary: getUniqueCount('active'),
      renderCell: renderActiveCell(),
      filterType: 'select',
      filterOptions: [
        { label: 'Active', value: 'Active' },
        { label: 'Unactive', value: 'Unactive' }
      ]
    },
  ], [units, renderTextCell, renderNumericCell, renderActiveCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['unit', 'size', 'floor', 'active'],
    mapping: (row: any) => {
      const parseNum = (val: any) => {
        let clean = String(val || '0').replace(/\s/g, '').replace(/,/g, '');
        return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
      };

      const activeVal = row['active'] || row['Active'] || 'Active';

      return {
        unit: row['unit'] || row['Unit'] || '',
        size: parseNum(row['size'] || row['Size']),
        floor: row['floor'] || row['Floor'] || '',
        active: activeVal.toLowerCase().includes('unact') || activeVal.toLowerCase().includes('inact') ? 'Unactive' : 'Active',
      };
    }
  }), []);

  const tableData = React.useMemo(() => units.map(u => {
    let activeVal = u.active || 'Active';
    if (activeVal === 'act') activeVal = 'Active';
    if (activeVal === 'unact') activeVal = 'Unactive';
    return { ...u, active: activeVal };
  }), [units]);

  return (
    <DataTable
      title="Dữ Liệu Danh Mục Unit"
      description="Quản lý danh sách các Unit trong tòa nhà"
      columns={columns as any}
      data={tableData}
      onDataChange={handleDataChange}
      importConfig={importConfig}
      defaultFilters={{ active: 'Active' }}
    />
  );
}
