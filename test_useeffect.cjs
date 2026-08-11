const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const effectCode = `  React.useEffect(() => {
    unitInfoRef.current = unitInfo;
    handleDataChangeRef.current = handleDataChange;
  }, [unitInfo, handleDataChange]);

  // AUTO-FILL BRAND NAMES FROM PROJECT STATUS
  React.useEffect(() => {
    if (!unitInfo.length || !projectStatus.length) return;
    
    let hasChanges = false;
    const updated = unitInfo.map(row => {
      if (row.unit && !row.brandName) {
         const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === row.unit.toLowerCase().trim());
         if (matchedProj && matchedProj.projectName) {
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
               return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
            } else {
               return { ...row, brandName: projName };
            }
         }
      }
      return row;
    });

    if (hasChanges) {
      setUnitInfo(updated);
    }
  }, [unitInfo, projectStatus, classInfo, setUnitInfo]);`;

code = code.replace(`  React.useEffect(() => {
    unitInfoRef.current = unitInfo;
    handleDataChangeRef.current = handleDataChange;
  }, [unitInfo, handleDataChange]);`, effectCode);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched');
