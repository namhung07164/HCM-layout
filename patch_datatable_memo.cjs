const fs = require('fs');
let code = fs.readFileSync('src/components/DataTable.tsx', 'utf8');

const targetStr = `const Row = React.memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {`;

const areEqualFn = `const areEqual = (prevProps: any, nextProps: any) => {
  if (prevProps.index !== nextProps.index || prevProps.style !== nextProps.style) return false;
  if (prevProps.data.visibleColumns !== nextProps.data.visibleColumns) return false;
  if (prevProps.data.isLocked !== nextProps.data.isLocked) return false;
  // Deep check the actual row data object reference
  if (prevProps.data.filteredData[prevProps.index] !== nextProps.data.filteredData[nextProps.index]) return false;
  return true;
};

const Row = React.memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {`;

code = code.replace(targetStr, areEqualFn);

// Now I also need to make sure the memo uses `areEqual`.
// Let's find where React.memo wraps the component. Wait, it's inline!
// `const Row = React.memo(({ index, style, data }... ) => { ... });`

const endOfRowStr = `        </button>
      </div>
    </div>
  );
});`;

const newEndOfRowStr = `        </button>
      </div>
    </div>
  );
}, areEqual);`;

code = code.replace(endOfRowStr, newEndOfRowStr);

fs.writeFileSync('src/components/DataTable.tsx', code);
console.log('patched DataTable memo');
