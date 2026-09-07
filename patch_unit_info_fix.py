with open('src/components/UnitInfoTab.tsx', 'r') as f:
    code = f.read()

import re

# Inject autoUpdateBrandName into Zustand destructing
code = re.sub(
    r"(\s+unitInfo,\s+setUnitInfo,\s+units,\s+classInfo,\s+projectStatus)",
    r"\1, autoUpdateBrandName",
    code
)

code = re.sub(
    r"(\s+classInfo:\s+state\.classInfo,)",
    r"\1\n    autoUpdateBrandName: state.autoUpdateBrandName,",
    code
)

with open('src/components/UnitInfoTab.tsx', 'w') as f:
    f.write(code)

print("patched UnitInfoTab fix")
