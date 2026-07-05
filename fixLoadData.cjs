const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

code = code.replace(
  "if (parsed.actualClassInfo) set({ actualClassInfo: parsed.actualClassInfo });",
  "if (parsed.actualClassInfo) set({ actualClassInfo: parsed.actualClassInfo });\n      if (parsed.dailySalesProfits) set({ dailySalesProfits: parsed.dailySalesProfits });"
);

code = code.replace(
  "set({ activeMapVersionId: data.activeMapVersionId || null });",
  "set({ activeMapVersionId: data.activeMapVersionId || null });\n        if (data.dailySalesProfits) set({ dailySalesProfits: data.dailySalesProfits });"
);

fs.writeFileSync('src/DataContext.tsx', code);
