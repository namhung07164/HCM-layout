with open('src/components/MDStatusTab.tsx', 'r') as f:
    code = f.read()

import_old = "import AutocompleteCell from './AutocompleteCell';"
import_new = "import AutocompleteCell from './AutocompleteCell';\nimport BlurInput from './BlurInput';"
if "import BlurInput" not in code:
    code = code.replace(import_old, import_new)

old_cell = """      <input
        type="text"
        className="w-full bg-transparent border-none outline-none focus:ring-0 px-2 py-1 text-slate-300"
        value={val || ''}
        placeholder="..."
        disabled={isLocked}
        onChange={(e) => updateRow({ ...row, mdNotes: e.target.value })}
      />"""

new_cell = """      <BlurInput
        type="text"
        className="w-full bg-transparent border-none outline-none focus:ring-0 px-2 py-1 text-slate-300"
        value={val || ''}
        placeholder="..."
        isLocked={isLocked}
        onChange={(newVal) => updateRow({ ...row, mdNotes: newVal })}
      />"""
code = code.replace(old_cell, new_cell)

with open('src/components/MDStatusTab.tsx', 'w') as f:
    f.write(code)
print("patched md")
