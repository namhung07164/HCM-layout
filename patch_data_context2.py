with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

import re

# Add autoUpdateBrandName: boolean to saveToHandlers args
code = re.sub(
    r"(mu:\s*UnitShape\[\],\s*mv:\s*MapVersion\[\],\s*amvId:\s*string\s*\|\s*null,\s*rsl:\s*string\[\],\s*rlc:\s*Record<string,\s*string>,)",
    r"\1 autoUpdateBrandName: boolean,",
    code
)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)

print("patched saveToHandlers signature")
