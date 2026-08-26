with open('src/components/UnitInfoTab.tsx', 'r') as f:
    code = f.read()

import re

# Inject autoUpdateBrandName into Zustand destructing
code = re.sub(
    r"(\s+classInfo,\s+projectStatus,\s+mapUnits)",
    r"\1, autoUpdateBrandName",
    code
)
code = re.sub(
    r"(\s+mapUnits:\s*state\.mapUnits,)",
    r"\1\n    autoUpdateBrandName: state.autoUpdateBrandName,",
    code
)

# Update autofillBrandName to return early if !autoUpdateBrandName
code = re.sub(
    r"(const autofillBrandName = \(row: UnitInfo, targetUnit: string\): UnitInfo => \{)",
    r"\1\n      if (!autoUpdateBrandName) return row;",
    code
)

# Also in useEffect, if !autoUpdateBrandName return
code = re.sub(
    r"(// AUTO-FILL BRAND NAMES FROM PROJECT STATUS\s*React\.useEffect\(\(\) => \{)",
    r"\1\n    if (!autoUpdateBrandName) return;",
    code
)

# And add autoUpdateBrandName to useEffect dependencies
code = re.sub(
    r"(\}, \[unitInfo, projectStatus, classInfo, setUnitInfo)(\]\);)",
    r"\1, autoUpdateBrandName\2",
    code
)


with open('src/components/UnitInfoTab.tsx', 'w') as f:
    f.write(code)

print("patched UnitInfoTab")
