import re

with open('src/components/CsvExportTab.tsx', 'r') as f:
    code = f.read()

# Add keepOriginal state
keep_original_state = """  const [keepOriginal, setKeepOriginal] = useState<Record<string, boolean>>(() => {
    const saved = safeGetStorage(`taka_keeporiginal_project`);
    const parsed = safeJSONParse(saved);
    return TAB_CONFIG['project'].columns.reduce((acc: any, col: string) => ({ ...acc, [col]: !!parsed[col] }), {});
  });"""

code = code.replace("  const [constantMapping, setConstantMapping] = useState<Record<string, string>>(() => {", keep_original_state + "\n\n  const [constantMapping, setConstantMapping] = useState<Record<string, string>>(() => {")

# Update switchTab to reset keepOriginal
switch_tab_update = """    const parsedConstant = safeJSONParse(savedConstant);
    setConstantMapping(TAB_CONFIG[tabId].columns.reduce((acc: any, col: string) => {
      let val = parsedConstant[col];
      if (val === undefined || (!savedConstant)) {
        val = col === 'delegation' ? 'true' : (val || '');
      }
      return { ...acc, [col]: val };
    }, {}));
    
    const savedKeepOriginal = safeGetStorage(`taka_keeporiginal_${tabId}`);
    const parsedKeepOriginal = safeJSONParse(savedKeepOriginal);
    setKeepOriginal(TAB_CONFIG[tabId].columns.reduce((acc: any, col: string) => ({ ...acc, [col]: !!parsedKeepOriginal[col] }), {}));"""

code = code.replace("""    const parsedConstant = safeJSONParse(savedConstant);
    setConstantMapping(TAB_CONFIG[tabId].columns.reduce((acc: any, col: string) => {
      let val = parsedConstant[col];
      if (val === undefined || (!savedConstant)) {
        val = col === 'delegation' ? 'true' : (val || '');
      }
      return { ...acc, [col]: val };
    }, {}));""", switch_tab_update)

# Update handleSaveMapping to save keepOriginal
save_mapping_update = """  const handleSaveMapping = () => {
    localStorage.setItem(`taka_mapping_${activeTab}`, JSON.stringify(mapping));
    localStorage.setItem(`taka_constant_${activeTab}`, JSON.stringify(constantMapping));
    localStorage.setItem(`taka_keeporiginal_${activeTab}`, JSON.stringify(keepOriginal));
    localStorage.setItem(`taka_locked_${activeTab}`, 'true');"""

code = code.replace("""  const handleSaveMapping = () => {
    localStorage.setItem(`taka_mapping_${activeTab}`, JSON.stringify(mapping));
    localStorage.setItem(`taka_constant_${activeTab}`, JSON.stringify(constantMapping));
    localStorage.setItem(`taka_locked_${activeTab}`, 'true');""", save_mapping_update)

# Now, we need to find where keepOriginal is used in getCellValue
# getCellValue logic for predecessor
code = code.replace("""    if (activeTab === 'task' && colName.toLowerCase() === 'predecessor') {""", """    if (activeTab === 'task' && colName.toLowerCase() === 'predecessor' && !keepOriginal[colName]) {""")

code = code.replace("""    if ((activeTab === 'task' && (colName === 'start' || colName === 'finish')) || 
         (activeTab === 'sales' && colName === 'date') || 
         (activeTab === 'profit' && colName === 'date') || 
         (activeTab === 'size_unit' && colName === 'start month')) {""", """    if (!keepOriginal[colName] && ((activeTab === 'task' && (colName === 'start' || colName === 'finish')) || 
         (activeTab === 'sales' && colName === 'date') || 
         (activeTab === 'profit' && colName === 'date') || 
         (activeTab === 'size_unit' && colName === 'start month'))) {""")

# For mass_task previewData
mass_task_preview_1 = """          let taskCodePhu = tcKey ? taskDef[tcKey] : '';
          if (!keepOriginal['Task code phá»¥'] && taskCodePhu !== undefined && taskCodePhu !== null && String(taskCodePhu).trim() !== '') {
             taskCodePhu = projCode ? `${projCode}-${String(taskCodePhu).trim()}` : String(taskCodePhu).trim();
          }"""
code = code.replace("""          let taskCodePhu = tcKey ? taskDef[tcKey] : '';
          if (taskCodePhu !== undefined && taskCodePhu !== null && String(taskCodePhu).trim() !== '') {
             taskCodePhu = projCode ? `${projCode}-${String(taskCodePhu).trim()}` : String(taskCodePhu).trim();
          }""", mass_task_preview_1)

mass_task_preview_2 = """          let pred = predKey ? taskDef[predKey] : '';
          if (!keepOriginal['predecessor'] && pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = projCode ? `${projCode}-${String(pred).trim()}` : String(pred).trim();
          }"""
code = code.replace("""          let pred = predKey ? taskDef[predKey] : '';
          if (pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = projCode ? `${projCode}-${String(pred).trim()}` : String(pred).trim();
          }""", mass_task_preview_2)

# For mass_task exportData
# wait, exportData and previewData have the exact same logic. Let's see if the replace applies twice
# It should apply twice because mass_task logic appears in previewData and exportData.

# Finally, UI changes: Add the checkbox
ui_update = """                      <select 
                         disabled={isLocked} 
                         className="flex-1 w-0 p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 outline-none focus:border-brand-500 text-slate-800"
                         value={mapping[col] || ''} 
                         onChange={e => setMapping({...mapping, [col]: e.target.value})}
                      >
                        <option value="">-- Cột Excel --</option>
                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {(activeTab === 'task' || activeTab === 'mass_task') && (
                        <div className="flex items-center" title="Giữ nguyên giá trị tĩnh/file">
                          <input 
                            type="checkbox" 
                            disabled={isLocked}
                            checked={!!keepOriginal[col]}
                            onChange={e => setKeepOriginal({...keepOriginal, [col]: e.target.value === 'true' || e.target.checked})}
                            className="w-4 h-4 cursor-pointer border-slate-300 rounded text-brand-600 focus:ring-brand-500"
                          />
                        </div>
                      )}
                      <input 
                         disabled={isLocked} """
code = code.replace("""                      <select 
                         disabled={isLocked} 
                         className="flex-1 w-0 p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 outline-none focus:border-brand-500 text-slate-800"
                         value={mapping[col] || ''} 
                         onChange={e => setMapping({...mapping, [col]: e.target.value})}
                      >
                        <option value="">-- Cột Excel --</option>
                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <input 
                         disabled={isLocked} """, ui_update)

with open('src/components/CsvExportTab.tsx', 'w') as f:
    f.write(code)
print("patched")
