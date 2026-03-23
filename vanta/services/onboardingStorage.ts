import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "vanta:onboarding-complete";

export async function getHasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setHasCompletedOnboarding(
  hasCompleted = true,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ONBOARDING_COMPLETE_KEY,
      hasCompleted ? "true" : "false",
    );
  } catch {
    // No-op to avoid blocking app navigation in case storage fails.
  }
}
