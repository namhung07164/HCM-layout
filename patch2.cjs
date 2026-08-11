const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldHandle = `       // AUTOFILL BRAND NAME IF EMPTY
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
       }`;

const newHandle = `       // AUTOFILL BRAND NAME IF EMPTY
       if (row.unit && !row.brandName) {
         console.group(\`handleDataChange Auto-fill Debugging (\${row.unit})\`);
         const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === row.unit.toLowerCase().trim());
         if (matchedProj) {
            console.log(\`Found matching project:\`, matchedProj);
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
              
              if (bestClassInfo && bestSim > 0.4) {
                 console.log(\`-> Best class match: '\${bestClassInfo.brandName}' (similarity: \${bestSim})\`);
                 console.groupEnd();
                 return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
              } else {
                 console.log(\`-> No sufficient class match. Using projName: '\${projName}'\`);
                 console.groupEnd();
                 return { ...row, brandName: projName };
              }
            }
         } else {
            console.log(\`No matching project found for unit '\${row.unit}'\`);
         }
         console.groupEnd();
       }`;

code = code.replace(oldHandle, newHandle);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched2');
