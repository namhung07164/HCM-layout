const fs = require('fs');

let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldLogic = `          if (finalUnitName) {
            const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === finalUnitName.toLowerCase().trim());
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
              if (bestClassInfo && bestSim > 0.4) { // Minimum similarity threshold
                 bestBrandMatch = bestClassInfo.brandName;
                 bestBrandCode = bestClassInfo.brandCode;
              } else if (!bestBrandMatch && projName) {
                 bestBrandMatch = projName;
              }
            }
          }`;

const newLogic = `          if (finalUnitName) {
            const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === finalUnitName.toLowerCase().trim());
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
              
              // First take project name, then if we find a good match in classInfo, use that instead.
              if (bestClassInfo && bestSim > 0.4) {
                 bestBrandMatch = bestClassInfo.brandName;
                 bestBrandCode = bestClassInfo.brandCode;
              } else {
                 bestBrandMatch = projName;
              }
            }
          }`;

code = code.split(oldLogic).join(newLogic);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched');
