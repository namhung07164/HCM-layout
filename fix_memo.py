import os
import re

files = [
  'src/components/DataMapping/DynamicHierarchyTab.tsx',
  'src/components/DataMapping/ReviewTab.tsx',
  'src/components/DataMapping/ReviewOnlyView.tsx',
  'src/components/DataMapping/EditTab.tsx',
  'src/components/DataMapping/HierarchyTab.tsx',
  'src/components/MDStatusTab.tsx',
  'src/components/DailySalesProfitTab.tsx',
  'src/components/AllSubFeeTab.tsx',
  'src/components/ActualClassInfoTab.tsx',
  'src/components/SalesTab.tsx',
  'src/components/ProjectStatusTab.tsx',
  'src/components/ClassInfoTab.tsx',
  'src/components/ProjectLinkTab.tsx',
  'src/components/BasePlanTab.tsx',
  'src/components/ProfitTab.tsx',
  'src/components/UnitsTab.tsx',
  'src/components/UnitInfoTab.tsx'
]

for filepath in files:
    with open(filepath, 'r') as f:
        code = f.read()

    # Revert any broken React.memo(function ... ) pattern if it exists
    if 'export default React.memo(function' in code:
        code = re.sub(r'export default React\.memo\(function ([A-Za-z0-9_]+)\(([^)]*)\) \{', r'export default function \1(\2) {', code)
        
        # Remove any trailing );\n that was added incorrectly
        bad_idx = code.rfind(');\n')
        if bad_idx > len(code) - 10:
            code = code[:bad_idx] + '\n' + code[bad_idx+3:]
    
    # Check if there is still an export default function pattern
    match = re.search(r'export default function ([A-Za-z0-9_]+)\(([^)]*)\) \{', code)
    if match:
        func_name = match.group(1)
        args = match.group(2)
        code = code.replace(match.group(0), f'function {func_name}({args}) {{')
        
        if 'import React' not in code:
            code = 'import React from "react";\n' + code
        
        code += f'\nexport default React.memo({func_name});\n'
        
        with open(filepath, 'w') as f:
            f.write(code)
        print('Fixed and safely memoized ' + filepath)

