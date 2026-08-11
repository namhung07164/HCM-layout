const fs = require('fs');
let code = fs.readFileSync('src/components/InputTab.tsx', 'utf8');

code = code.replace(
  "import ProfitTab from \"./ProfitTab\";",
  "import ProfitTab from \"./ProfitTab\";\nimport DailySalesProfitTab from \"./DailySalesProfitTab\";"
);

code = code.replace(
  "{ id: \"profit\", label: \"Profit\", icon: DollarSign },",
  "{ id: \"profit\", label: \"Profit\", icon: DollarSign },\n    { id: \"daily-sales-profit\", label: \"Daily S&P\", icon: TrendingUp },"
);

code = code.replace(
  "{activeSubTab === \"profit\" && <ProfitTab />}",
  "{activeSubTab === \"profit\" && <ProfitTab />}\n        {activeSubTab === \"daily-sales-profit\" && <DailySalesProfitTab />}"
);

fs.writeFileSync('src/components/InputTab.tsx', code);
