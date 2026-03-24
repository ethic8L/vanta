import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { clearAuthSession, getAuthUser } from "@/services/authStorage";

export default function Home() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const user = await getAuthUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        router.replace("/auth");
        return;
      }

      setName(user.name || "");
      setEmail(user.email);
      setLoading(false);
    };

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await clearAuthSession();
    router.replace("/auth");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#8A8A8A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You are signed in</Text>
      <Text style={styles.subtitle}>{name ? `${name} · ${email}` : email}</Text>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "600",
  },
  subtitle: {
    color: "#8F8F8F",
    marginTop: 10,
    fontSize: 15,
  },
  signOutButton: {
    marginTop: 26,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
});
