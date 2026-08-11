import os
import glob

for filepath in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(filepath, 'r') as f:
        code = f.read()

    # If it ends with export default React.memo(XYZ);
    if 'export default React.memo(' in code:
        # Check if there is an stray `});` just before the export default React.memo
        idx = code.find('export default React.memo(')
        if idx != -1:
            before_export = code[:idx]
            # Strip whitespace
            stripped = before_export.rstrip()
            if stripped.endswith('});'):
                # it was incorrectly wrapped with }); previously
                # replace the last }); with }
                new_before = stripped[:-3] + '}\n\n'
                code = new_before + code[idx:]
                with open(filepath, 'w') as f:
                    f.write(code)
                print('Stripped bad ); from ' + filepath)

