with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

import re

# Add to DataContextType
code = re.sub(
    r"(\s+autoUpdateBrandName:\s*boolean;\n\s*setAutoUpdateBrandName:\s*\(val:\s*boolean\)\s*=>\s*void;)",
    r"\1\n  activeTab: string;\n  setActiveTab: (tab: string) => void;\n  isMenuOpen: boolean;\n  setIsMenuOpen: (open: boolean) => void;\n  isNotifOpen: boolean;\n  setIsNotifOpen: (open: boolean) => void;\n  reviewOnlyMode: boolean;\n  setReviewOnlyMode: (mode: boolean) => void;\n  store: 'HCM' | 'HN' | null;\n  setStore: (store: 'HCM' | 'HN' | null) => void;",
    code
)

# Add to initial state
code = re.sub(
    r"(\s+autoUpdateBrandName:\s*true,)",
    r"\1\n  activeTab: 'input',\n  setActiveTab: (tab) => set({ activeTab: tab }),\n  isMenuOpen: false,\n  setIsMenuOpen: (val) => set({ isMenuOpen: val }),\n  isNotifOpen: false,\n  setIsNotifOpen: (val) => set({ isNotifOpen: val }),\n  reviewOnlyMode: false,\n  setReviewOnlyMode: (val) => set({ reviewOnlyMode: val }),\n  store: null,\n  setStore: (val) => set({ store: val }),",
    code
)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)

print("patched DataContext for app states")
