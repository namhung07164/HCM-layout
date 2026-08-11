const fs = require('fs');

let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldLogic = `  const handleDataChange = (newData: UnitInfo[]) => {
    let finalData = [...newData];
    const unitsMap = new Map<string, UnitInfo[]>();`;

const newLogic = `  const handleDataChange = (newData: UnitInfo[]) => {
    let finalData = [...newData].map(row => {
       // AUTOFILL BRAND NAME IF EMPTY
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
            if (bestClassInfo && bestSim > 0.4) {
               return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
            } else {
               return { ...row, brandName: projName };
            }
         }
       }
       return row;
    });
    
    const unitsMap = new Map<string, UnitInfo[]>();`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched');
