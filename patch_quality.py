with open('src/components/DataMapping/ReviewTab.tsx', 'r') as f:
    code = f.read()

import re

old_code_regex = r"const maxSize = Math\.max\(stagesReady\[0\]\?\.width\(\) \|\| 2000, stagesReady\[0\]\?\.height\(\) \|\| 2000\);\s*if \(pxRatio \* maxSize > 6000\) \{\s*pxRatio = 6000 / maxSize;\s*\}"

new_code = """
                // Safe max dimension to prevent black images from browser canvas limits (iOS limit is 4096)
                const SAFE_MAX_DIM = 4096;
"""

code = re.sub(old_code_regex, new_code, code)

# We need to apply currentPxRatio per stage in both PDF and JPEG export
# PDF export
pdf_loop_regex = r"(const dataURL = stage\.toDataURL\(\{ pixelRatio: )pxRatio(, mimeType: 'image\/jpeg', quality: jpegQuality \}\);)"
new_pdf_loop = r"""
                        let currentPxRatio = pxRatio;
                        const maxDim = Math.max(stage.width(), stage.height());
                        if (currentPxRatio * maxDim > SAFE_MAX_DIM) {
                            currentPxRatio = SAFE_MAX_DIM / maxDim;
                        }
                        \1currentPxRatio\2"""
code = re.sub(pdf_loop_regex, new_pdf_loop, code)

with open('src/components/DataMapping/ReviewTab.tsx', 'w') as f:
    f.write(code)

print("patched quality")
