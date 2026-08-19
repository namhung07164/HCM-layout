with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

old_effect = """  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        useDataStore.setState({ classInfo: data });
      }
    }, (error) => {
      console.error("Error reading brand info from Firestore:", error);
    });
    return () => unsub();
  }, []);"""

new_effect = """  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    let isInitialized = false;
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        useDataStore.setState({ classInfo: data });
        isInitialized = true;
      } else {
        if (!isInitialized) {
          // Document doesn't exist, try to migrate from local
          try {
            const currentStore = useDataStore.getState().store;
            const data = await loadPersistentData(currentStore);
            if (data && data.classInfo && data.classInfo.length > 0) {
              console.log("Migrating Brand Info to Firestore...");
              useDataStore.getState().setClassInfo(data.classInfo);
            }
          } catch(e) {
            console.warn("Migration failed or no local data", e);
          }
          isInitialized = true;
        }
      }
    }, (error) => {
      console.error("Error reading brand info from Firestore:", error);
    });
    return () => unsub();
  }, []);"""

code = code.replace(old_effect, new_effect)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)
print("patched migration")
