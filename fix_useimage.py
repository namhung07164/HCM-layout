import re

with open('src/components/DataMapping/ReviewTab.tsx', 'r') as f:
    content = f.read()

# We want to change:
# const [image, status] = useImage(version.backgroundUrl || '', 'anonymous');
# to:
# const [image, status] = useImage(version.backgroundUrl ? version.backgroundUrl + (version.backgroundUrl.includes('?') ? '&' : '?') + 't=' + Date.now() : '', 'anonymous');

content = content.replace(
    "const [image, status] = useImage(version.backgroundUrl || '', 'anonymous');",
    "const [image, status] = useImage(version.backgroundUrl ? version.backgroundUrl + (version.backgroundUrl.includes('?') ? '&' : '?') + 'export=' + Date.now() : '', 'anonymous');"
)

with open('src/components/DataMapping/ReviewTab.tsx', 'w') as f:
    f.write(content)
print("useImage fixed in ReviewTab")
