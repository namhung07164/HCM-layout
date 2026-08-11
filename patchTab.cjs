const fs = require('fs');
let code = fs.readFileSync('src/components/DailySalesProfitTab.tsx', 'utf8');

const oldColumns = `  const columns = React.useMemo(() => [
    { key: 'date', label: 'Date', summary: getUniqueCount('date'), renderCell: renderTextCell('date') },
    { key: 'brandCode', label: 'Brand Code', summary: getUniqueCount('brandCode'), renderCell: renderTextCell('brandCode') },
    { key: 'brandName', label: 'Brand Name', summary: getUniqueCount('brandName'), renderCell: renderTextCell('brandName') },
    { 
      key: 'sales', 
      label: 'Sales', 
      summary: (
        <span className="flex items-center gap-1">
          {Number(totalSalesSum).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      ),
      renderCell: renderNumericCell('sales')
    },
    { 
      key: 'profit', 
      label: 'Profit', 
      summary: (
        <span className="flex items-center gap-1">
          {Number(totalProfitSum).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      ),
      renderCell: renderNumericCell('profit')
    },
    { 
      key: 'margin', 
      label: 'Margin', 
      summary: '',
      renderCell: (val: any) => (
        <div className="px-2 font-mono text-brand-400">
          {(Number(val) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%
        </div>
      )
    },
  ], [dailySalesProfits, totalSalesSum, totalProfitSum, renderTextCell, renderNumericCell]);`;

const newColumns = `  const columns = React.useMemo(() => [
    { 
      key: 'date', 
      label: 'Date', 
      summary: (filteredData: DailySalesProfitInfo[]) => new Set(filteredData.map(item => item.date).filter(Boolean)).size, 
      renderCell: renderTextCell('date') 
    },
    { 
      key: 'brandCode', 
      label: 'Brand Code', 
      summary: (filteredData: DailySalesProfitInfo[]) => new Set(filteredData.map(item => item.brandCode).filter(Boolean)).size, 
      renderCell: renderTextCell('brandCode') 
    },
    { 
      key: 'brandName', 
      label: 'Brand Name', 
      summary: (filteredData: DailySalesProfitInfo[]) => new Set(filteredData.map(item => item.brandName).filter(Boolean)).size, 
      renderCell: renderTextCell('brandName') 
    },
    { 
      key: 'sales', 
      label: 'Sales', 
      summary: (filteredData: DailySalesProfitInfo[]) => {
        const sum = filteredData.reduce((acc, item) => acc + (Number(item.sales) || 0), 0);
        return (
          <span className="flex items-center gap-1">
            {Number(sum).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        );
      },
      renderCell: renderNumericCell('sales')
    },
    { 
      key: 'profit', 
      label: 'Profit', 
      summary: (filteredData: DailySalesProfitInfo[]) => {
        const sum = filteredData.reduce((acc, item) => acc + (Number(item.profit) || 0), 0);
        return (
          <span className="flex items-center gap-1">
            {Number(sum).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        );
      },
      renderCell: renderNumericCell('profit')
    },
    { 
      key: 'margin', 
      label: 'Margin', 
      summary: (filteredData: DailySalesProfitInfo[]) => {
        const salesSum = filteredData.reduce((acc, item) => acc + (Number(item.sales) || 0), 0);
        const profitSum = filteredData.reduce((acc, item) => acc + (Number(item.profit) || 0), 0);
        const margin = salesSum !== 0 ? profitSum / salesSum : 0;
        return (
          <span className="flex items-center gap-1">
            {(margin * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%
          </span>
        );
      },
      renderCell: (val: any) => (
        <div className="px-2 font-mono text-brand-400">
          {(Number(val) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%
        </div>
      )
    },
  ], [renderTextCell, renderNumericCell]);`;

code = code.replace(oldColumns, newColumns);
fs.writeFileSync('src/components/DailySalesProfitTab.tsx', code);
