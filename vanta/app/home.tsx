import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing,
} from "react-native";
import { clearAuthSession, getAuthUser } from "@/services/authStorage";

function formatTime(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function GrowthShape({ completedCount }: { completedCount: number }) {
  // 30+ sessions: complex identity form
  if (completedCount >= 30) {
    return (
      <View style={styles.shapeComplexWrap}>
        <View style={styles.shapeComplexCore} />
        <View style={styles.shapeComplexArmH} />
        <View style={styles.shapeComplexArmV} />
        <View style={styles.shapeComplexRing} />
      </View>
    );
  }

  // 5-29 sessions: cross
  if (completedCount >= 5) {
    return (
      <View style={styles.shapeCrossWrap}>
        <View style={styles.shapeCrossH} />
        <View style={styles.shapeCrossV} />
      </View>
    );
  }

  // 0-4 sessions: dot
  return <View style={styles.shapeDot} />;
}

export default function Home() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [taskDraft, setTaskDraft] = useState("");
  const [activeTask, setActiveTask] = useState("");
  const [completedCount, setCompletedCount] = useState(0);

  const [voidMode, setVoidMode] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const timerOpacity = useRef(new Animated.Value(0)).current;
  const timerScale = useRef(new Animated.Value(0.98)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const user = await getAuthUser();

      if (!mounted) return;

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

  useEffect(() => {
    if (!voidMode) {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      timerOpacity.setValue(0);
      timerScale.setValue(0.98);
      pulseScale.setValue(1);
      return;
    }

    // enter animation
    Animated.parallel([
      Animated.timing(timerOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(timerScale, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // subtle pulse loop
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.012,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();
    });

    return () => {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    };
  }, [voidMode, timerOpacity, timerScale, pulseScale]);

  useEffect(() => {
    if (!voidMode) return;

    const timer = setInterval(() => {
      setFocusSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [voidMode]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      const leftApp =
        prev === "active" &&
        (nextState === "inactive" || nextState === "background");

      if (voidMode && leftApp) {
        setVoidMode(false);
        setFocusSeconds(0);
      }
    });

    return () => sub.remove();
  }, [voidMode]);

  const handleSetTask = () => {
    const value = taskDraft.trim();
    if (!value || activeTask) return;
    setActiveTask(value);
    setTaskDraft("");
  };

  const handleCompleteTask = () => {
    if (!activeTask) return;
    setCompletedCount((prev) => prev + 1);
    setActiveTask("");
    setVoidMode(false);
    setFocusSeconds(0);
  };

  const handleEnterVoidMode = () => {
    if (!activeTask) return;
    setVoidMode(true);
    setFocusSeconds(0);
  };

  const handleExitVoidMode = () => {
    setVoidMode(false);
  };

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

  if (voidMode) {
    return (
      <View style={styles.voidContainer}>
        <Animated.Text
          style={[
            styles.voidTimer,
            {
              opacity: timerOpacity,
              transform: [{ scale: timerScale }, { scale: pulseScale }],
            },
          ]}
        >
          {formatTime(focusSeconds)}
        </Animated.Text>

        <Text style={styles.voidTask}>{activeTask}</Text>
        <Text style={styles.voidHint}>Leaving will reset your progress.</Text>

        <TouchableOpacity
          style={styles.voidExitButton}
          onPress={handleExitVoidMode}
        >
          <Text style={styles.voidExitText}>End focus</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Vanta</Text>
      <Text style={styles.user}>{name ? `${name} · ${email}` : email}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>One Task Rule</Text>

        {activeTask ? (
          <>
            <Text style={styles.activeLabel}>Current active task</Text>
            <Text style={styles.activeTask}>{activeTask}</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleEnterVoidMode}
              >
                <Text style={styles.primaryBtnText}>Enter Void Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleCompleteTask}
              >
                <Text style={styles.ghostBtnText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TextInput
              value={taskDraft}
              onChangeText={setTaskDraft}
              placeholder="Focus on one thing…"
              placeholderTextColor="#6E6E6E"
              style={styles.input}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSetTask}>
              <Text style={styles.primaryBtnText}>Set Active Task</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Abstract Growth</Text>
        <GrowthShape completedCount={completedCount} />
        <Text style={styles.growthText}>
          Completed sessions: {completedCount}
        </Text>
        <Text style={styles.growthHint}>
          Day 1: dot · Day 5: line · Day 30: form
        </Text>
      </View>

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
    paddingHorizontal: 20,
    paddingTop: 68,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  user: {
    color: "#8D8D8D",
    marginTop: 6,
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#0F0F10",
    borderColor: "rgba(255,255,255,0.06)",
    borderWidth: 0.8,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,

    // premium soft depth
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionTitle: {
    color: "#F5F5F5",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: "#8C8C8C",
    fontSize: 13,
    marginBottom: 8,
  },
  activeTask: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 14,
  },
  input: {
    backgroundColor: "#151515",
    borderColor: "#262626",
    borderWidth: 1,
    borderRadius: 12,
    color: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#EDEDED",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  primaryBtnText: {
    color: "#0A0A0A",
    fontWeight: "600",
    fontSize: 14,
  },
  ghostBtn: {
    borderRadius: 12,
    borderColor: "#333333",
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: {
    color: "#AAAAAA",
    fontWeight: "500",
    fontSize: 14,
  },

  shapeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#CFCFCF",
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 10,
  },

  shapeCrossWrap: {
    width: 56,
    height: 56,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  shapeCrossH: {
    position: "absolute",
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#CFCFCF",
  },
  shapeCrossV: {
    position: "absolute",
    width: 2,
    height: 40,
    borderRadius: 1,
    backgroundColor: "#CFCFCF",
  },

  shapeComplexWrap: {
    width: 72,
    height: 72,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  shapeComplexCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#CFCFCF",
  },
  shapeComplexArmH: {
    position: "absolute",
    width: 52,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#CFCFCF",
  },
  shapeComplexArmV: {
    position: "absolute",
    width: 2,
    height: 52,
    borderRadius: 1,
    backgroundColor: "#CFCFCF",
  },
  shapeComplexRing: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.2,
    borderColor: "rgba(207,207,207,0.55)",
  },

  growthText: {
    color: "#E0E0E0",
    textAlign: "center",
    fontSize: 14,
  },
  growthHint: {
    color: "#7F7F7F",
    textAlign: "center",
    marginTop: 6,
    fontSize: 12,
  },

  signOutButton: {
    marginTop: "auto",
    marginBottom: 26,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },

  voidContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  voidTimer: {
    color: "#FFFFFF",
    fontSize: 62,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  voidTask: {
    color: "#B3B3B3",
    marginTop: 14,
    fontSize: 16,
    textAlign: "center",
  },
  voidHint: {
    color: "#666666",
    marginTop: 10,
    fontSize: 12,
  },
  voidExitButton: {
    marginTop: 28,
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  voidExitText: {
    color: "#BFBFBF",
    fontSize: 14,
  },
});
