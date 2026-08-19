import re

with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

# Add imports
if 'import { defaultDb }' not in code:
    code = code.replace(
        "import { loadPersistentData",
        "import { defaultDb } from './lib/firebase';\nimport { doc, setDoc, onSnapshot } from 'firebase/firestore';\nimport { loadPersistentData"
    )

# Add onSnapshot in DataProvider
provider_start = "export function DataProvider({ children, store }: { children: React.ReactNode, store: StoreRegion }) {"
snapshot_effect = """
  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        set({ classInfo: data });
      }
    }, (error) => {
      console.error("Error reading brand info from Firestore:", error);
    });
    return () => unsub();
  }, []);
"""
if 'taka_brand_info' not in code:
    code = code.replace(provider_start, provider_start + snapshot_effect)

# Update setClassInfo
old_set_class_info = """  const setClassInfo = (data: ClassInfo[]) => {
    set({ classInfo: data });
  };"""

new_set_class_info = """  const setClassInfo = (data: ClassInfo[]) => {
    set({ classInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving brand info to Firestore:", err));
  };"""

code = code.replace(old_set_class_info, new_set_class_info)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)
print("patched DataContext.tsx")
