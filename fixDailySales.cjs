const fs = require('fs');
let code = fs.readFileSync('src/components/DailySalesProfitTab.tsx', 'utf8');

// 1. Update handleDataChange
code = code.replace(
  "const cleanData: DailySalesProfitInfo[] = newData.map(({ date, brandCode, brandName, sales, profit, margin }) => ({\n      date: date || '',\n      brandCode: brandCode || '',\n      brandName: brandName || '',\n      sales: Number(sales) || 0,\n      profit: Number(profit) || 0,\n      margin: Number(margin) || 0\n    }));",
  "const cleanData: DailySalesProfitInfo[] = newData.map(({ date, brandCode, brandName, sales, profit }) => {\n      const s = Number(sales) || 0;\n      const p = Number(profit) || 0;\n      return {\n        date: date || '',\n        brandCode: brandCode || '',\n        brandName: brandName || '',\n        sales: s,\n        profit: p,\n        margin: s !== 0 ? p / s : 0\n      };\n    });"
);

// 2. Change display format to 0 decimals for sales and profit in renderNumericCell
code = code.replace(
  "displayValue = Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });",
  "displayValue = Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });"
);

// 3. Update summary format for sales
code = code.replace(
  "{Number(totalSalesSum).toLocaleString('en-US', { maximumFractionDigits: 2 })}",
  "{Number(totalSalesSum).toLocaleString('en-US', { maximumFractionDigits: 0 })}"
);

// 4. Update summary format for profit
code = code.replace(
  "{Number(totalProfitSum).toLocaleString('en-US', { maximumFractionDigits: 2 })}",
  "{Number(totalProfitSum).toLocaleString('en-US', { maximumFractionDigits: 0 })}"
);

// 5. Make margin read-only and formatted properly
code = code.replace(
  "renderCell: renderNumericCell('margin', true)",
  "renderCell: (val: any) => (\n        <div className=\"px-2 font-mono text-brand-400\">\n          {(Number(val) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%\n        </div>\n      )"
);

// 6. Fix mapping in importConfig to also compute margin
code = code.replace(
  "margin: isNaN(parsedMargin) ? 0 : parsedMargin",
  "margin: (isNaN(parsedSales) || parsedSales === 0) ? 0 : (isNaN(parsedProfit) ? 0 : parsedProfit / parsedSales)"
);

fs.writeFileSync('src/components/DailySalesProfitTab.tsx', code);
