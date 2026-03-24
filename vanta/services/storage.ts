import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryStore = new Map<string, string>();

function getWebStorage(): Storage | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const maybeWindow = globalThis as typeof globalThis & {
    localStorage?: Storage;
  };

  return maybeWindow.localStorage ?? null;
}

function readFallback(key: string): string | null {
  const webStorage = getWebStorage();

  if (webStorage) {
    try {
      const value = webStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // Ignore web storage read errors and continue.
    }
  }

  return memoryStore.get(key) ?? null;
}

function writeFallback(key: string, value: string): void {
  memoryStore.set(key, value);

  const webStorage = getWebStorage();
  if (!webStorage) {
    return;
  }

  try {
    webStorage.setItem(key, value);
  } catch {
    // Ignore web storage write errors.
  }
}

function removeFallback(key: string): void {
  memoryStore.delete(key);

  const webStorage = getWebStorage();
  if (!webStorage) {
    return;
  }

  try {
    webStorage.removeItem(key);
  } catch {
    // Ignore web storage remove errors.
  }
}

export async function safeGetItem(key: string): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch {
    // Fall back below when native module is unavailable.
  }

  return readFallback(key);
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Ignore and use fallback storage.
  }

  writeFallback(key, value);
}

export async function safeMultiSet(entries: [string, string][]): Promise<void> {
  try {
    await AsyncStorage.multiSet(entries);
  } catch {
    // Ignore and use fallback storage.
  }

  entries.forEach(([key, value]) => {
    writeFallback(key, value);
  });
}

export async function safeMultiRemove(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {
    // Ignore and use fallback storage.
  }

  keys.forEach((key) => {
    removeFallback(key);
  });
}
