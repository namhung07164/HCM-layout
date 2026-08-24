with open('src/components/DataTable.tsx', 'r') as f:
    code = f.read()

import_old = "import React, { useState, useMemo, useCallback } from 'react';"
import_new = "import React, { useState, useMemo, useCallback } from 'react';\nimport BlurInput from './BlurInput';"
if "import BlurInput" not in code:
    code = code.replace(import_old, import_new)

old_cell = """        <input 
          type="text"
          value={val || ''} 
          onChange={(e) => updateRow({ ...row, [colKey]: e.target.value })}
          disabled={locked}
          className={cn(
            "bg-transparent border-0 text-slate-300 w-full outline-none",
            locked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/50 hover:bg-slate-800/80 focus:bg-brand-900/40 focus:text-brand-100 rounded px-2 py-1.5 transition-all shadow-inner shadow-black/20 border border-slate-700/50 hover:border-slate-600 focus:border-brand-500/50"
          )}
          placeholder="..."
        />"""

new_cell = """        <BlurInput 
          type="text"
          value={val || ''} 
          onChange={(newVal) => updateRow({ ...row, [colKey]: newVal })}
          isLocked={locked}
          className={cn(
            "bg-transparent border-0 text-slate-300 w-full outline-none",
            locked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/50 hover:bg-slate-800/80 focus:bg-brand-900/40 focus:text-brand-100 rounded px-2 py-1.5 transition-all shadow-inner shadow-black/20 border border-slate-700/50 hover:border-slate-600 focus:border-brand-500/50"
          )}
          placeholder="..."
        />"""
code = code.replace(old_cell, new_cell)

with open('src/components/DataTable.tsx', 'w') as f:
    f.write(code)
print("patched datatable")
