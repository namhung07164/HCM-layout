import re

with open('src/components/DataMapping/ReviewTab.tsx', 'r') as f:
    content = f.read()

old_logic = """                const maxSize = Math.max(stagesReady[0]?.width() || 2000, stagesReady[0]?.height() || 2000);
                if (pxRatio * maxSize > 6000) {
                    pxRatio = 6000 / maxSize;
                }"""

# Remove the global pxRatio adjustment
content = content.replace(old_logic, "")

# Now find where toDataURL is called and adjust pxRatio there
# For PDF/Drive
content = content.replace(
    "const dataURL = stage.toDataURL({ pixelRatio: pxRatio, mimeType: 'image/jpeg', quality: jpegQuality });",
    """let currentPxRatio = pxRatio;
                        const currentMaxSize = Math.max(stage.width() || 2000, stage.height() || 2000);
                        if (currentPxRatio * currentMaxSize > 6000) {
                            currentPxRatio = 6000 / currentMaxSize;
                        }
                        const dataURL = stage.toDataURL({ pixelRatio: currentPxRatio, mimeType: 'image/jpeg', quality: jpegQuality });"""
)

# For R2/JPEG
content = content.replace(
    "const dataUrl = stage.toDataURL({ pixelRatio: pxRatio, mimeType: 'image/jpeg', quality: jpegQuality });",
    """let currentPxRatio = pxRatio;
                        const currentMaxSize = Math.max(stage.width() || 2000, stage.height() || 2000);
                        if (currentPxRatio * currentMaxSize > 6000) {
                            currentPxRatio = 6000 / currentMaxSize;
                        }
                        const dataUrl = stage.toDataURL({ pixelRatio: currentPxRatio, mimeType: 'image/jpeg', quality: jpegQuality });"""
)

with open('src/components/DataMapping/ReviewTab.tsx', 'w') as f:
    f.write(content)
print("fixed pxRatio calculation")
