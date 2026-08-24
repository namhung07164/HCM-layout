import re

with open('src/components/ClassInfoTab.tsx', 'r') as f:
    code = f.read()

import_old = "import AutocompleteCell from './AutocompleteCell';"
import_new = "import AutocompleteCell from './AutocompleteCell';\nimport BlurInput from './BlurInput';"
if "import BlurInput" not in code:
    code = code.replace(import_old, import_new)

old_pattern = r"""<input\s+type="number"\s+value=\{val === 0 \? '' : val\}\s+onChange=\{\(e\) => updateRow\(\{ \.\.\.row, \[key\]: parseFloat\(e\.target\.value\) \|\| 0 \}\)\}\s+disabled=\{isLocked\}\s+className=\{cn\([\s\S]*?\)\}\s+/>"""

new_cell = """<BlurInput 
      type="number"
      value={val === 0 ? '' : val} 
      onChange={(newVal) => updateRow({ ...row, [key]: parseFloat(newVal) || 0 })}
      isLocked={isLocked}
      className={cn(
        "bg-transparent border-0 text-slate-300 w-full outline-none",
        isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-brand-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-brand-500/50"
      )}
    />"""

code = re.sub(old_pattern, new_cell, code, count=1)

with open('src/components/ClassInfoTab.tsx', 'w') as f:
    f.write(code)
print("patched class info tab numeric")
