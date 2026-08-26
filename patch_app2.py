with open('src/App.tsx', 'r') as f:
    code = f.read()

import re

# Remove the line I just added
code = re.sub(
    r"const \{ autoUpdateBrandName, setAutoUpdateBrandName \} = useDataStore\(\);\n  ",
    r"",
    code
)

# Add to the useShallow block
code = re.sub(
    r"(\s+triggerManualBackup:\s*state\.triggerManualBackup,)",
    r"\1\n    autoUpdateBrandName: state.autoUpdateBrandName,\n    setAutoUpdateBrandName: state.setAutoUpdateBrandName,",
    code
)
code = re.sub(
    r"(\s+triggerManualBackup,)",
    r"\1\n    autoUpdateBrandName,\n    setAutoUpdateBrandName,",
    code
)

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("patched App.tsx shallow")
