with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    "useDataStore.getState().setClassInfo(mapClassInfo(parseSheetData(results['Brand Info']))});",
    "useDataStore.getState().setClassInfo(mapClassInfo(parseSheetData(results['Brand Info'])));"
)
code = code.replace(
    "useDataStore.getState().setClassInfo(mapClassInfo(parseSheetData(results['Class Info']))});",
    "useDataStore.getState().setClassInfo(mapClassInfo(parseSheetData(results['Class Info'])));"
)

with open('src/DataContext.tsx', 'w') as f:
    f.write(code)
print("fixed sync")
