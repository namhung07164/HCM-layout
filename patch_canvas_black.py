with open('src/components/DataMapping/ReviewTab.tsx', 'r') as f:
    code = f.read()

import re

# 1. Change quality settings
code = code.replace("pxRatio = 4;", "pxRatio = 3;")
code = code.replace("jpegQuality = 1.0;", "jpegQuality = 0.92;")

# 2. Change SAFE_MAX_DIM from 4096 to 3840
code = code.replace("const SAFE_MAX_DIM = 4096;", "const SAFE_MAX_DIM = 3840;")

# 3. Change the hidden div wrapper
old_div = "style={{ position: 'absolute', top: -10000, left: -10000, visibility: 'hidden' }}"
new_div = "style={{ position: 'absolute', top: 0, left: 0, zIndex: -9999, opacity: 0, pointerEvents: 'none' }}"
code = code.replace(old_div, new_div)

# 4. Also add a fallback fill in Stage just in case (though Rect should work, Stage style can have background-color)
# Wait, Konva Stage can have a container style. Let's add style={{ backgroundColor: 'white' }} to the Stage.
stage_pattern = r"<Stage\s+ref=\{stageRef\}\s+width=\{exportWidth\}\s+height=\{exportHeight\}\s+scaleX=\{stageScale\}\s+scaleY=\{stageScale\}\s*>"
new_stage = """<Stage 
      ref={stageRef}
      width={exportWidth} 
      height={exportHeight}
      scaleX={stageScale}
      scaleY={stageScale}
      style={{ backgroundColor: 'white' }}
    >"""
code = re.sub(stage_pattern, new_stage, code)

with open('src/components/DataMapping/ReviewTab.tsx', 'w') as f:
    f.write(code)

print("patched canvas black fixes")
