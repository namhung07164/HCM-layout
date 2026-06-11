import React from 'react';
import DataTable from './DataTable';
import { ActualClassInfo } from '../types';
import { useData } from '../DataContext';
import { cn } from '../lib/utils';

export default function ActualClassInfoTab() {
  const { actualClassInfo, setActualClassInfo } = useData();

  const handleDataChange = (newData: ActualClassInfo[]) => {
    // Determine HCM variables on the fly if needed, but since they are calculated properties we can keep them in state
    const processedData = newData.map(item => {
      const hcmSize = Number(item.hcmSize) || 0;
      const hcmSalesEffi = Number(item.hcmSalesEffi) || 0;
      const hcmProfitEffi = Number(item.hcmProfitEffi) || 0;

      const hcmSales = hcmSize * hcmSalesEffi * 12;
      const hcmProfit = hcmSize * hcmProfitEffi * 12;
      const hcmMargin = hcmSales !== 0 ? (hcmProfit / hcmSales) * 100 : 0;

      return {
        ...item,
        hcmSales: String(hcmSales),
        hcmProfit: String(hcmProfit),
        hcmMargin: String(hcmMargin)
      };
    });

    const seen = new Set<string>();
    const uniqueData = processedData.filter(item => {
      const key = `${item.classCode}|${item.name}|${item.hcmSize}|${item.hcmSalesEffi}|${item.hcmProfitEffi}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setActualClassInfo(uniqueData);
  };

  const getUniqueCount = (key: keyof ActualClassInfo) => (filteredData: ActualClassInfo[]) => {
    return String(new Set(filteredData.map(item => item[key]).filter(Boolean)).size);
  };

  const getSum = (key: keyof ActualClassInfo) => (filteredData: ActualClassInfo[]) => {
    if (!filteredData || !filteredData.length) return "0";
    let sum = 0;
    filteredData.forEach(item => {
      const val = Number(item[key]);
      if (!isNaN(val)) sum += val;
    });
    return sum.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const renderTextCell = React.useCallback((key: keyof ActualClassInfo) => (val: any, row: ActualClassInfo, updateRow: (newRow: ActualClassInfo) => void, isLocked: boolean) => (
    <input 
      type="text"
      value={val || ''} 
      onChange={(e) => updateRow({ ...row, [key]: e.target.value })}
      disabled={isLocked}
      className={cn(
        "bg-transparent border-0 text-slate-300 w-full outline-none",
        isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-blue-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-blue-500/50"
      )}
      placeholder="..."
    />
  ), []);

  const renderNumericCell = React.useCallback((key: keyof ActualClassInfo) => (val: any, row: ActualClassInfo, updateRow: (newRow: ActualClassInfo) => void, isLocked: boolean) => {
      const numVal = Number(val);
      return (
        <span className="text-slate-300 px-3">
          {!isNaN(numVal) ? numVal.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-'}
        </span>
      );
  }, []);

  const columns: { key: keyof ActualClassInfo; label: string; summary?: any; renderCell?: any }[] = React.useMemo(() => [
    { key: 'classCode', label: 'Class Code', summary: getUniqueCount('classCode'), renderCell: renderTextCell('classCode') },
    { key: 'name', label: 'Name', summary: getUniqueCount('name'), renderCell: renderTextCell('name') },
    { key: 'hcmSize', label: 'HCM Size', summary: getSum('hcmSize'), renderCell: renderTextCell('hcmSize') },
    { key: 'hcmSalesEffi', label: 'HCM Sales Effi', renderCell: renderTextCell('hcmSalesEffi') },
    { key: 'hcmProfitEffi', label: 'HCM Profit Effi', renderCell: renderTextCell('hcmProfitEffi') },
    { key: 'hcmSales', label: 'HCM Sales', summary: getSum('hcmSales'), renderCell: renderNumericCell('hcmSales') },
    { key: 'hcmProfit', label: 'HCM Profit', summary: getSum('hcmProfit'), renderCell: renderNumericCell('hcmProfit') },
    { key: 'hcmMargin', label: 'HCM Margin (%)', renderCell: renderNumericCell('hcmMargin') },
  ], [actualClassInfo, renderTextCell, renderNumericCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['Class Code', 'Name', 'HCM Size', 'HCM Sales Effi', 'HCM Profit Effi'],
    mapping: (row: any) => ({
      classCode: row['Class Code'] || row['classCode'] || '',
      name: row['Name'] || row['name'] || '',
      hcmSize: row['HCM Size'] || row['hcmSize'] || 0,
      hcmSalesEffi: row['HCM Sales Effi'] || row['hcmSalesEffi'] || 0,
      hcmProfitEffi: row['HCM Profit Effi'] || row['hcmProfitEffi'] || 0,
    })
  }), []);

  return (
    <DataTable
      title="Danh Sách Class Info"
      description="Quản lý thông tin Class Info và các chỉ số HCM"
      columns={columns}
      data={actualClassInfo}
      onDataChange={handleDataChange}
      importConfig={importConfig}
    />
  );
}
