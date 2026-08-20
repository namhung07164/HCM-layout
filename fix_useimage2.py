import re

with open('src/components/DataMapping/ReviewTab.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const [image] = useImage(activeVersion?.backgroundUrl || '', 'anonymous');",
    "const [image] = useImage(activeVersion?.backgroundUrl ? activeVersion.backgroundUrl + (activeVersion.backgroundUrl.includes('?') ? '&' : '?') + 'view=' + Date.now() : '', 'anonymous');"
)

with open('src/components/DataMapping/ReviewTab.tsx', 'w') as f:
    f.write(content)
print("useImage fixed in ReviewTab (2)")
