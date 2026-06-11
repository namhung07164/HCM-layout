import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const snap = await getDocs(query(collection(db, 'taka_projects')));
  let projectId = null;
  snap.forEach(doc => {
    const data = doc.data();
    if (data.code === 'L1-102' || data.CODE === 'L1-102') {
      console.log('Project:', data);
      projectId = doc.id;
    }
  });

  if (projectId) {
    const taskSnap = await getDocs(query(collection(db, 'taka_tasks')));
    const tasks = [];
    taskSnap.forEach(doc => {
      const data = doc.data();
      if (data.projectId === projectId || data.project_id === projectId) {
        tasks.push(data);
      }
    });
    console.log('Tasks:', JSON.stringify(tasks, null, 2));
  } else {
    console.log('Project not found');
  }
  process.exit(0);
}
check();
