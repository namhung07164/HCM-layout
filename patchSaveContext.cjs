const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

code = code.replace(
  "profits: p,",
  "profits: p,\n          dailySalesProfits: useDataStore.getState().dailySalesProfits,"
);

code = code.replace(
  "profits: p,",
  "profits: p,\n          dailySalesProfits: useDataStore.getState().dailySalesProfits,"
);

fs.writeFileSync('src/DataContext.tsx', code);
