/**
 * Standalone Local-First & Cloudflare R2 Mode
 * Eliminates all Firebase, Firestore, Auth, and Storage network calls.
 * All persistence is handled by LocalStorage, IndexedDB (Dexie), and Cloudflare R2.
 */

import { deleteLocalRecord } from "./localDb";
import { removeUndefinedDeep } from "./firestoreSanitizer";

function resolveLogicalCollection(docPath?: string): 'taka_projects' | 'taka_tasks' | 'taka_costs' | 'taka_delegations' | null {
  if (!docPath) return null;
  if (docPath.includes('taka_projects')) return 'taka_projects';
  if (docPath.includes('taka_tasks')) return 'taka_tasks';
  if (docPath.includes('taka_costs')) return 'taka_costs';
  if (docPath.includes('taka_delegation')) return 'taka_delegations';
  return null;
}

export const APP_ID = 'taka-projects-app-v1';

export interface StandaloneUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: string;
}

const LOCAL_USER: StandaloneUser = {
  uid: 'admin_standalone',
  displayName: 'Admin (HCM Layout)',
  email: 'admin@hcm-layout.local',
  role: 'admin',
};

export const auth: any = {
  currentUser: LOCAL_USER,
  onAuthStateChanged: (callback: (user: StandaloneUser | null) => void) => {
    callback(LOCAL_USER);
    return () => {};
  },
  signOut: async () => {},
};

export const db: any = null;
export const storage: any = null;

export const messaging = async () => null;
export const getToken = async () => null;

export const initAuth = (
  onAuthSuccess?: (user: StandaloneUser, token: string) => void,
  _onAuthFailure?: () => void
) => {
  if (onAuthSuccess) {
    onAuthSuccess(LOCAL_USER, 'local_token');
  }
  return () => {};
};

export const googleSignIn = async (): Promise<{ user: StandaloneUser; accessToken: string } | null> => {
  return { user: LOCAL_USER, accessToken: 'local_token' };
};

export const getAccessToken = async (): Promise<string | null> => {
  return 'local_token';
};

export async function setDoc(docRef: any, data: any, _options?: any): Promise<void> {
  const cleanData = removeUndefinedDeep(data);
  if (cleanData?.isDeleted) {
    const logical = resolveLogicalCollection(docRef?.path);
    if (logical && docRef?.id) {
      deleteLocalRecord(logical, docRef.id).catch(() => {});
    }
  }
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  const cleanData = removeUndefinedDeep(data);
  if (cleanData?.isDeleted) {
    const logical = resolveLogicalCollection(docRef?.path);
    if (logical && docRef?.id) {
      deleteLocalRecord(logical, docRef.id).catch(() => {});
    }
  }
}

export async function deleteDoc(docRef: any): Promise<void> {
  const logical = resolveLogicalCollection(docRef?.path);
  if (logical && docRef?.id) {
    deleteLocalRecord(logical, docRef.id).catch(() => {});
  }
}

export interface LocalWriteBatch {
  set(docRef: any, data: any, options?: any): LocalWriteBatch;
  update(docRef: any, data: any, ...more: any[]): LocalWriteBatch;
  delete(docRef: any): LocalWriteBatch;
  commit(): Promise<void>;
}

export function writeBatch(_dbInstance?: any): LocalWriteBatch {
  const deletedOps: any[] = [];
  return {
    set(docRef: any, data: any) {
      if (data?.isDeleted) deletedOps.push(docRef);
      return this;
    },
    update(docRef: any, data: any) {
      if (data?.isDeleted) deletedOps.push(docRef);
      return this;
    },
    delete(docRef: any) {
      deletedOps.push(docRef);
      return this;
    },
    async commit() {
      deletedOps.forEach((op) => {
        const logical = resolveLogicalCollection(op?.path);
        if (logical && op?.id) {
          deleteLocalRecord(logical, op.id).catch(() => {});
        }
      });
    },
  };
}
