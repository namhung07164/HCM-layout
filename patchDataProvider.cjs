const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

code = code.replace(
  "profits,",
  "profits,\n      dailySalesProfits,"
);

code = code.replace(
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors);",
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors);\n      idbSet('dailySalesProfits', dailySalesProfits);"
);

code = code.replace(
  "  }, [classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors]);",
  "  }, [classInfo, actualClassInfo, sales, unitInfo, profits, dailySalesProfits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors]);"
);

fs.writeFileSync('src/DataContext.tsx', code);
