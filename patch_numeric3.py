with open('src/components/ClassInfoTab.tsx', 'r') as f:
    code = f.read()

import_old = "import AutocompleteCell from './AutocompleteCell';"
import_new = "import AutocompleteCell from './AutocompleteCell';\nimport BlurInput from './BlurInput';"
if "import BlurInput" not in code:
    code = code.replace(import_old, import_new)

code = code.replace("<input \n      type=\"number\"", "<BlurInput \n      type=\"number\"")
code = code.replace("<input \r\n      type=\"number\"", "<BlurInput \r\n      type=\"number\"")
code = code.replace("<input \n", "<BlurInput \n")
code = code.replace("onChange={(e) => updateRow({ ...row, [key]: parseFloat(e.target.value) || 0 })}", "onChange={(newVal) => updateRow({ ...row, [key]: parseFloat(newVal) || 0 })}")
code = code.replace("disabled={isLocked}", "isLocked={isLocked}")

with open('src/components/ClassInfoTab.tsx', 'w') as f:
    f.write(code)
print("patched class info tab numeric 3")
