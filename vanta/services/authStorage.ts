import { safeGetItem, safeMultiRemove, safeMultiSet } from "@/services/storage";

const AUTH_TOKEN_KEY = "vanta:auth-token";
const AUTH_USER_KEY = "vanta:auth-user";

export type AuthUser = {
  id?: string;
  name?: string;
  email: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await safeMultiSet([
    [AUTH_TOKEN_KEY, session.token],
    [AUTH_USER_KEY, JSON.stringify(session.user)],
  ]);
}

export async function getAuthToken(): Promise<string | null> {
  return safeGetItem(AUTH_TOKEN_KEY);
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const raw = await safeGetItem(AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function hasAuthSession(): Promise<boolean> {
  const token = await getAuthToken();
  return Boolean(token);
}

export async function clearAuthSession(): Promise<void> {
  await safeMultiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}
