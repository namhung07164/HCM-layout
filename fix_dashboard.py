with open('src/components/DashboardTab.tsx', 'r') as f:
    code = f.read()

code = code.replace("  { key: 'endDate', label: 'End Date', icon: Calendar }\n\nexport default React.memo(", "  { key: 'endDate', label: 'End Date', icon: Calendar }\n] as const;\n\ntype FilterKey = typeof AVAILABLE_FILTERS[number]['key'];\n\nexport default React.memo(")
with open('src/components/DashboardTab.tsx', 'w') as f:
    f.write(code)
