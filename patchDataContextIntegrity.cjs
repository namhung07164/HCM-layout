const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

const utilsToAdd = `
  async function checkFilePermissions(handle: any): Promise<boolean> {
    try {
      const testFile = await handle.getFileHandle('.__perm_check.tmp', { create: true });
      const writable = await testFile.createWritable();
      await writable.write('test');
      await writable.close();
      const file = await testFile.getFile();
      const text = await file.text();
      await handle.removeEntry('.__perm_check.tmp');
      return text === 'test';
    } catch (e) {
      console.warn('File system permission check failed:', e);
      return false;
    }
  }

  async function validateBackupIntegrity(handle: any, fileName: string): Promise<boolean> {
    for (let i = 0; i < 3; i++) {
        try {
            const fileHandle = await handle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const text = await file.text();
            if (!text || text.trim() === '') {
                throw new Error("File is empty");
            }
            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error("Invalid JSON structure");
            }
            return true;
        } catch (err) {
            console.warn(\`Integrity check failed for \${fileName} (attempt \${i + 1}/3):\`, err);
            await new Promise(res => setTimeout(res, 500)); // wait before retry
        }
    }
    return false;
  }
`;

code = code.replace(
  "  // Verify permission for a directory handle",
  utilsToAdd + "\n  // Verify permission for a directory handle"
);

// Update loadFromHandle to use retry mechanism
const oldLoadFromHandle = `  // Load data from a given handle
  async function loadFromHandle(handle: any) {
    try {
      let fileHandle;
      try {
        fileHandle = await handle.getFileHandle(\`SheetSyncData_\${store}.json\`);
      } catch (err) {
        if (store === 'HCM') {
            try {
                fileHandle = await handle.getFileHandle('SheetSyncData.json');
                console.log("Found legacy SheetSyncData.json for HCM, will use it.");
            } catch (fallbackErr) {
                throw err;
            }
        } else {
            throw err;
        }
      }
      
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);`;

const newLoadFromHandle = `  // Load data from a given handle
  async function loadFromHandle(handle: any) {
    try {
      let parsed: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          let fileHandle;
          try {
            fileHandle = await handle.getFileHandle(\`SheetSyncData_\${store}.json\`);
          } catch (err) {
            if (store === 'HCM') {
                fileHandle = await handle.getFileHandle('SheetSyncData.json');
            } else {
                throw err;
            }
          }
          const file = await fileHandle.getFile();
          const text = await file.text();
          if (!text || text.trim() === '') throw new Error("File is empty");
          parsed = JSON.parse(text);
          break; // success
        } catch (err) {
          console.warn(\`Load attempt \${attempt + 1} failed for \${store}:\`, err);
          if (attempt === 2) throw err;
          await new Promise(res => setTimeout(res, 500));
        }
      }`;

code = code.replace(oldLoadFromHandle, newLoadFromHandle);

const oldSharedHandle = `      try {
        const sharedHandle = await handle.getFileHandle('SheetSyncData_Shared.json');
        const sharedFile = await sharedHandle.getFile();
        const sharedText = await sharedFile.text();
        const sharedParsed = JSON.parse(sharedText);`;

const newSharedHandle = `      try {
        let sharedParsed: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const sharedHandle = await handle.getFileHandle('SheetSyncData_Shared.json');
            const sharedFile = await sharedHandle.getFile();
            const sharedText = await sharedFile.text();
            if (sharedText && sharedText.trim() !== '') {
               sharedParsed = JSON.parse(sharedText);
            }
            break;
          } catch (err: any) {
            if (err.name === 'NotFoundError') throw err;
            console.warn(\`Shared file load attempt \${attempt + 1} failed:\`, err);
            if (attempt === 2) throw err;
            await new Promise(res => setTimeout(res, 300));
          }
        }`;

code = code.replace(oldSharedHandle, newSharedHandle);

// Now update saveToHandlers to use checkFilePermissions and validateBackupIntegrity
code = code.replace(
  "        if (hasPerm) {",
  "        const canWrite = await checkFilePermissions(activeHandle);\n        if (hasPerm && canWrite) {"
);

code = code.replace(
  "               throw new Error(\"move_not_supported\"); // Trigger fallback\n            }",
  "               throw new Error(\"move_not_supported\"); // Trigger fallback\n            }\n            \n            const isIntact = await validateBackupIntegrity(activeHandle, targetFile);\n            if (!isIntact) throw new Error(\"Integrity check failed after rename\");"
);

code = code.replace(
  "            await targetWritable.close();\n            try { await activeHandle.removeEntry(tempFile); } catch(e) {}",
  "            await targetWritable.close();\n            try { await activeHandle.removeEntry(tempFile); } catch(e) {}\n            \n            const isIntact = await validateBackupIntegrity(activeHandle, targetFile);\n            if (!isIntact) throw new Error(\"Integrity check failed after write fallback\");"
);

fs.writeFileSync('src/DataContext.tsx', code);
