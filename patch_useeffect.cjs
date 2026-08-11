const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldEffect = `  // AUTO-FILL BRAND NAMES FROM PROJECT STATUS
  React.useEffect(() => {
    if (!unitInfo.length || !projectStatus.length) return;
    
    let hasChanges = false;
    console.group("UnitInfoTab Auto-fill Debugging (Effect)");
    const updated = unitInfo.map(row => {
      if (row.unit && (!row.brandName || row.brandName.trim() === '' || row.brandName === '-')) {
         console.log(\`Evaluating row with unit '\${row.unit}' (brandName is empty)\`);
         const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(row.unit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(row.unit)));
         if (matchedProj) {
            console.log(\`Found matching project for unit '\${row.unit}':\`, matchedProj);
            if (matchedProj.projectName) {
              const projName = matchedProj.projectName;
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
              hasChanges = true;
              if (bestClassInfo && bestSim > 0.4) {
                 console.log(\`-> Best class match: '\${bestClassInfo.brandName}' (similarity: \${bestSim})\`);
                 return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
              } else {
                 console.log(\`-> No sufficient class match. Using projName: '\${projName}'\`);
                 return { ...row, brandName: projName };
              }
            } else {
               console.log(\`-> Matched project has no projectName.\`);
            }
         } else {
            console.log(\`No matching project found for unit '\${row.unit}' in projectStatus dataset.\`);
         }
      }
      return row;
    });
    console.groupEnd();

    if (hasChanges) {
      setUnitInfo(updated);
    }
  }, [unitInfo, projectStatus, classInfo, setUnitInfo]);`;

const newEffect = `  // AUTO-FILL BRAND NAMES FROM PROJECT STATUS
  React.useEffect(() => {
    if (!unitInfo.length || !projectStatus.length) return;
    
    let hasChanges = false;
    const updated = unitInfo.map(row => {
      if (row.unit) {
         const newRow = autofillBrandName(row, row.unit);
         if (newRow !== row) {
             hasChanges = true;
         }
         return newRow;
      }
      return row;
    });

    if (hasChanges) {
      setUnitInfo(updated);
    }
  }, [unitInfo, projectStatus, classInfo, setUnitInfo]);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched useEffect');
