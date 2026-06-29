const { execSync } = require('child_process');
try {
  execSync('git checkout src/components/DataTable.tsx src/components/DataMapping/ReviewOnlyView.tsx');
  console.log('Restored');
} catch (e) {
  console.error(e.message);
}
