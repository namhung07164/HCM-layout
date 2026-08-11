import os
import glob
import re

for filepath in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(filepath, 'r') as f:
        code = f.read()

    # If it ends with export default React.memo(XYZ);
    if 'export default React.memo(' in code:
        idx = code.find('export default React.memo(')
        before = code[:idx]
        
        # Keep stripping );} \n until we hit the actual component's closing brace.
        # But wait, the actual component closing brace is just `}`.
        # So we can replace any trailing sequence of `\n`, ` `, `;`, `)` with just `\n` EXCEPT we need to keep the `}`!
        # Actually, let's just do a regex replace at the end of `before`.
        # `\)?;\s*$` -> `\n` on `before` if it ends in `});` or `});;` etc.
        
        # The correct ending should just be `}`.
        # Let's find the last `}` in `before`.
        last_brace = before.rfind('}')
        if last_brace != -1:
            new_before = before[:last_brace+1] + '\n\n'
            code = new_before + code[idx:]
            with open(filepath, 'w') as f:
                f.write(code)
            print('Fixed braces in ' + filepath)

