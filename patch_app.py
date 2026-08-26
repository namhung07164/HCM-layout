with open('src/App.tsx', 'r') as f:
    code = f.read()

import re

# Add useDataStore import if not there or just rely on it.
# Wait, let's just add autoUpdateBrandName to useDataStore in App.tsx
zustand_regex = r"(const \{\s*isSaving,)"
code = re.sub(
    zustand_regex,
    r"const { autoUpdateBrandName, setAutoUpdateBrandName } = useDataStore();\n  \1",
    code
)

# Insert the toggle switch before "Live Sync Active"
toggle_code = r"""
            <div 
              className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={() => setAutoUpdateBrandName(!autoUpdateBrandName)}
              title="Auto-update Brand Name from Project Status"
            >
              <div className={cn(
                "w-8 h-4 rounded-full relative transition-colors",
                autoUpdateBrandName ? "bg-brand-500" : "bg-slate-700"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                  autoUpdateBrandName ? "left-4.5 right-0.5 translate-x-[16px]" : "left-0.5"
                )} />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 select-none">
                Auto Sync Brand
              </span>
            </div>
"""

code = re.sub(
    r"(<div className=\"hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full\">)",
    toggle_code + r"\n            \1",
    code
)

# And also add the same in the mobile menu maybe?
# The user might use it on mobile, but top nav is fine for now.

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("patched App.tsx")
