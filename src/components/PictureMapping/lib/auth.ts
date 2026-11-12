export interface User {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

const LOCAL_USER: User = {
  uid: 'standalone_admin',
  displayName: 'Admin (HCM Layout)',
  email: 'admin@hcm-layout.local',
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  _onAuthFailure?: () => void
) => {
  if (onAuthSuccess) {
    onAuthSuccess(LOCAL_USER, 'local_token');
  }
  return () => {};
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  return { user: LOCAL_USER, accessToken: 'local_token' };
};

export const getAccessToken = async (): Promise<string | null> => {
  return 'local_token';
};

export const logout = async () => {};
