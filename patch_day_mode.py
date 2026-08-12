import re

with open('src/components/DataMapping/ReviewTab.tsx', 'r') as f:
    code = f.read()

# 1. Update the shapeProps in HiddenExportStage (Rect, Circle, Polygon)
old_shape_props = """                stroke: '#ffffff',
                strokeWidth: 2,
                shadowBlur: 4,
                shadowColor: 'rgba(0,0,0,0.5)',"""

new_shape_props = """                stroke: '#1e293b',
                strokeWidth: 1.5,
                shadowBlur: 2,
                shadowColor: 'rgba(0,0,0,0.2)',"""

if old_shape_props in code:
    code = code.replace(old_shape_props, new_shape_props, 1)
    print("Patched shapeProps")

day_mode_helper = """
  // Helper for day mode text color
  const getDayModeFill = (key: string) => {
      const c = reviewLabelColors?.[key] || '#ffffff';
      return (c.toLowerCase() === '#ffffff' || c.toLowerCase() === '#fff') ? '#1e293b' : c;
  };
"""

code = code.replace("const exportHeight = logicalHeight * stageScale;", "const exportHeight = logicalHeight * stageScale;\n" + day_mode_helper)

code = code.replace("fill={reviewLabelColors?.[block.key] || '#ffffff'} align=\"center\" fontSize={fontSize} fontStyle=\"bold\" listening={false} shadowColor=\"black\" shadowBlur={2} shadowOpacity={1}", "fill={getDayModeFill(block.key)} align=\"center\" fontSize={fontSize} fontStyle=\"bold\" listening={false} shadowColor=\"rgba(255,255,255,0.9)\" shadowBlur={3} shadowOpacity={1}")
code = code.replace("fill={reviewLabelColors?.[line.key] || '#ffffff'} align=\"center\" fontSize={fontSize} fontStyle=\"bold\" listening={false} shadowColor=\"black\" shadowBlur={2} shadowOpacity={1}", "fill={getDayModeFill(line.key)} align=\"center\" fontSize={fontSize} fontStyle=\"bold\" listening={false} shadowColor=\"rgba(255,255,255,0.9)\" shadowBlur={3} shadowOpacity={1}")


with open('src/components/DataMapping/ReviewTab.tsx', 'w') as f:
    f.write(code)

print("Patch applied to ReviewTab.tsx")
