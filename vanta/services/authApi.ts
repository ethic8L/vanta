import Constants from "expo-constants";
import { Platform } from "react-native";
import { AuthSession } from "@/services/authStorage";

function getExpoHost(): string | null {
  const expoConfigHost = Constants.expoConfig?.hostUri;
  if (expoConfigHost) {
    return expoConfigHost.split(":")[0] ?? null;
  }

  const legacyHost = (Constants.manifest as { debuggerHost?: string } | null)
    ?.debuggerHost;
  if (legacyHost) {
    return legacyHost.split(":")[0] ?? null;
  }

  return null;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    return `http://${expoHost}:4000`;
  }

  // Android emulator localhost mapping fallback.
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
}

const API_BASE_URL = resolveApiBaseUrl();

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
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Network request failed. Backend not reachable at ${API_BASE_URL}.`,
    );
  }

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
