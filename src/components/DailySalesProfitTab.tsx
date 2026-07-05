import { useShallow } from 'zustand/react/shallow';
import React, { useMemo } from 'react';
import DataTable from './DataTable';
import { DailySalesProfitInfo } from '../types';
import { useDataStore } from '../DataContext';
import { cn } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';

export default function DailySalesProfitTab() {
  const {  dailySalesProfits, setDailySalesProfits } = useDataStore(useShallow(state => ({
    dailySalesProfits: state.dailySalesProfits,
    setDailySalesProfits: state.setDailySalesProfits,
  })));

  const handleDataChange = (newData: any[]) => {
    // Extract only the fields from DailySalesProfitInfo to save
    const cleanData: DailySalesProfitInfo[] = newData.map(({ date, brandCode, brandName, sales, profit, margin }) => ({
      date: date || '',
      brandCode: brandCode || '',
      brandName: brandName || '',
      sales: Number(sales) || 0,
      profit: Number(profit) || 0,
      margin: Number(margin) || 0
    }));
    setDailySalesProfits(cleanData);
  };

  const getUniqueCount = (key: keyof DailySalesProfitInfo) => {
    return new Set(dailySalesProfits.map(item => item[key]).filter(Boolean)).size;
  };

  const totalSalesSum = dailySalesProfits.reduce((sum, item) => sum + (Number(item.sales) || 0), 0);
  const totalProfitSum = dailySalesProfits.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);

  const renderTextCell = React.useCallback((key: keyof DailySalesProfitInfo) => (val: any, row: DailySalesProfitInfo, updateRow: (newRow: DailySalesProfitInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(dailySalesProfits.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
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
  }, [dailySalesProfits]);

  const renderNumericCell = React.useCallback((key: keyof DailySalesProfitInfo, isPercent = false) => (val: any, row: DailySalesProfitInfo, updateRow: (newRow: DailySalesProfitInfo) => void, isLocked: boolean) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [localVal, setLocalVal] = React.useState('');
    let displayValue = '';

    if (isFocused) {
      displayValue = localVal;
    } else {
      if (val === 0 || val === undefined || val === null || val === '') {
        displayValue = '';
      } else {
        if (isPercent) {
          displayValue = (Number(val) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
        } else {
          displayValue = Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });
        }
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
          setLocalVal(val === 0 || val === undefined || val === null ? '' : String(val));
        }}
        onBlur={() => {
          setIsFocused(false);
          let valStr = localVal.replace(/,/g, '');
          if (isPercent && valStr.endsWith('%')) {
             valStr = valStr.replace('%', '');
             valStr = (Number(valStr) / 100).toString();
          }
          const newVal = valStr === '' || isNaN(Number(valStr)) ? undefined : Number(valStr);
          updateRow({ ...row, [key]: newVal });
        }}
        disabled={isLocked}
        className={cn(
          "bg-transparent border-0 text-slate-300 w-full outline-none font-mono",
          isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/50 hover:bg-slate-800/80 focus:bg-brand-900/40 focus:text-brand-100 rounded px-2 py-1.5 transition-all shadow-inner shadow-black/20 border border-slate-700/50 hover:border-slate-600 focus:border-brand-500/50"
        )}
        placeholder="0"
      />
    );
  }, []);

  const columns = React.useMemo(() => [
    { key: 'date', label: 'Date', summary: getUniqueCount('date'), renderCell: renderTextCell('date') },
    { key: 'brandCode', label: 'Brand Code', summary: getUniqueCount('brandCode'), renderCell: renderTextCell('brandCode') },
    { key: 'brandName', label: 'Brand Name', summary: getUniqueCount('brandName'), renderCell: renderTextCell('brandName') },
    { 
      key: 'sales', 
      label: 'Sales', 
      summary: (
        <span className="flex items-center gap-1">
          {Number(totalSalesSum).toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </span>
      ),
      renderCell: renderNumericCell('sales')
    },
    { 
      key: 'profit', 
      label: 'Profit', 
      summary: (
        <span className="flex items-center gap-1">
          {Number(totalProfitSum).toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </span>
      ),
      renderCell: renderNumericCell('profit')
    },
    { 
      key: 'margin', 
      label: 'Margin', 
      summary: '',
      renderCell: renderNumericCell('margin', true)
    },
  ], [dailySalesProfits, totalSalesSum, totalProfitSum, renderTextCell, renderNumericCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['date', 'brand code', 'brand name', 'sales', 'profit', 'margin'],
    mapping: (row: any) => {
      const rawSales = String(row['sales'] || row['Sales'] || '0');
      const rawProfit = String(row['profit'] || row['Profit'] || '0');
      let rawMargin = String(row['margin'] || row['Margin'] || '0');
      
      const parseValue = (val: string) => {
        let clean = val.replace(/\s/g, '').replace(/,/g, '');
        return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
      };
      
      let parsedMargin = 0;
      if (rawMargin.includes('%')) {
         parsedMargin = parseValue(rawMargin.replace('%', '')) / 100;
      } else {
         parsedMargin = parseValue(rawMargin);
      }

      const parsedSales = parseValue(rawSales);
      const parsedProfit = parseValue(rawProfit);

      return {
        date: row['date'] || row['Date'] || '',
        brandCode: row['brand code'] || row['brandCode'] || row['Brand Code'] || '',
        brandName: row['brand name'] || row['brandName'] || row['Brand Name'] || '',
        sales: isNaN(parsedSales) ? 0 : parsedSales,
        profit: isNaN(parsedProfit) ? 0 : parsedProfit,
        margin: isNaN(parsedMargin) ? 0 : parsedMargin
      };
    }
  }), []);

  return (
    <DataTable
      title="Daily Sales & Profit"
      description="Nhập liệu doanh số và lợi nhuận hàng ngày"
      columns={columns as any}
      data={dailySalesProfits}
      onDataChange={handleDataChange as any}
      importConfig={importConfig}
    />
  );
}
