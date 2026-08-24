import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const app = initializeApp({ projectId: "test" });
try {
  initializeFirestore(app, { localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}) });
  console.log("initialized 1");
  initializeFirestore(app, { localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}) });
  console.log("initialized 2");
} catch (e) {
  console.log("error", e.message);
  getFirestore(app);
  console.log("got 2");
}
