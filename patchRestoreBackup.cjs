const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

const oldInterface = `  triggerManualBackup: () => Promise<void>;
  triggerManualLoad: () => Promise<void>;
  selectLocalFolder: () => Promise<void>;`;

const newInterface = `  triggerManualBackup: () => Promise<void>;
  triggerManualLoad: () => Promise<void>;
  restoreBackup: () => Promise<void>;
  selectLocalFolder: () => Promise<void>;`;

code = code.replace(oldInterface, newInterface);

const oldInit = `  triggerManualBackup: async () => {}, // injected
  triggerManualLoad: async () => {}, // injected
  selectLocalFolder: async () => {}, // injected`;

const newInit = `  triggerManualBackup: async () => {}, // injected
  triggerManualLoad: async () => {}, // injected
  restoreBackup: async () => {}, // injected
  selectLocalFolder: async () => {}, // injected`;

code = code.replace(oldInit, newInit);

const oldLoadFunc = `  // Load data from a given handle
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
          }`;

const newLoadFunc = `  // Load data from a given handle
  async function loadFromHandle(handle: any, forceFileName?: string) {
    try {
      let parsed: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          let fileHandle;
          if (forceFileName) {
            fileHandle = await handle.getFileHandle(forceFileName);
          } else {
            try {
              fileHandle = await handle.getFileHandle(\`SheetSyncData_\${store}.json\`);
            } catch (err) {
              if (store === 'HCM') {
                  fileHandle = await handle.getFileHandle('SheetSyncData.json');
              } else {
                  throw err;
              }
            }
          }`;

code = code.replace(oldLoadFunc, newLoadFunc);

const restoreFunc = `  const restoreBackup = async () => {
    if (!dirHandleRef.current) {
        alert("Chưa chọn thư mục nào!");
        return;
    }
    const isPermitted = await verifyPermission(dirHandleRef.current, true);
    if (!isPermitted) {
         alert("Bạn cần cấp quyền truy cập lại cho thư mục này.");
         return;
    }
    
    set({ isLoading: true });
    try {
      const backupFile = \`SheetSyncData_\${store}_v1.json\`;
      const loaded = await loadFromHandle(dirHandleRef.current, backupFile);
      if (loaded) {
          alert(\`Khôi phục thành công từ file \${backupFile}!\`);
      } else {
          alert(\`Không tìm thấy file backup (\${backupFile}) hoặc dữ liệu bị lỗi.\`);
      }
    } catch(err: any) {
        console.error(err);
        alert('Lỗi khi khôi phục dữ liệu: ' + err.message);
    } finally {
        set({ isLoading: false });
    }
  };`;

code = code.replace(
  "  const triggerManualLoad = async () => {",
  restoreFunc + "\n\n  const triggerManualLoad = async () => {"
);

const oldUseEffectReturn = `    set({
      triggerManualLoad,
      triggerManualBackup,
      selectLocalFolder,
      requestFolderPermission,
      syncWithGoogleSheets
    });`;

const newUseEffectReturn = `    set({
      triggerManualLoad,
      triggerManualBackup,
      restoreBackup,
      selectLocalFolder,
      requestFolderPermission,
      syncWithGoogleSheets
    });`;

code = code.replace(oldUseEffectReturn, newUseEffectReturn);

fs.writeFileSync('src/DataContext.tsx', code);
