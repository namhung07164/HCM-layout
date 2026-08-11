const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

code = code.replace(
  "if (results['MD Status'])",
  "if (results['Daily Sales & Profit']) {\n        const dsData = parseSheetData(results['Daily Sales & Profit']);\n        set({ dailySalesProfits: dsData.map((d: any) => ({\n          ...d,\n          sales: Number(d.sales) || 0,\n          profit: Number(d.profit) || 0,\n          margin: Number(d.margin) || 0\n        })) });\n      }\n      if (results['MD Status'])"
);

fs.writeFileSync('src/DataContext.tsx', code);
