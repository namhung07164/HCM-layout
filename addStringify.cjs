const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

// Find JSON.stringify ({ ... profits: p, mdStatus: md ... })
code = code.replace(
  "profits: p,\n            mdStatus: md,",
  "profits: p,\n            dailySalesProfits: useDataStore.getState().dailySalesProfits,\n            mdStatus: md,"
);

fs.writeFileSync('src/DataContext.tsx', code);
