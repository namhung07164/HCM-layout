with open('src/components/DataMapping/ReviewTab.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "style={{ position: 'absolute', top: -10000, left: -10000, visibility: 'hidden' }}",
    "style={{ position: 'absolute', top: -20000, left: -20000, opacity: 0, pointerEvents: 'none' }}"
)

with open('src/components/DataMapping/ReviewTab.tsx', 'w') as f:
    f.write(content)
print("fixed export style")
