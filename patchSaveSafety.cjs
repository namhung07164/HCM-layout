const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

const oldSaveLogic = `          // Write to temp file then rename to bypass Chrome network drive timestamp mismatch bugs
          try {
            try { await activeHandle.removeEntry(tempFile); } catch(e) {}
            const tempFileHandle = await activeHandle.getFileHandle(tempFile, { create: true });
            const tempWritable = await tempFileHandle.createWritable();
            await tempWritable.write(jsonPayload);
            await tempWritable.close();

            // Try to move/rename
            if (typeof (tempFileHandle as any).move === 'function') {
               try { await activeHandle.removeEntry(targetFile); } catch(e) {}
               await (tempFileHandle as any).move(targetFile);
            } else {
               throw new Error("move_not_supported"); // Trigger fallback
            }
            
            const isIntact = await validateBackupIntegrity(activeHandle, targetFile);
            if (!isIntact) throw new Error("Integrity check failed after rename");
          } catch(err: any) {
            // Fallback for older browsers
            try { await activeHandle.removeEntry(targetFile); } catch(e) {}
            const targetHandle = await activeHandle.getFileHandle(targetFile, { create: true });
            const targetWritable = await targetHandle.createWritable();
            await targetWritable.write(jsonPayload);
            await targetWritable.close();
            try { await activeHandle.removeEntry(tempFile); } catch(e) {}
            
            const isIntact = await validateBackupIntegrity(activeHandle, targetFile);
            if (!isIntact) throw new Error("Integrity check failed after write fallback");
          }`;

const newSaveLogic = `          let saveSuccess = false;
          try {
            try { await activeHandle.removeEntry(tempFile); } catch(e) {}
            const tempFileHandle = await activeHandle.getFileHandle(tempFile, { create: true });
            const tempWritable = await tempFileHandle.createWritable();
            await tempWritable.write(jsonPayload);
            await tempWritable.close();

            try {
              if (typeof (tempFileHandle as any).move === 'function') {
                await (tempFileHandle as any).move(targetFile);
                saveSuccess = true;
              } else {
                throw new Error("move not supported");
              }
            } catch (moveErr) {
               // Fallback: write directly without removing the original file first to prevent data loss
               const targetHandle = await activeHandle.getFileHandle(targetFile, { create: true });
               const targetWritable = await targetHandle.createWritable();
               await targetWritable.write(jsonPayload);
               await targetWritable.close();
               saveSuccess = true;
            }
            
            if (saveSuccess) {
               try { await activeHandle.removeEntry(tempFile); } catch(e) {}
               const isIntact = await validateBackupIntegrity(activeHandle, targetFile);
               if (!isIntact) throw new Error("Integrity check failed after write");
            }
          } catch(err: any) {
             throw new Error("Local save failed: " + err.message);
          }`;

code = code.replace(oldSaveLogic, newSaveLogic);

const oldSharedSaveLogic = `          try {
            const targetSharedFile = 'SheetSyncData_Shared.json';
            const tempSharedFile = \`.__tmp_\${targetSharedFile}\`;
            const sharedPayload = JSON.stringify({
              classInfo: c,
              actualClassInfo: ac
            });

            try {
              try { await activeHandle.removeEntry(tempSharedFile); } catch(e) {}
              const tempSharedHandle = await activeHandle.getFileHandle(tempSharedFile, { create: true });
              const tempSharedWritable = await tempSharedHandle.createWritable();
              await tempSharedWritable.write(sharedPayload);
              await tempSharedWritable.close();

              if (typeof (tempSharedHandle as any).move === 'function') {
                 try { await activeHandle.removeEntry(targetSharedFile); } catch(e) {}
                 await (tempSharedHandle as any).move(targetSharedFile);
              } else {
                 throw new Error("move_not_supported");
              }
            } catch(err: any) {
              try { await activeHandle.removeEntry(targetSharedFile); } catch(e) {}
              const targetSharedHandle = await activeHandle.getFileHandle(targetSharedFile, { create: true });
              const targetSharedWritable = await targetSharedHandle.createWritable();
              await targetSharedWritable.write(sharedPayload);
              await targetSharedWritable.close();
              try { await activeHandle.removeEntry(tempSharedFile); } catch(e) {}
            }
          } catch(e) {
            console.warn('Failed to save shared data locally', e);
          }`;

const newSharedSaveLogic = `          try {
            const targetSharedFile = 'SheetSyncData_Shared.json';
            const tempSharedFile = \`.__tmp_\${targetSharedFile}\`;
            const sharedPayload = JSON.stringify({
              classInfo: c,
              actualClassInfo: ac
            });

            let sharedSaveSuccess = false;
            try {
              try { await activeHandle.removeEntry(tempSharedFile); } catch(e) {}
              const tempSharedHandle = await activeHandle.getFileHandle(tempSharedFile, { create: true });
              const tempSharedWritable = await tempSharedHandle.createWritable();
              await tempSharedWritable.write(sharedPayload);
              await tempSharedWritable.close();

              try {
                if (typeof (tempSharedHandle as any).move === 'function') {
                  await (tempSharedHandle as any).move(targetSharedFile);
                  sharedSaveSuccess = true;
                } else {
                  throw new Error("move not supported");
                }
              } catch (moveErr) {
                 const targetSharedHandle = await activeHandle.getFileHandle(targetSharedFile, { create: true });
                 const targetSharedWritable = await targetSharedHandle.createWritable();
                 await targetSharedWritable.write(sharedPayload);
                 await targetSharedWritable.close();
                 sharedSaveSuccess = true;
              }
              
              if (sharedSaveSuccess) {
                 try { await activeHandle.removeEntry(tempSharedFile); } catch(e) {}
                 const isIntact = await validateBackupIntegrity(activeHandle, targetSharedFile);
                 if (!isIntact) throw new Error("Integrity check failed for shared file");
              }
            } catch(err: any) {
              throw err;
            }
          } catch(e) {
            console.warn('Failed to save shared data locally', e);
          }`;

code = code.replace(oldSharedSaveLogic, newSharedSaveLogic);

fs.writeFileSync('src/DataContext.tsx', code);
