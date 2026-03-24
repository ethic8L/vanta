import { AuthSession } from "@/services/authStorage";

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

type AuthPayload = {
  email: string;
  password: string;
  name?: string;
};

type ApiError = {
  message?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeSession(payload: unknown): AuthSession {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const token =
    (root.token as string | undefined) ?? (data.token as string | undefined);
  const rawUser = (root.user as unknown) ?? data.user;
  const user = asRecord(rawUser);
  const email = user.email as string | undefined;

  if (!token || !email) {
    throw new Error("Invalid server response.");
  }

  return {
    token,
    user: {
      id: (user.id as string | undefined) ?? (user._id as string | undefined),
      name: user.name as string | undefined,
      email,
    },
  };
}

async function postAuth(path: string, body: AuthPayload): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload as ApiError | null)?.message || "Authentication failed.";
    throw new Error(message);
  }

  return normalizeSession(payload);
}

export function login(payload: AuthPayload): Promise<AuthSession> {
  return postAuth("/api/auth/login", payload);
}

export function register(payload: AuthPayload): Promise<AuthSession> {
  return postAuth("/api/auth/register", payload);
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
