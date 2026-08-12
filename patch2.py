with open('src/components/CsvExportTab.tsx', 'r') as f:
    code = f.read()

save_mapping_update = """  const handleSaveMapping = () => {
    safeSetStorage(`taka_mapping_${activeTab}`, JSON.stringify(mapping));
    safeSetStorage(`taka_constant_${activeTab}`, JSON.stringify(constantMapping));
    safeSetStorage(`taka_keeporiginal_${activeTab}`, JSON.stringify(keepOriginal));
    safeSetStorage(`taka_locked_${activeTab}`, 'true');"""

code = code.replace("""  const handleSaveMapping = () => {
    safeSetStorage(`taka_mapping_${activeTab}`, JSON.stringify(mapping));
    safeSetStorage(`taka_constant_${activeTab}`, JSON.stringify(constantMapping));
    safeSetStorage(`taka_locked_${activeTab}`, 'true');""", save_mapping_update)

with open('src/components/CsvExportTab.tsx', 'w') as f:
    f.write(code)
print("patched 2")
