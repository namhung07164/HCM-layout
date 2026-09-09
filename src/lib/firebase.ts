import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, persistentSingleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const tabManager = isMobile ? persistentSingleTabManager({ forceOwnership: true }) : persistentMultipleTabManager();
const CACHE_SIZE = 41943040; // 40MB

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: tabManager,
      cacheSizeBytes: CACHE_SIZE
    })
  }, (firebaseConfig as any).firestoreDatabaseId);
} catch (e) {
  firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
}
export const db = firestoreDb;

let defaultFirestoreDb;
try {
  defaultFirestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: tabManager,
      cacheSizeBytes: CACHE_SIZE
    })
  });
} catch (e) {
  defaultFirestoreDb = getFirestore(app);
}
export const defaultDb = defaultFirestoreDb;

export const auth = getAuth();
