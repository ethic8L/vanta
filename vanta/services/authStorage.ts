import { safeGetItem, safeMultiRemove, safeMultiSet } from "@/services/storage";

const AUTH_TOKEN_KEY = "vanta:auth-token";
const AUTH_USER_KEY = "vanta:auth-user";
const SESSIONS_KEY = "vanta:sessions";
const COMPLETED_TASKS_KEY = "vanta:completed-tasks";

export type AuthUser = {
  id?: string;
  name?: string;
  email: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export interface SessionRecord {
  id: string;
  task: string;
  durationMinutes: number;
  success: boolean;
  timestamp: number;
}

export interface CompletedTaskRecord {
  name: string;
  status: "success" | "failed";
  timestamp: number;
}

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

export async function saveSessions(sessions: SessionRecord[]): Promise<void> {
  try {
    await safeMultiSet([[SESSIONS_KEY, JSON.stringify(sessions)]]);
  } catch {
    // Silently fail if storage is unavailable
  }
}

export async function getSessions(): Promise<SessionRecord[]> {
  try {
    const raw = await safeGetItem(SESSIONS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

export async function clearSessions(): Promise<void> {
  try {
    await safeMultiRemove([SESSIONS_KEY]);
  } catch {
    // Silently fail if storage is unavailable
  }
}

export async function saveCompletedTasks(
  tasks: CompletedTaskRecord[],
): Promise<void> {
  try {
    await safeMultiSet([[COMPLETED_TASKS_KEY, JSON.stringify(tasks)]]);
  } catch {
    // Silently fail if storage is unavailable
  }
}

export async function getCompletedTasks(): Promise<CompletedTaskRecord[]> {
  try {
    const raw = await safeGetItem(COMPLETED_TASKS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as CompletedTaskRecord[];
  } catch {
    return [];
  }
}

export async function clearCompletedTasks(): Promise<void> {
  try {
    await safeMultiRemove([COMPLETED_TASKS_KEY]);
  } catch {
    // Silently fail if storage is unavailable
  }
}
