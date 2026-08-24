with open('src/lib/firebase.ts', 'r') as f:
    code = f.read()

import_old = "import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';"
import_new = "import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';"

new_code = """import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  }, (firebaseConfig as any).firestoreDatabaseId);
} catch (e) {
  firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
}
export const db = firestoreDb;

let defaultFirestoreDb;
try {
  defaultFirestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  });
} catch (e) {
  defaultFirestoreDb = getFirestore(app);
}
export const defaultDb = defaultFirestoreDb;

export const auth = getAuth();
"""

with open('src/lib/firebase.ts', 'w') as f:
    f.write(new_code)
print("patched firebase 2")
