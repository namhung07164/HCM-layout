with open('src/App.tsx', 'r') as f:
    code = f.read()

import re

# Replace useState with Zustand
code = re.sub(
    r"const \[activeTab,\s*setActiveTab\]\s*=\s*useState<TabId>\(\"input\"\);",
    r"",
    code
)
code = re.sub(
    r"const \[isMenuOpen,\s*setIsMenuOpen\]\s*=\s*useState\(false\);",
    r"",
    code
)
code = re.sub(
    r"const \[isNotifOpen,\s*setIsNotifOpen\]\s*=\s*useState\(false\);",
    r"",
    code
)
code = re.sub(
    r"const \[reviewOnlyMode,\s*setReviewOnlyMode\]\s*=\s*useState\(false\);",
    r"",
    code
)
code = re.sub(
    r"const \[store,\s*setStore\]\s*=\s*useState<StoreRegion\s*\|\s*null>\(\(\)\s*=>\s*\{[^}]*\}\);",
    r"",
    code
)

# Fix setStore fallback check
code = re.sub(
    r"const\s+savedStore\s*=\s*localStorage\.getItem\('taka_projects_store'\)\s*as\s*StoreRegion;",
    r"// Initialization is handled via useEffect now\n  const savedStore = localStorage.getItem('taka_projects_store') as StoreRegion;",
    code
)

code = re.sub(
    r"return\s*savedStore\s*\|\|\s*null;",
    r"if (savedStore && store === null) {\n      setStore(savedStore);\n  }",
    code
)

# Extract Zustand calls
code = re.sub(
    r"(\s+restoreBackup: state\.restoreBackup,)",
    r"\1\n    activeTab: state.activeTab,\n    setActiveTab: state.setActiveTab,\n    isMenuOpen: state.isMenuOpen,\n    setIsMenuOpen: state.setIsMenuOpen,\n    isNotifOpen: state.isNotifOpen,\n    setIsNotifOpen: state.setIsNotifOpen,\n    reviewOnlyMode: state.reviewOnlyMode,\n    setReviewOnlyMode: state.setReviewOnlyMode,\n    store: state.store,\n    setStore: state.setStore,",
    code
)

code = re.sub(
    r"(\s+restoreBackup,)",
    r"\1\n    activeTab,\n    setActiveTab,\n    isMenuOpen,\n    setIsMenuOpen,\n    isNotifOpen,\n    setIsNotifOpen,\n    reviewOnlyMode,\n    setReviewOnlyMode,\n    store,\n    setStore,",
    code
)

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("patched App states")
