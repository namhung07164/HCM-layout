import re

with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

# Replace setClassInfo
old_set_class_info = "setClassInfo: (data) => set({ classInfo: data }),"
new_set_class_info = """setClassInfo: (data) => {
    set({ classInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving brand info to Firestore:", err));
  },"""
code = code.replace(old_set_class_info, new_set_class_info)

# Replace setUnitInfo
old_set_unit_info = "setUnitInfo: (data) => set({ unitInfo: data }),"
new_set_unit_info = """setUnitInfo: (data) => {
    set({ unitInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_unit_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving unit info to Firestore:", err));
  },"""
code = code.replace(old_set_unit_info, new_set_unit_info)

# Replace setUnits
old_set_units = "setUnits: (data) => set({ units: data }),"
new_set_units = """setUnits: (data) => {
    set({ units: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_units', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving units to Firestore:", err));
  },"""
code = code.replace(old_set_units, new_set_units)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)
print("patched store setters")
