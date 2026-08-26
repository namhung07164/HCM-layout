with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

import re

# Add to DataContextType
code = re.sub(
    r"(\s+reviewLabelColors:\s*Record<string,\s*string>;)",
    r"\1\n  autoUpdateBrandName: boolean;\n  setAutoUpdateBrandName: (val: boolean) => void;",
    code
)

# Add to initial state
code = re.sub(
    r"(\s+reviewLabelColors:\s*\{\},)",
    r"\1\n  autoUpdateBrandName: true,\n  setAutoUpdateBrandName: (val) => set({ autoUpdateBrandName: val }),",
    code
)

# Add to saveToHandlers
code = re.sub(
    r"(\s+const\s+saveToHandlers\s*=\s*async\s*\([^)]*?)(reviewLabelColors)(\s*(?:[a-zA-Z0-9_,:\s=]*)\)\s*=>\s*\{)",
    r"\1\2, autoUpdateBrandName\3",
    code
)
# Fix the places calling saveToHandlers
code = re.sub(
    r"(saveToHandlers\([^;]*)(reviewLabelColors)([^;]*);",
    r"\1\2, autoUpdateBrandName\3;",
    code
)

# Add to json structure when saving
code = re.sub(
    r"(\s+reviewLabelColors:\s*rlc,)",
    r"\1\n            autoUpdateBrandName,",
    code
)

# Add to loading from parsed data
code = re.sub(
    r"(\s+if\s*\(parsed\.reviewLabelColors\)\s*set\(\{.*?\}\);)",
    r"\1\n      if (parsed.autoUpdateBrandName !== undefined) set({ autoUpdateBrandName: parsed.autoUpdateBrandName });",
    code
)

code = re.sub(
    r"(\s+if\s*\(data\.reviewLabelColors\)\s*set\(\{.*?\}\);)",
    r"\1\n        if (data.autoUpdateBrandName !== undefined) set({ autoUpdateBrandName: data.autoUpdateBrandName });",
    code
)

# Also add to useEffect dependencies for auto-saving
# It might be in the dependency array
code = re.sub(
    r"(,\s*reviewLabelColors)(\s*\]\);)",
    r"\1, autoUpdateBrandName\2",
    code
)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)

print("patched DataContext")
