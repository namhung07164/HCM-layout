import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import DataTable from './DataTable';
import { SubFeeInfo } from '../types';
import { useDataStore } from '../DataContext';
import { standardizeDateToMMDDYYYY, cn } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';

function AllSubFeeTab() {
  const {  subFees, setSubFees  } = useDataStore(useShallow(state => ({
    subFees: state.subFees,
    setSubFees: state.setSubFees,
  })));

  const handleDataChange = (newData: SubFeeInfo[]) => {
    setSubFees(newData);
  };

  const getUniqueCount = (key: keyof SubFeeInfo) => {
    return new Set(subFees.map(item => item[key]).filter(Boolean)).size;
  };

  const totalMgmtFee = subFees.reduce((sum, item) => sum + (Number(item.managementFee) || 0), 0);
  const totalMgp = subFees.reduce((sum, item) => sum + (Number(item.mgp) || 0), 0);
  const totalFitOut = subFees.reduce((sum, item) => sum + (Number(item.fitOutManagementFee) || 0), 0);
  const totalAp = subFees.reduce((sum, item) => sum + (Number(item.apSupporting) || 0), 0);
  const totalTieUp = subFees.reduce((sum, item) => sum + (Number(item.tieUp) || 0), 0);
  const totalStockroom = subFees.reduce((sum, item) => sum + (Number(item.stockroomFee) || 0), 0);
  const totalCage = subFees.reduce((sum, item) => sum + (Number(item.cageFee) || 0), 0);

  const handleUpdateField = (row: SubFeeInfo, updateRow: (newRow: SubFeeInfo) => void, field: keyof SubFeeInfo, value: any) => {
    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    
    updateRow({
      ...row,
      [field]: value,
      update: formattedDate
    });
  };

  const renderNumericCell = React.useCallback((key: keyof SubFeeInfo) => (val: any, row: SubFeeInfo, updateRow: (newRow: SubFeeInfo) => void, isLocked: boolean) => {
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

  const renderTextCell = React.useCallback((key: keyof SubFeeInfo) => (val: any, row: SubFeeInfo, updateRow: (newRow: SubFeeInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(subFees.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
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
  }, [subFees]);

  const columns: { key: keyof SubFeeInfo; label: string; summary?: React.ReactNode; renderCell?: any }[] = React.useMemo(() => [
    { key: 'brandCode', label: 'Brand Code', summary: getUniqueCount('brandCode'), renderCell: renderTextCell('brandCode') },
    { key: 'brandName', label: 'Brand Name', summary: getUniqueCount('brandName'), renderCell: renderTextCell('brandName') },
    { key: 'managementFee', label: 'Mgmt Fee', summary: Number(totalMgmtFee).toLocaleString('en-US', { maximumFractionDigits: 2 }), renderCell: renderNumericCell('managementFee') },
    { key: 'mgp', label: 'MGP', summary: Number(totalMgp).toLocaleString('en-US', { maximumFractionDigits: 2 }), renderCell: renderNumericCell('mgp') },
    { key: 'fitOutManagementFee', label: 'Fit-out Mgmt Fee', summary: Number(totalFitOut).toLocaleString('en-US', { maximumFractionDigits: 2 }), renderCell: renderNumericCell('fitOutManagementFee') },
    { key: 'apSupporting', label: 'A&P Supporting', summary: Number(totalAp).toLocaleString('en-US', { maximumFractionDigits: 2 }), renderCell: renderNumericCell('apSupporting') },
    { key: 'tieUp', label: 'Tie-up', summary: Number(totalTieUp).toLocaleString('en-US', { maximumFractionDigits: 2 }), renderCell: renderNumericCell('tieUp') },
    { key: 'stockroomFee', label: 'Stockroom Fee', summary: Number(totalStockroom).toLocaleString('en-US', { maximumFractionDigits: 2 }), renderCell: renderNumericCell('stockroomFee') },
    { key: 'cageFee', label: 'Cage Fee', summary: Number(totalCage).toLocaleString('en-US', { maximumFractionDigits: 2 }), renderCell: renderNumericCell('cageFee') },
  ], [subFees, totalMgmtFee, totalMgp, totalFitOut, totalAp, totalTieUp, totalStockroom, totalCage, renderTextCell, renderNumericCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['update', 'brand code', 'brand name', 'management fee', 'mgp', 'fit-out management fee', 'a&p supporting', 'tie-up', 'stockroom fee', 'cage fee'],
    mapping: (row: any) => {
      const parseNum = (val: any) => {
        let clean = String(val || '0').replace(/\s/g, '').replace(/,/g, '');
        return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
      };

      return {
        update: standardizeDateToMMDDYYYY(row['update'] || row['Update'] || row['date'] || row['Date'] || ''),
        brandCode: row['brand code'] || row['brandCode'] || row['Brand Code'] || '',
        brandName: row['brand name'] || row['brandName'] || row['Brand Name'] || '',
        managementFee: parseNum(row['management fee'] || row['managementFee'] || row['Management Fee']),
        mgp: parseNum(row['mgp'] || row['MGP'] || row['fee type'] || row['feeType']),
        fitOutManagementFee: parseNum(row['fit-out management fee'] || row['fitOutManagementFee'] || row['Fit-out Management Fee'] || row['amount'] || row['Amount']),
        apSupporting: parseNum(row['a&p supporting'] || row['apSupporting'] || row['A&P Supporting']),
        tieUp: parseNum(row['tie-up'] || row['tieUp'] || row['Tie-up']),
        stockroomFee: parseNum(row['stockroom fee'] || row['stockroomFee'] || row['Stockroom Fee']),
        cageFee: parseNum(row['cage fee'] || row['cageFee'] || row['Cage Fee']),
      };
    }
  }), []);

  return (
    <DataTable
      title="Dữ Liệu All Sub-Fee"
      description="Quản lý và theo dõi Sub-Fee theo thời gian"
      columns={columns}
      data={subFees}
      onDataChange={handleDataChange}
      importConfig={importConfig}
    />
  );
}

export default React.memo(AllSubFeeTab);
