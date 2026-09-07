with open('src/App.tsx', 'r') as f:
    code = f.read()

import re

# Insert initial store reading in App component
init_store_code = r"""
export default function App() {
  const { store, setStore } = useDataStore();

  useEffect(() => {
    const savedStore = localStorage.getItem('active_store') as StoreRegion | null;
    if (savedStore && store === null) {
      setStore(savedStore);
    }
  }, []);
"""

code = re.sub(
    r"export default function App\(\) \{",
    init_store_code,
    code
)

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("patched App init")
