const fs = require('fs');

let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

// Find stringSimilarity function end
const helperStart = `
  const autofillBrandName = (row: UnitInfo, targetUnit: string): UnitInfo => {
      const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(targetUnit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(targetUnit)));
      const projName = matchedProj?.projectName?.trim();

      const isBrandEmpty = (!row.brandName || row.brandName.trim() === '' || row.brandName === '-');
      const isProjectNameNew = projName && row._lastProjectName && row._lastProjectName !== projName;

      if (projName && (isBrandEmpty || isProjectNameNew)) {
         let bestSim = 0;
         let bestClassInfo = null;
         classInfo.forEach(ci => {
            if (ci.brandName) {
              const sim = stringSimilarity(projName, ci.brandName);
              if (sim > bestSim) {
                bestSim = sim;
                bestClassInfo = ci;
              }
            }
         });
         
         if (bestClassInfo && bestSim > 0.4) {
            return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode, _lastProjectName: projName };
         } else {
            return { ...row, brandName: projName, _lastProjectName: projName };
         }
      }
      
      if (projName && !isBrandEmpty && row._lastProjectName !== projName) {
         return { ...row, _lastProjectName: projName };
      }
      
      return row;
  };
`;

// Insert it right before handleDataChange
code = code.replace('const handleDataChange =', helperStart + '\n  const handleDataChange =');

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('injected helper');
