/**
 * Complete standalone stubs for Firebase SDK.
 * Eliminates all @firebase/* packages, network requests, and SDK overhead.
 * All persistence is strictly Local Cache (IndexedDB/localStorage) and Cloudflare R2.
 */

// Firestore stubs
export const doc = (...args: any[]) => ({ id: args[args.length - 1] || 'stub_id', path: args.join('/') });
export const collection = (...args: any[]) => ({ id: args[args.length - 1] || 'stub_col', path: args.join('/') });
export const getDoc = async (_ref: any) => ({ exists: () => false, data: () => null, id: _ref?.id });
export const getDocFromServer = async (_ref: any) => ({ exists: () => false, data: () => null, id: _ref?.id });
export const getDocs = async (_query: any) => ({ empty: true, docs: [], size: 0, forEach: () => {} });
export const getDocsFromServer = async (_query: any) => ({ empty: true, docs: [], size: 0, forEach: () => {} });
export const getDocsFromCache = async (_query: any) => ({ empty: true, docs: [], size: 0, forEach: () => {} });
export const onSnapshot = (_target: any, ...args: any[]) => {
  const cb = typeof args[0] === 'function' ? args[0] : typeof args[1] === 'function' ? args[1] : null;
  if (cb) {
    try { cb({ empty: true, docs: [], size: 0, forEach: () => {}, exists: () => false, data: () => null }); } catch {}
  }
  return () => {};
};
export const query = (...args: any[]) => ({ _queryArgs: args });
export const where = (...args: any[]) => ({ _type: 'where', args });
export const orderBy = (...args: any[]) => ({ _type: 'orderBy', args });
export const limit = (n: number) => ({ _type: 'limit', n });
export const startAfter = (...args: any[]) => ({ _type: 'startAfter', args });
export const deleteField = () => undefined;
export const increment = (n: number) => n;
export const serverTimestamp = () => new Date().toISOString();
export const Timestamp = {
  now: () => ({ toMillis: () => Date.now(), toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
  fromDate: (d: Date) => ({ toMillis: () => d.getTime(), toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
  fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) }),
};
export const addDoc = async (_col: any, _data: any) => ({ id: 'stub_' + Date.now() });
export const setDoc = async (_ref: any, _data: any, _opts?: any) => {};
export const updateDoc = async (_ref: any, _data: any) => {};
export const deleteDoc = async (_ref: any) => {};
export const writeBatch = (_db?: any) => ({
  set: () => {},
  update: () => {},
  delete: () => {},
  commit: async () => {},
});
export const enableNetwork = async () => {};
export const disableNetwork = async () => {};

// Auth stubs
const STUB_USER = {
  uid: 'standalone_admin',
  displayName: 'Admin (HCM Layout)',
  email: 'admin@hcm-layout.local',
  role: 'admin',
};
export const onAuthStateChanged = (_auth: any, callback: any) => {
  if (typeof callback === 'function') callback(STUB_USER);
  return () => {};
};
export const signInAnonymously = async () => ({ user: STUB_USER });
export const signInWithPopup = async () => ({ user: STUB_USER });
export const GoogleAuthProvider = class {};
export const getAuth = () => ({ currentUser: STUB_USER });
export const signOut = async () => {};

// Storage stubs
export const ref = (_storage: any, path: string) => ({ fullPath: path, name: path.split('/').pop() });
export const uploadBytes = async () => ({ ref: { fullPath: '' } });
export const uploadBytesResumable = () => ({
  on: (_evt: string, _p: any, _err: any, complete: any) => { if (complete) complete(); },
  snapshot: { ref: { fullPath: '' } },
});
export const getDownloadURL = async () => '';
export const deleteObject = async () => {};
export const uploadString = async () => {};

// Messaging stubs
export const onMessage = () => () => {};
export const getToken = async () => null;
export const getMessaging = () => null;

// App stubs
export const initializeApp = () => ({});
export const getApps = () => [{}];
export const getApp = () => ({});
export default {};
