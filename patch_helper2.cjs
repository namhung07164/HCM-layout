const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldHelper = `  const autofillBrandName = (row: UnitInfo, targetUnit: string): UnitInfo => {
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
  };`;

const newHelper = `  const autofillBrandName = (row: UnitInfo, targetUnit: string): UnitInfo => {
      const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(targetUnit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(targetUnit)));
      const projName = matchedProj?.projectName?.trim();

      // If no project name is found, do nothing (do not clear existing brandName)
      if (!projName) return row;

      const isBrandEmpty = (!row.brandName || row.brandName.trim() === '' || row.brandName === '-');
      // It's a "new" project name if it differs from what we last tracked.
      const isProjectNameNew = row._lastProjectName !== projName;

      if (isBrandEmpty || isProjectNameNew) {
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
      
      return row;
  };`;

code = code.replace(oldHelper, newHelper);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched helper 2');
