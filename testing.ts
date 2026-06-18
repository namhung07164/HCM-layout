import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const config = {
  projectId: 'taka---projec-1',
  appId: '1:1016991080794:web:9bee0c1b10e4505b135363',
  apiKey: 'AIzaSyCsL4MZ76PLxV5-n0BHHLyb5dR_p5UmvTc',
  authDomain: 'taka---projec-1.firebaseapp.com',
  storageBucket: 'taka---projec-1.firebasestorage.app',
  messagingSenderId: '1016991080794'
};
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  const qs = await getDocs(query(collection(db, 'artifacts/taka-pm/public/data/delegationGroups'), limit(2)));
  qs.forEach((doc) => {
    console.log("taka-pm =>", doc.id, " => ", JSON.stringify(doc.data(), null, 2));
  });
  const qs2 = await getDocs(query(collection(db, 'artifacts/taka-pm-app/public/data/delegationGroups'), limit(2)));
  qs2.forEach((doc) => {
    console.log("taka-pm-app =>", doc.id, " => ", JSON.stringify(doc.data(), null, 2));
  });
  const qs3 = await getDocs(query(collection(db, 'delegationGroups'), limit(2)));
  qs3.forEach((doc) => {
    console.log("ROOT delegationGroups =>", doc.id, " => ", JSON.stringify(doc.data(), null, 2));
  });
  
  // also what about "artifacts/taka-projects-app-v1/public/data/delegationGroups"? We know it's empty, but let's check "artifacts/"
  // We can't list collections in Web SDK easily, but let's check one more:
  const qs4 = await getDocs(query(collection(db, 'delegationGroups'), limit(2)));
  process.exit(0);
}
run();