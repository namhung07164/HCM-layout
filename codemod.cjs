const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
}

const files = walkSync('src');

files.forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if useData is used
    if (content.includes('useData()') || content.includes('useData }')) {
        let modified = false;

        // Find const { ... } = useData();
        const regex1 = /const\s+\{([\s\S]*?)\}\s*=\s*useData\(\)\s*;/g;
        content = content.replace(regex1, (match, group1) => {
            modified = true;
            const vars = group1.split(',').map(v => v.trim()).filter(v => v.length > 0);
            
            let newHookCall = `const { ${group1} } = useDataStore(useShallow(state => ({\n`;
            vars.forEach(v => {
                if (v.includes(':')) {
                    const parts = v.split(':').map(p => p.trim());
                    newHookCall += `    ${parts[0]}: state.${parts[0]},\n`; 
                } else {
                    newHookCall += `    ${v}: state.${v},\n`;
                }
            });
            newHookCall += `  })));`;
            return newHookCall;
        });
        
        // Also handle "const dataContext = useData();"
        const regex2 = /const\s+([a-zA-Z0-9_]+)\s*=\s*useData\(\)\s*;/g;
        content = content.replace(regex2, (match, varName) => {
            modified = true;
            return `const ${varName} = useDataStore();`;
        });
        
        if (modified) {
            // Determine path to DataContext
            const depth = file.split('/').length - 2; // src/App.tsx -> depth 0, src/components/A.tsx -> depth 1
            const relPath = depth === 0 ? './DataContext' : '../'.repeat(depth) + 'DataContext';
            
            // Replace old import
            content = content.replace(/import\s+\{([^}]*?)useData([^}]*?)\}\s+from\s+['"][^'"]+DataContext['"];?/, (full, before, after) => {
                const othersList = [before, after].join(',').split(',').map(x => x.trim()).filter(x => x && x !== 'useData');
                if (othersList.length > 0) {
                    const others = othersList.join(', ');
                    return `import { ${others}, useDataStore } from '${relPath}';`;
                } else {
                    return `import { useDataStore } from '${relPath}';`;
                }
            });
            
            if (!content.includes('useShallow') && content.includes('useShallow(')) {
                // Insert after last import
                content = `import { useShallow } from 'zustand/react/shallow';\n` + content;
            }
            
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    }
  }
});
