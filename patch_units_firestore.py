with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

# Add useEffect for taka_units and taka_unit_info
anchor = "return () => unsub();\n  }, []);"

new_effects = """return () => unsub();
  }, []);

  // Sync units from Firestore
  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_units', 'global');
    let isInitialized = false;
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        useDataStore.setState({ units: data });
        isInitialized = true;
      } else {
        if (!isInitialized) {
          try {
            const currentStore = useDataStore.getState().store;
            const data = await loadPersistentData(currentStore);
            if (data && data.units && data.units.length > 0) {
              console.log("Migrating Units to Firestore...");
              useDataStore.getState().setUnits(data.units);
            }
          } catch(e) {
            console.warn("Migration failed or no local data", e);
          }
          isInitialized = true;
        }
      }
    }, (error) => {
      console.error("Error reading units from Firestore:", error);
    });
    return () => unsub();
  }, []);

  // Sync unitInfo from Firestore
  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_unit_info', 'global');
    let isInitialized = false;
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        useDataStore.setState({ unitInfo: data });
        isInitialized = true;
      } else {
        if (!isInitialized) {
          try {
            const currentStore = useDataStore.getState().store;
            const data = await loadPersistentData(currentStore);
            if (data && data.unitInfo && data.unitInfo.length > 0) {
              console.log("Migrating Unit Info to Firestore...");
              useDataStore.getState().setUnitInfo(data.unitInfo);
            }
          } catch(e) {
            console.warn("Migration failed or no local data", e);
          }
          isInitialized = true;
        }
      }
    }, (error) => {
      console.error("Error reading unit info from Firestore:", error);
    });
    return () => unsub();
  }, []);"""

if anchor in code:
    code = code.replace(anchor, new_effects, 1)
    
# Modify setUnits
old_set_units = """  const setUnits = (data: UnitDataInfo[]) => {
    set({ units: data });
  };"""

new_set_units = """  const setUnits = (data: UnitDataInfo[]) => {
    useDataStore.setState({ units: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_units', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving units to Firestore:", err));
  };"""
code = code.replace(old_set_units, new_set_units)

# Modify setUnitInfo
old_set_unitinfo = """  const setUnitInfo = (data: UnitInfo[]) => {
    set({ unitInfo: data });
  };"""

new_set_unitinfo = """  const setUnitInfo = (data: UnitInfo[]) => {
    useDataStore.setState({ unitInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_unit_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving unit info to Firestore:", err));
  };"""
code = code.replace(old_set_unitinfo, new_set_unitinfo)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)
print("patched DataContext.tsx")
