with open('src/components/CsvExportTab.tsx', 'r') as f:
    code = f.read()

import re

# We will use regex to find the select and input part.
# The structure is:
#                      </select>
#                      <input 
#                         disabled={isLocked} 
#                         type="text" 

ui_update = """                      </select>
                      {(activeTab === 'task' || activeTab === 'mass_task') && (
                        <div className="flex items-center" title="Giữ nguyên giá trị tải lên">
                          <input 
                            type="checkbox" 
                            disabled={isLocked}
                            checked={!!keepOriginal[col]}
                            onChange={e => setKeepOriginal({...keepOriginal, [col]: e.target.checked})}
                            className="w-4 h-4 cursor-pointer border-slate-300 rounded text-brand-600 focus:ring-brand-500"
                          />
                        </div>
                      )}
                      <input 
                         disabled={isLocked} """

code = re.sub(r'</select>\s*<input\s*disabled=\{isLocked\}', ui_update, code)

with open('src/components/CsvExportTab.tsx', 'w') as f:
    f.write(code)
print("patched 3")
