with open('src/App.tsx', 'r') as f:
    code = f.read()

import re

# Remove `store` and `setStore` from MainApp destructuring
code = re.sub(
    r"\s*store,\n\s*setStore,\n\s*\} = useDataStore",
    r"\n   } = useDataStore",
    code
)

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("patched app")
