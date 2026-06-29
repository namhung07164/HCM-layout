const fs = require('fs');
let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace(/setSpreadsheetIdState\(([^)]+)\)/g, 'set({ spreadsheetId: $1 })');
content = content.replace(/setSpreadsheetId\(([^)]+)\)/g, 'set({ spreadsheetId: $1 })'); // just in case

// Find where DataProvider defines variables from state
content = content.replace(
  /const \{\s*units,\s*unitInfo,\s*classInfo,\s*isLoading,\s*isSaving,\s*lastBackup,\s*hasLocalFolder,\s*needsPermission,\s*spreadsheetId,\s*isAppLocked,\s*reviewSelectedLabels\s*\} = state;/g,
  `const { 
      units, 
      unitInfo, 
      classInfo,
      actualClassInfo,
      sales,
      profits,
      mdStatus,
      subFees,
      projectStatus,
      projectLink,
      basePlan,
      mapUnits,
      mapVersions,
      activeMapVersionId,
      isLoading,
      isSaving,
      lastBackup,
      hasLocalFolder,
      needsPermission,
      spreadsheetId,
      isAppLocked,
      reviewSelectedLabels
  } = state;`
);

fs.writeFileSync('src/DataContext.tsx', content);
