with open('src/components/InputTab.tsx', 'r') as f:
    content = f.read()

import_statement = "import ClassInfoTab from \"./ClassInfoTab\";"
new_import_statement = "import ClassInfoTab from \"./ClassInfoTab\";\nimport ActualClassInfoTab from \"./ActualClassInfoTab\";"

if "ActualClassInfoTab" not in content[:content.find("InputSubTabType")]:
    content = content.replace(import_statement, new_import_statement)
    with open('src/components/InputTab.tsx', 'w') as f:
        f.write(content)
    print("Import added")
else:
    print("Import already exists")
