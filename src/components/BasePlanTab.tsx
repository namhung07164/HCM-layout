import React from 'react';
import DataTable from './DataTable';
import { BasePlanInfo } from '../types';
import { useData } from '../DataContext';
import { standardizeDateToMMDDYYYY, cn } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';

export default function BasePlanTab() {
  const { basePlan, setBasePlan } = useData();

  const handleDataChange = (newData: BasePlanInfo[]) => {
    setBasePlan(newData);
  };

  const getUniqueCount = (key: keyof BasePlanInfo) => {
    return new Set(basePlan.map(item => item[key]).filter(Boolean)).size;
  };

  const renderTextCell = React.useCallback((key: keyof BasePlanInfo) => (val: any, row: BasePlanInfo, updateRow: (newRow: BasePlanInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(basePlan.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
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
  }, [basePlan]);

  const renderNumericCell = React.useCallback((key: keyof BasePlanInfo) => (val: any, row: BasePlanInfo, updateRow: (newRow: BasePlanInfo) => void, isLocked: boolean) => {
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
          "bg-transparent border-0 text-slate-300 w-full outline-none font-mono text-xs",
          isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-brand-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-brand-500/50"
        )}
        placeholder="0"
      />
    );
  }, []);

  const columns: { key: keyof BasePlanInfo; label: string; summary?: React.ReactNode; renderCell?: any }[] = React.useMemo(() => [
    { key: 'floor', label: 'Floor', summary: getUniqueCount('floor'), renderCell: renderTextCell('floor') },
    { key: 'marginLow', label: 'Margin Low (%)', renderCell: renderNumericCell('marginLow') },
    { key: 'marginHigh', label: 'Margin High (%)', renderCell: renderNumericCell('marginHigh') },
    { key: 'managementFee', label: 'Mgmt Fee', renderCell: renderNumericCell('managementFee') },
    { key: 'fitOutManagementFee', label: 'Fit-out Mgmt Fee', renderCell: renderNumericCell('fitOutManagementFee') },
    { key: 'mgp', label: 'MGP', renderCell: renderNumericCell('mgp') },
    { key: 'stockroomFee', label: 'Stockroom Fee', renderCell: renderNumericCell('stockroomFee') },
    { key: 'cageFee', label: 'Cage Fee', renderCell: renderNumericCell('cageFee') },
    { key: 'apSupporting', label: 'A&P Supporting', renderCell: renderNumericCell('apSupporting') },
    { key: 'tieUp', label: 'Tie-up', renderCell: renderNumericCell('tieUp') },
    { key: 'vshcm', label: 'Vshcm (%)', renderCell: renderNumericCell('vshcm') },
  ], [basePlan, renderTextCell, renderNumericCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['floor', 'margin low', 'margin high', 'management fee', 'fit-out management fee', 'mgp', 'stockroom fee', 'cage fee', 'a&p supporting', 'tie-up', 'vshcm'],
    mapping: (row: any) => {
      const parseNum = (val: any) => {
        if (val === undefined || val === null || val === '') return 0;
        let clean = String(val).replace(/\s/g, '').replace(/,/g, '').replace(/%/g, '');
        return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
      };

      return {
        floor: row['floor'] || row['Floor'] || '',
        marginLow: parseNum(row['margin low'] || row['marginLow'] || row['Margin Low']),
        marginHigh: parseNum(row['margin high'] || row['marginHigh'] || row['Margin High']),
        managementFee: parseNum(row['management fee'] || row['managementFee'] || row['Management Fee']),
        fitOutManagementFee: parseNum(row['fit-out management fee'] || row['fitOutManagementFee'] || row['Fit-out Management Fee']),
        mgp: parseNum(row['mgp'] || row['MGP']),
        stockroomFee: parseNum(row['stockroom fee'] || row['stockroomFee'] || row['Stockroom Fee']),
        cageFee: parseNum(row['cage fee'] || row['cageFee'] || row['Cage Fee']),
        apSupporting: parseNum(row['a&p supporting'] || row['apSupporting'] || row['A&P Supporting']),
        tieUp: parseNum(row['tie-up'] || row['tieUp'] || row['Tie-up']),
        vshcm: parseNum(row['vshcm (%)'] || row['Vshcm (%)'] || row['vshcm'] || row['Vshcm']),
      };
    }
  }), []);

  return (
    <DataTable
      title="Dữ Liệu Base Plan"
      description="Quản lý kế hoạch cơ sở (Base Plan)"
      columns={columns}
      data={basePlan}
      onDataChange={handleDataChange}
      importConfig={importConfig}
    />
  );
}
