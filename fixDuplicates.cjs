const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');
code = code.replace(/profits: p,\n            dailySalesProfits: useDataStore.getState\(\)\.dailySalesProfits,\n            dailySalesProfits: useDataStore.getState\(\)\.dailySalesProfits,\n          dailySalesProfits: useDataStore.getState\(\)\.dailySalesProfits,\n          dailySalesProfits: useDataStore.getState\(\)\.dailySalesProfits,/g, 'profits: p,\n          dailySalesProfits: useDataStore.getState().dailySalesProfits,');
fs.writeFileSync('src/DataContext.tsx', code);
