const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "triggerManualLoad: state.triggerManualLoad,",
  "triggerManualLoad: state.triggerManualLoad,\n    restoreBackup: state.restoreBackup,"
);

code = code.replace(
  "triggerManualLoad,",
  "triggerManualLoad,\n    restoreBackup,"
);

const oldButtons = `                          <button
                            onClick={() => triggerManualLoad()}
                            disabled={isLoading}
                            className="w-full flex items-center justify-between px-3 py-2 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            <div className="flex items-center gap-2">
                              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                              <span className="text-[10px] uppercase tracking-widest font-bold">Đọc Dữ Liệu (Từ Ổ D)</span>
                            </div>
                          </button>`;

const newButtons = `                          <button
                            onClick={() => triggerManualLoad()}
                            disabled={isLoading}
                            className="w-full flex items-center justify-between px-3 py-2 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            <div className="flex items-center gap-2">
                              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                              <span className="text-[10px] uppercase tracking-widest font-bold">Đọc Dữ Liệu (Từ Ổ D)</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => restoreBackup()}
                            disabled={isLoading}
                            className="w-full flex items-center justify-between px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
                          >
                            <div className="flex items-center gap-2">
                              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                              <span className="text-[10px] uppercase tracking-widest font-bold">Khôi phục (Từ Backup v1)</span>
                            </div>
                          </button>`;

code = code.replace(oldButtons, newButtons);
fs.writeFileSync('src/App.tsx', code);
