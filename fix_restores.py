with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    "// if (parsed.classInfo) set({ classInfo: parsed.classInfo });",
    "if (parsed.classInfo) useDataStore.getState().setClassInfo(parsed.classInfo);"
)
code = code.replace(
    "// if (sharedParsed.classInfo) set({ classInfo: sharedParsed.classInfo });",
    "if (sharedParsed.classInfo) useDataStore.getState().setClassInfo(sharedParsed.classInfo);"
)

# For server load, we DON'T restore it because we want Firestore to be the primary source for the initial load, 
# and we already added migration logic in the onSnapshot for the initial load!
# However, let's make sure it's commented out.

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)
print("fixed restores")
