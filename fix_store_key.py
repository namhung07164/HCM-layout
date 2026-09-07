with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

import re

# Remove duplicate store definition at bottom of default state
code = re.sub(
    r"\s*store:\s*'HCM'\s*as\s*StoreRegion,",
    r"",
    code
)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)

print("patched duplicated store")
