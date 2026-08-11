const fs = require('fs');

function patchFile(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    
    const oldLogic1 = `          let taskCodePhu = taskDef['Task code phá»¥'] || taskDef['Task code phụ'] || '';
          if (taskCodePhu !== undefined && taskCodePhu !== null && String(taskCodePhu).trim() !== '') {
             taskCodePhu = \`\${projCode}-\${taskCodePhu}\`;
          }`;
          
    const newLogic1 = `          const tcKey = Object.keys(taskDef).find(k => {
            const clean = k.toLowerCase().replace(/á»¥/g, 'ụ').replace(/\\s+/g, '');
            return clean.includes('taskcodeph');
          });
          let taskCodePhu = tcKey ? taskDef[tcKey] : '';
          if (taskCodePhu !== undefined && taskCodePhu !== null && String(taskCodePhu).trim() !== '') {
             taskCodePhu = projCode ? \`\${projCode}-\${String(taskCodePhu).trim()}\` : String(taskCodePhu).trim();
          }`;

    const oldLogic2 = `          let pred = taskDef['Predecessor'] || taskDef['predecessor'] || '';
          if (pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = \`\${projCode}-\${pred}\`;
          }`;
          
    const newLogic2 = `          const predKey = Object.keys(taskDef).find(k => k.toLowerCase().replace(/\\s+/g, '') === 'predecessor');
          let pred = predKey ? taskDef[predKey] : '';
          if (pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = projCode ? \`\${projCode}-\${String(pred).trim()}\` : String(pred).trim();
          }`;
          
    // Replace in previewData
    code = code.replace(oldLogic1, newLogic1);
    code = code.replace(oldLogic2, newLogic2);
    
    // Replace in exportData
    code = code.replace(oldLogic1, newLogic1);
    code = code.replace(oldLogic2, newLogic2);

    fs.writeFileSync(filename, code);
}

patchFile('src/components/CsvExportTab.tsx');
console.log('Done patching');
