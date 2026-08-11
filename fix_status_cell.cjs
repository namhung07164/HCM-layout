const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldStr = \`          </select>
        );
      };
    },
    [],
  );\`;

const newStr = \`          </select>
        );
      },
    [],
  );\`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('fixed status cell syntax');
