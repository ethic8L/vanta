import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { login, register } from "@/services/authApi";
import { saveAuthSession } from "@/services/authStorage";
import { setHasCompletedOnboarding } from "@/services/onboardingStorage";

type AuthMode = "login" | "register";
type FocusField = "name" | "email" | "password" | "confirmPassword" | null;

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  const isRegister = mode === "register";

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (isRegister && trimmedName.length < 2) {
      setErrorMessage("Name must be at least 2 characters.");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const session = isRegister
        ? await register({ name: trimmedName, email: trimmedEmail, password })
        : await login({ email: trimmedEmail, password });

      await saveAuthSession(session);
      await setHasCompletedOnboarding(true);
      router.replace("/home");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((current) => (current === "login" ? "register" : "login"));
    setErrorMessage("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View>
          <Text style={styles.brand}>Vanta</Text>
          <Text style={styles.title}>
            {isRegister ? "Create account" : "Welcome back"}
          </Text>
          <Text style={styles.subtitle}>
            {isRegister
              ? "Start your focused productivity journey."
              : "Sign in to continue where you left off."}
          </Text>
        </View>

        <View style={styles.form}>
          {isRegister ? (
            <TextInput
              style={[
                styles.input,
                focusedField === "name" && styles.inputFocused,
              ]}
              placeholder="Name"
              placeholderTextColor="#6E6E6E"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              selectionColor="#A78BFA"
            />
          ) : null}

          <TextInput
            style={[
              styles.input,
              focusedField === "email" && styles.inputFocused,
            ]}
            placeholder="Email"
            placeholderTextColor="#6E6E6E"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            selectionColor="#A78BFA"
          />

          <TextInput
            style={[
              styles.input,
              focusedField === "password" && styles.inputFocused,
            ]}
            placeholder="Password"
            placeholderTextColor="#6E6E6E"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            selectionColor="#A78BFA"
          />

          {isRegister ? (
            <TextInput
              style={[
                styles.input,
                focusedField === "confirmPassword" && styles.inputFocused,
              ]}
              placeholder="Confirm password"
              placeholderTextColor="#6E6E6E"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
              selectionColor="#A78BFA"
            />
          ) : null}

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A0A" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isRegister ? "Create account" : "Sign in"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
            {isRegister ? (
              <Text style={styles.switchText}>
                Already have an account?{" "}
                <Text style={styles.switchAction}>Sign in</Text>
              </Text>
            ) : (
              <Text style={styles.switchText}>
                New here?{" "}
                <Text style={styles.switchAction}>Create account</Text>
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  brand: {
    color: "#EAEAEA",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "600",
    marginTop: 28,
    lineHeight: 40,
  },
  subtitle: {
    color: "#8F8F8F",
    fontSize: 16,
    marginTop: 10,
    lineHeight: 23,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: "#111111",
    color: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1D1D1D",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: "#A78BFA",
    backgroundColor: "#141414",
  },
  error: {
    color: "#FF7A7A",
    fontSize: 14,
    marginTop: 2,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonText: {
    color: "#0A0A0A",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 6,
    marginTop: 4,
  },
  switchText: {
    color: "#AAAAAA",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  switchAction: {
    color: "#CFCFCF",
    textDecorationLine: "underline",
    textDecorationColor: "#AFAFAF",
  },
});
