const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');
code = code.replace("      idbSet('dailySalesProfits', useDataStore.getState().dailySalesProfits);\n", "");
fs.writeFileSync('src/DataContext.tsx', code);
