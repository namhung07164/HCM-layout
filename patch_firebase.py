with open('src/lib/firebase.ts', 'r') as f:
    code = f.read()

import_old = "import { getFirestore } from 'firebase/firestore';"
import_new = "import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';"

db_old = "export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);"
db_new = """export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, (firebaseConfig as any).firestoreDatabaseId);"""

default_old = "export const defaultDb = getFirestore(app);"
default_new = """export const defaultDb = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});"""

code = code.replace(import_old, import_new)
code = code.replace(db_old, db_new)
code = code.replace(default_old, default_new)

with open('src/lib/firebase.ts', 'w') as f:
    f.write(code)
print("patched firebase")
