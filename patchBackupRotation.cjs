const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

const backupLogic = `
  async function rotateBackups(handle: any, baseName: string) {
    try {
      for (let i = 2; i >= 1; i--) {
        const srcName = \`\${baseName}_v\${i}.json\`;
        const destName = \`\${baseName}_v\${i+1}.json\`;
        try {
          const srcHandle = await handle.getFileHandle(srcName);
          const file = await srcHandle.getFile();
          const text = await file.text();
          
          try { await handle.removeEntry(destName); } catch(e) {}
          const destHandle = await handle.getFileHandle(destName, { create: true });
          const destWritable = await destHandle.createWritable();
          await destWritable.write(text);
          await destWritable.close();
        } catch (e) {} // Ignore if src doesn't exist
      }
      
      // Main file to v1
      try {
        const mainHandle = await handle.getFileHandle(\`\${baseName}.json\`);
        const file = await mainHandle.getFile();
        const text = await file.text();
        
        try { await handle.removeEntry(\`\${baseName}_v1.json\`); } catch(e) {}
        const v1Handle = await handle.getFileHandle(\`\${baseName}_v1.json\`, { create: true });
        const v1Writable = await v1Handle.createWritable();
        await v1Writable.write(text);
        await v1Writable.close();
      } catch (e) {}
    } catch (err) {
      console.warn("Backup rotation failed", err);
    }
  }
`;

code = code.replace(
  "  async function checkFilePermissions",
  backupLogic + "\n  async function checkFilePermissions"
);

// Now inside the save logic
code = code.replace(
  "          const targetFile = `SheetSyncData_${store}.json`;\n          const tempFile = `.__tmp_${targetFile}`;",
  "          const baseName = `SheetSyncData_${store}`;\n          const targetFile = `${baseName}.json`;\n          const tempFile = `.__tmp_${targetFile}`;"
);

code = code.replace(
  "          let saveSuccess = false;\n          try {",
  "          let saveSuccess = false;\n          try {\n            await rotateBackups(activeHandle, baseName);"
);

// We should also do this for Shared if needed, but let's just do it for both if requested? "keep the last 3 versions of the data files". It applies to both.
code = code.replace(
  "            const targetSharedFile = 'SheetSyncData_Shared.json';",
  "            const sharedBaseName = 'SheetSyncData_Shared';\n            const targetSharedFile = `${sharedBaseName}.json`;"
);

code = code.replace(
  "            let sharedSaveSuccess = false;\n            try {",
  "            let sharedSaveSuccess = false;\n            try {\n              await rotateBackups(activeHandle, sharedBaseName);"
);

fs.writeFileSync('src/DataContext.tsx', code);
