import re

with open('src/components/CsvExportTab.tsx', 'r') as f:
    code = f.read()

# 1. Update the filter for mass_task columns
code = code.replace(
    "return ['store', 'location', 'projectCode', 'projectYear'].includes(col);",
    "return ['store', 'location', 'projectCode', 'predecessor', 'projectYear'].includes(col);"
)

# 2. Update the predecessor logic in mass_task previewData
mass_task_pred = """          const predKey = Object.keys(taskDef).find(k => k.toLowerCase().replace(/\s+/g, '') === 'predecessor');
          let templatePred = predKey ? taskDef[predKey] : '';
          let mappedPred = constantMapping['predecessor'] || proj[mapping['predecessor']];
          let pred = (mappedPred !== undefined && mappedPred !== null && String(mappedPred).trim() !== '') ? mappedPred : templatePred;
          if (!keepOriginal['predecessor'] && pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = projCode ? `${projCode}-${String(pred).trim()}` : String(pred).trim();
          }"""

old_mass_task_pred = """          const predKey = Object.keys(taskDef).find(k => k.toLowerCase().replace(/\s+/g, '') === 'predecessor');
          let pred = predKey ? taskDef[predKey] : '';
          if (!keepOriginal['predecessor'] && pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = projCode ? `${projCode}-${String(pred).trim()}` : String(pred).trim();
          }"""

code = code.replace(old_mass_task_pred, mass_task_pred)

with open('src/components/CsvExportTab.tsx', 'w') as f:
    f.write(code)
print("patched mass_task predecessor logic")
