const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

// Add DailySalesProfitInfo to import
code = code.replace(
  "SalesInfo, ProfitInfo,", 
  "SalesInfo, ProfitInfo, DailySalesProfitInfo,"
);

// Add to DataContextType
code = code.replace(
  "profits: ProfitInfo[];",
  "profits: ProfitInfo[];\n  dailySalesProfits: DailySalesProfitInfo[];"
);

code = code.replace(
  "setProfits: (data: ProfitInfo[]) => void;",
  "setProfits: (data: ProfitInfo[]) => void;\n  setDailySalesProfits: (data: DailySalesProfitInfo[]) => void;"
);

// Add to initial state
code = code.replace(
  "profits: [],",
  "profits: [],\n  dailySalesProfits: [],"
);

// Add to actions
code = code.replace(
  "setProfits: (data) => set({ profits: data }),",
  "setProfits: (data) => set({ profits: data }),\n  setDailySalesProfits: (data) => set({ dailySalesProfits: data }),"
);

// find saveToHandlers
code = code.replace(
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors);",
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors);\n      idbSet('dailySalesProfits', get().dailySalesProfits);"
);

// wait, how does it load?
// in idbGet
code = code.replace(
  "const data = await idbGet('taka_data');",
  "const data = await idbGet('taka_data');\n        const dsp = await idbGet('dailySalesProfits');\n        if (dsp) set({ dailySalesProfits: dsp });"
);

fs.writeFileSync('src/DataContext.tsx', code);
