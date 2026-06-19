import React, { useMemo } from 'react';
import DataTable from './DataTable';
import { ProfitInfo } from '../types';
import { useData } from '../DataContext';
import { standardizeDateToMMDDYYYY, cn } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';

// Using an extended interface internally for rendering to show 'margin'
interface EnrichedProfitInfo extends ProfitInfo {
  marginOutput: React.ReactNode;
  marginByCpOutput: React.ReactNode;
}

export default function ProfitTab() {
  const { profits, setProfits, sales } = useData();

  const handleDataChange = (newData: any[]) => {
    // Extract only the fields from ProfitInfo to save
    const cleanData: ProfitInfo[] = newData.map(({ brandCode, profit, profitByCp }) => ({
      brandCode: brandCode || '',
      profit: Number(profit) || 0,
      profitByCp: Number(profitByCp) || 0
    }));
    setProfits(cleanData);
  };

  const getUniqueCount = (key: keyof ProfitInfo) => {
    return new Set(profits.map(item => item[key]).filter(Boolean)).size;
  };

  const totalProfitSum = profits.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);

  // Map profits with associated sales data to calculate margin
  const enrichedProfits = useMemo<EnrichedProfitInfo[]>(() => {
    // Optimization: Create a map of sales lookup by brandCode only (since date is removed)
    const salesMap = new Map<string, number>();
    const salesByCpMap = new Map<string, number>();
    sales.forEach(s => {
      const key = s.brandCode || '';
      salesMap.set(key, (salesMap.get(key) || 0) + (Number(s.sales) || 0));
      salesByCpMap.set(key, (salesByCpMap.get(key) || 0) + (Number(s.salesByCp) || 0));
    });

    return profits.map(p => {
      const key = p.brandCode || '';
      const saleAmount = salesMap.get(key) || 0;
      const saleByCpAmount = salesByCpMap.get(key) || 0;
      
      let marginValue = 0;
      if (saleAmount !== 0) {
        marginValue = p.profit / saleAmount;
      }

      let marginByCpValue = 0;
      if (saleByCpAmount !== 0) {
        marginByCpValue = p.profitByCp / saleByCpAmount;
      }

      return {
        ...p,
        marginOutput: (
          <span className="font-mono text-brand-400">
            {(marginValue * 100).toFixed(0)}%
          </span>
        ),
        marginByCpOutput: (
          <span className="font-mono text-brand-400">
            {(marginByCpValue * 100).toFixed(0)}%
          </span>
        )
      };
    });
  }, [profits, sales]);

  const renderTextCell = React.useCallback((key: keyof ProfitInfo) => (val: any, row: ProfitInfo, updateRow: (newRow: ProfitInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(profits.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
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
  }, [profits]);

  const renderNumericCell = React.useCallback((key: keyof ProfitInfo) => (val: any, row: ProfitInfo, updateRow: (newRow: ProfitInfo) => void, isLocked: boolean) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [localVal, setLocalVal] = React.useState('');

    let displayValue = '';
    if (isFocused) {
      displayValue = localVal;
    } else {
      if (val === 0 || val === undefined || val === null || val === '') {
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
          setLocalVal(val === 0 || val === undefined || val === null ? '' : String(val));
        }}
        onBlur={() => {
          setIsFocused(false);
          const valStr = localVal.replace(/,/g, '');
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

  // Typescript workaround to let DataTable columns accept marginOutput
  const columns = React.useMemo(() => [
    { key: 'brandCode' as keyof EnrichedProfitInfo, label: 'Brand Code', summary: getUniqueCount('brandCode'), renderCell: renderTextCell('brandCode') },
    { 
      key: 'profit' as keyof EnrichedProfitInfo, 
      label: 'Profit', 
      summary: (
        <span className="flex items-center gap-1">
          {Number(totalProfitSum).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          <span className="text-[8px] opacity-60">VNĐ</span>
        </span>
      ),
      renderCell: renderNumericCell('profit')
    },
    { 
      key: 'profitByCp' as keyof EnrichedProfitInfo, 
      label: 'Profit by Cp', 
      summary: (
        <span className="flex items-center gap-1">
          {Number(profits.reduce((sum, p) => sum + (Number(p.profitByCp) || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          <span className="text-[8px] opacity-60">VNĐ</span>
        </span>
      ),
      renderCell: renderNumericCell('profitByCp')
    },
    { 
      key: 'marginOutput' as keyof EnrichedProfitInfo, 
      label: 'Margin'
    },
    { 
      key: 'marginByCpOutput' as keyof EnrichedProfitInfo, 
      label: 'Margin by CP'
    },
  ], [profits, totalProfitSum, renderTextCell, renderNumericCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['brand code', 'profit', 'profit by cp'],
    mapping: (row: any) => {
      const rawProfit = String(row['profit'] || row['Profit'] || '0');
      const rawProfitByCp = String(row['profit by cp'] || row['profitByCp'] || row['Profit by Cp'] || '0');
      
      const parseValue = (val: string) => {
        let clean = val.replace(/\s/g, '').replace(/,/g, '');
        return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
      };

      const parsedProfit = parseValue(rawProfit);
      const parsedProfitByCp = parseValue(rawProfitByCp);

      return {
        brandCode: row['brand code'] || row['brandCode'] || row['Brand Code'] || '',
        profit: (isNaN(parsedProfit) ? 0 : parsedProfit) / 1000,
        profitByCp: (isNaN(parsedProfitByCp) ? 0 : parsedProfitByCp) / 1000
      };
    }
  }), []);

  return (
    <DataTable
      title="Dữ Liệu Profit"
      description="Nhập liệu lợi nhuận và theo dõi tỷ suất Margin tự động"
      columns={columns as any}
      data={enrichedProfits}
      onDataChange={handleDataChange as any}
      importConfig={importConfig}
    />
  );
}
