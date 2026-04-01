import { router } from "expo-router";
import { ReactNode, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  PanResponder,
  PanResponderGestureState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
  Animated,
  Easing,
  TouchableOpacityProps,
} from "react-native";
import {
  clearAuthSession,
  getCompletedTasks,
  getAuthUser,
  getSessions,
  saveCompletedTasks,
  saveSessions,
  type CompletedTaskRecord,
  type SessionRecord,
} from "@/services/authStorage";

function formatTime(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

const FOCUS_MIN_MINUTES = 1;
const FOCUS_MAX_MINUTES = 60;
const FOCUS_STEP_MINUTES = 1;

type CompletedTask = CompletedTaskRecord;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function FocusDurationSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const percent =
    (localValue - FOCUS_MIN_MINUTES) / (FOCUS_MAX_MINUTES - FOCUS_MIN_MINUTES);

  const updateFromX = (x: number) => {
    if (trackWidth <= 0) return localValue;

    const clampedX = clamp(x, 0, trackWidth);
    const rawValue =
      FOCUS_MIN_MINUTES +
      (clampedX / trackWidth) * (FOCUS_MAX_MINUTES - FOCUS_MIN_MINUTES);
    const stepped =
      Math.round(rawValue / FOCUS_STEP_MINUTES) * FOCUS_STEP_MINUTES;
    return clamp(stepped, FOCUS_MIN_MINUTES, FOCUS_MAX_MINUTES);
  };

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderHeaderRow}>
        <Text style={styles.sliderValue}>{value}m</Text>
        <Text style={styles.sliderHint}>Tap or slide to adjust</Text>
      </View>

      <View
        style={styles.sliderTrackTouchArea}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          const next = updateFromX(event.nativeEvent.locationX);
          setLocalValue(next);
        }}
        onResponderMove={(event) => {
          const next = updateFromX(event.nativeEvent.locationX);
          setLocalValue((prev) => (prev === next ? prev : next));
        }}
        onResponderRelease={(event) => {
          const next = updateFromX(event.nativeEvent.locationX);
          setLocalValue(next);
          onChange(next);
        }}
      >
        <View style={styles.sliderTrack} />
        <View style={[styles.sliderFill, { width: `${percent * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${percent * 100}%` }]} />
      </View>

      <View style={styles.sliderRangeRow}>
        <Text style={styles.sliderRangeText}>{FOCUS_MIN_MINUTES}m</Text>
        <Text style={styles.sliderRangeText}>{FOCUS_MAX_MINUTES}m</Text>
      </View>
    </View>
  );
}

function CompletedTaskRowContent({ task }: { task: CompletedTask }) {
  return (
    <View style={styles.completedTaskItem}>
      <View
        style={[
          styles.completedTaskBadge,
          task.status === "failed" && styles.completedTaskBadgeFailed,
        ]}
      >
        <Text
          style={[
            styles.completedTaskIcon,
            task.status === "failed" && styles.completedTaskIconFailed,
          ]}
        >
          {task.status === "success" ? "✓" : "✕"}
        </Text>
      </View>
      <View style={styles.completedTaskContent}>
        <View style={styles.completedTaskTopRow}>
          <Text style={styles.completedTaskText}>{task.name}</Text>
          <Text style={styles.completedTaskMeta}>
            {task.status === "success" ? "Completed" : "Failed early"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function FailedTaskSwipeRow({
  task,
  onDelete,
  onSwipeStateChange,
}: {
  task: CompletedTask;
  onDelete: () => void;
  onSwipeStateChange?: (isActive: boolean) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteActionOpacity = translateX.interpolate({
    inputRange: [-100, -28, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });
  const deleteActionTranslateX = translateX.interpolate({
    inputRange: [-100, 0],
    outputRange: [0, 8],
    extrapolate: "clamp",
  });

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > 6;
        if (isHorizontal) {
          onSwipeStateChange?.(true);
        }
        return isHorizontal;
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const x = Math.min(0, Math.max(-120, gestureState.dx));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        onSwipeStateChange?.(false);
        if (gestureState.dx <= -72) {
          Animated.timing(translateX, {
            toValue: -220,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDelete();
          });
          return;
        }
        resetPosition();
      },
      onPanResponderTerminate: () => {
        onSwipeStateChange?.(false);
        resetPosition();
      },
    }),
  ).current;

  return (
    <View style={styles.swipeRowWrap}>
      <Animated.View
        style={[
          styles.swipeDeleteAction,
          {
            opacity: deleteActionOpacity,
            transform: [{ translateX: deleteActionTranslateX }],
          },
        ]}
      >
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </Animated.View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <CompletedTaskRowContent task={task} />
      </Animated.View>
    </View>
  );
}

function ScaleButton({
  children,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: TouchableOpacityProps & { children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn: TouchableOpacityProps["onPressIn"] = (event) => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut: TouchableOpacityProps["onPressOut"] = (event) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 0,
    }).start();
    onPressOut?.(event);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        {...rest}
        style={style}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function GrowthShape({ completedCount }: { completedCount: number }) {
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

  if (completedCount >= 10) {
    return (
      <View style={styles.shapeCrossWrap}>
        <View style={styles.shapeCrossH} />
        <View style={styles.shapeCrossV} />
      </View>
    );
  }

  if (completedCount >= 5) {
    return <View style={styles.shapeLine} />;
  }

  return <View style={styles.shapeDot} />;
}

export default function Home() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [taskDraft, setTaskDraft] = useState("");
  const [activeTask, setActiveTask] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  const [voidMode, setVoidMode] = useState(false);
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sessionFailed, setSessionFailed] = useState(false);
  const [failedSessionTask, setFailedSessionTask] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const [successSessionTask, setSuccessSessionTask] = useState("");
  const [successSessionMinutes, setSuccessSessionMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [dailyFocusMinutes, setDailyFocusMinutes] = useState(0);
  const [isSwipingTask, setIsSwipingTask] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const voidModeStartTimeRef = useRef<number | null>(null);
  const hasHydratedRef = useRef(false);
  const completedListAnim = useRef(new Animated.Value(1)).current;

  const timerOpacity = useRef(new Animated.Value(0)).current;
  const timerScale = useRef(new Animated.Value(0.98)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      const user = await getAuthUser();
      const storedSessions = await getSessions();
      const storedCompletedTasks = await getCompletedTasks();

      if (!mounted) return;

      if (!user) {
        router.replace("/auth");
        return;
      }

      setName(user.name || "");
      setEmail(user.email);
      setSessions(storedSessions);
      setCompletedTasks(storedCompletedTasks);
      setCompletedCount(
        storedCompletedTasks.filter((task) => task.status === "success").length,
      );
      hasHydratedRef.current = true;
      setLoading(false);
    };

    void loadData();

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

      if (voidModeStartTimeRef.current !== null && activeTask) {
        const elapsedSeconds = Math.floor(
          (Date.now() - voidModeStartTimeRef.current) / 1000,
        );
        const isSuccess = elapsedSeconds >= focusSeconds;

        const session: SessionRecord = {
          id: Date.now().toString(),
          task: activeTask,
          durationMinutes: focusDurationMinutes,
          success: isSuccess,
          timestamp: Date.now(),
        };

        setSessions((prev) => [session, ...prev]);
        if (isSuccess) {
          setSessionSuccess(true);
          setSuccessSessionTask(activeTask);
          setSuccessSessionMinutes(focusDurationMinutes);
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        }
        voidModeStartTimeRef.current = null;
      }
      return;
    }

    voidModeStartTimeRef.current = Date.now();

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
  }, [
    voidMode,
    timerOpacity,
    timerScale,
    pulseScale,
    activeTask,
    focusDurationMinutes,
    focusSeconds,
  ]);

  useEffect(() => {
    if (!voidMode) return;

    if (focusSeconds <= 0) {
      setVoidMode(false);
      return;
    }

    const timer = setInterval(() => {
      setFocusSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [voidMode, focusSeconds]);

  useEffect(() => {
    if (voidMode) return;
    setFocusSeconds(focusDurationMinutes * 60);
  }, [focusDurationMinutes, voidMode]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    void saveSessions(sessions);

    const today = new Date().toISOString().split("T")[0];
    let todayMinutes = 0;
    let consecutive = 0;

    sessions.forEach((session) => {
      const sessionDate = new Date(session.timestamp)
        .toISOString()
        .split("T")[0];
      if (sessionDate === today && session.success) {
        todayMinutes += session.durationMinutes;
      }
    });

    setDailyFocusMinutes(todayMinutes);

    const sortedSessions = [...sessions].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    let currentDate = today;
    for (const session of sortedSessions) {
      if (!session.success) continue;

      const sessionDate = new Date(session.timestamp)
        .toISOString()
        .split("T")[0];
      const expectedDate = new Date(
        new Date(currentDate).getTime() - consecutive * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];

      if (sessionDate === expectedDate) {
        consecutive++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    if (sortedSessions.length > 0) {
      const lastSession = sortedSessions[0];
      const lastSessionDate = new Date(lastSession.timestamp)
        .toISOString()
        .split("T")[0];
      if (lastSessionDate !== today) {
        consecutive = 0;
      }
    }

    setStreak(consecutive);
  }, [sessions]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    void saveCompletedTasks(completedTasks);
    setCompletedCount(
      completedTasks.filter((task) => task.status === "success").length,
    );
  }, [completedTasks]);

  useEffect(() => {
    if (completedTasks.length === 0) return;

    completedListAnim.setValue(0.7);
    Animated.timing(completedListAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [completedTasks, completedListAnim]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      const leftApp =
        prev === "active" &&
        (nextState === "inactive" || nextState === "background");

      if (voidMode && leftApp) {
        if (voidModeStartTimeRef.current !== null && activeTask) {
          const elapsedSeconds = Math.floor(
            (Date.now() - voidModeStartTimeRef.current) / 1000,
          );
          const isSuccess = elapsedSeconds >= focusSeconds;

          const session: SessionRecord = {
            id: Date.now().toString(),
            task: activeTask,
            durationMinutes: focusDurationMinutes,
            success: isSuccess,
            timestamp: Date.now(),
          };

          setSessions((prev) => [session, ...prev]);
          voidModeStartTimeRef.current = null;
        }
        setVoidMode(false);
        setFocusSeconds(focusDurationMinutes * 60);
      }
    });

    return () => sub.remove();
  }, [voidMode, focusDurationMinutes, activeTask, focusSeconds]);

  const handleSetTask = () => {
    const value = taskDraft.trim();
    if (!value || activeTask) return;
    setActiveTask(value);
    setTaskDraft("");
  };

  const handleCompleteTask = () => {
    if (!activeTask) return;
    setCompletedTasks((prev) => [
      { name: activeTask, status: "success", timestamp: Date.now() },
      ...prev,
    ]);
    setActiveTask("");
    setVoidMode(false);
    setFocusSeconds(focusDurationMinutes * 60);
    voidModeStartTimeRef.current = null;
  };

  const handleEnterVoidMode = () => {
    if (!activeTask) return;
    setFocusSeconds(focusDurationMinutes * 60);
    setVoidMode(true);
    Vibration.vibrate(100);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleExitVoidMode = () => {
    Vibration.vibrate([50, 30, 50]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (focusSeconds > 0) {
      setSessionFailed(true);
      setFailedSessionTask(activeTask);
      setCompletedTasks((prev) => [
        { name: activeTask, status: "failed", timestamp: Date.now() },
        ...prev,
      ]);
    }
    setVoidMode(false);
    setFocusSeconds(focusDurationMinutes * 60);
    voidModeStartTimeRef.current = null;
  };

  const dismissFailedSession = () => {
    setSessionFailed(false);
    setFailedSessionTask("");
    setActiveTask("");
    setTaskDraft("");
  };

  const dismissSuccessSession = () => {
    setSessionSuccess(false);
    setSuccessSessionTask("");
    setSuccessSessionMinutes(0);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
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

  if (sessionSuccess) {
    return (
      <Modal
        visible={sessionSuccess}
        transparent={true}
        animationType="fade"
        onRequestClose={dismissSuccessSession}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIndicator}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Session Complete</Text>
            <Text style={styles.successTask}>{`"${successSessionTask}"`}</Text>
            <Text style={styles.successMessage}>
              You stayed focused for {successSessionMinutes} minutes.
            </Text>
            <ScaleButton
              style={styles.successDismissBtn}
              onPress={dismissSuccessSession}
            >
              <Text style={styles.successDismissBtnText}>Awesome</Text>
            </ScaleButton>
          </View>
        </View>
      </Modal>
    );
  }

  if (sessionFailed) {
    return (
      <Modal
        visible={sessionFailed}
        transparent={true}
        animationType="fade"
        onRequestClose={dismissFailedSession}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.failureIndicator}>
              <Text style={styles.failureIcon}>✕</Text>
            </View>
            <Text style={styles.failureTitle}>Session Failed</Text>
            <Text style={styles.failureTask}>{`"${failedSessionTask}"`}</Text>
            <Text style={styles.failureMessage}>
              You exited before completing the full duration.
            </Text>
            <ScaleButton
              style={styles.failureDismissBtn}
              onPress={dismissFailedSession}
            >
              <Text style={styles.failureDismissBtnText}>Got it</Text>
            </ScaleButton>
          </View>
        </View>
      </Modal>
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

        <ScaleButton style={styles.voidExitButton} onPress={handleExitVoidMode}>
          <Text style={styles.voidExitText}>End focus</Text>
        </ScaleButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isSwipingTask}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>Vanta</Text>

          <ScaleButton
            style={styles.menuButton}
            onPress={() => setMenuOpen((prev) => !prev)}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </ScaleButton>
        </View>

        {menuOpen && (
          <View style={styles.menuPanel}>
            <Text style={styles.menuLabel}>Signed in as</Text>
            <Text style={styles.menuUser}>{name || "User"}</Text>
            <Text style={styles.menuEmail}>{email}</Text>

            <ScaleButton
              style={styles.menuSignOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.menuSignOutText}>Sign out</Text>
            </ScaleButton>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>One Task Rule</Text>

          {activeTask ? (
            <>
              <Text style={styles.activeLabel}>Current active task</Text>
              <Text style={styles.activeTask}>{activeTask}</Text>

              <Text style={styles.durationLabel}>Focus duration</Text>
              <FocusDurationSlider
                value={focusDurationMinutes}
                onChange={setFocusDurationMinutes}
              />

              <View style={styles.row}>
                <ScaleButton
                  style={styles.primaryBtn}
                  onPress={handleEnterVoidMode}
                >
                  <Text style={styles.primaryBtnText}>
                    Start {focusDurationMinutes}m Focus
                  </Text>
                </ScaleButton>

                <ScaleButton
                  style={styles.ghostBtn}
                  onPress={handleCompleteTask}
                >
                  <Text style={styles.ghostBtnText}>Complete</Text>
                </ScaleButton>
              </View>
            </>
          ) : (
            <>
              <TextInput
                value={taskDraft}
                onChangeText={setTaskDraft}
                placeholder="What deserves your full attention?"
                placeholderTextColor="#6E6E6E"
                style={styles.input}
              />
              <ScaleButton
                style={styles.setTaskBtn}
                onPress={handleSetTask}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Start Focus Task</Text>
              </ScaleButton>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today{`'`}s Focus</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Focus Time</Text>
              <Text style={styles.summaryValue}>{dailyFocusMinutes}m</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Streak</Text>
              <Text style={styles.summaryValue}>{streak}d</Text>
            </View>
          </View>
          <Text style={styles.summaryMessage}>
            You focused for {dailyFocusMinutes} minutes today.
          </Text>
        </View>

        {completedTasks.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Completed Tasks</Text>
            <Animated.View
              style={{
                opacity: completedListAnim,
                transform: [
                  {
                    translateY: completedListAnim.interpolate({
                      inputRange: [0.7, 1],
                      outputRange: [6, 0],
                    }),
                  },
                ],
              }}
            >
              {completedTasks.slice(0, 8).map((task, idx) => (
                <FailedTaskSwipeRow
                  key={`${task.name}-${task.timestamp}-${idx}`}
                  task={task}
                  onDelete={() =>
                    setCompletedTasks((prev) =>
                      prev.filter((_, rowIdx) => rowIdx !== idx),
                    )
                  }
                  onSwipeStateChange={setIsSwipingTask}
                />
              ))}
            </Animated.View>
          </View>
        )}

        {sessions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Session History</Text>
            {sessions.slice(0, 5).map((session) => (
              <View key={session.id} style={styles.sessionItem}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionTask}>{session.task}</Text>
                  <View
                    style={[
                      styles.sessionBadge,
                      session.success
                        ? styles.sessionBadgeSuccess
                        : styles.sessionBadgeFail,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sessionBadgeText,
                        session.success
                          ? styles.sessionBadgeTextSuccess
                          : styles.sessionBadgeTextFail,
                      ]}
                    >
                      {session.success ? "✓" : "✕"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sessionMeta}>
                  {session.durationMinutes}m •{" "}
                  {new Date(session.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  menuLine: {
    width: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#EAEAEA",
  },
  menuPanel: {
    backgroundColor: "#0F0F10",
    borderColor: "rgba(255,255,255,0.06)",
    borderWidth: 0.8,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  menuLabel: {
    color: "#8D8D8D",
    fontSize: 12,
    marginBottom: 6,
  },
  menuUser: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  menuEmail: {
    color: "#B1B1B1",
    marginTop: 2,
    marginBottom: 12,
    fontSize: 13,
  },
  menuSignOutButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    paddingVertical: 10,
    alignItems: "center",
  },
  menuSignOutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },

  card: {
    backgroundColor: "#0F0F10",
    borderColor: "rgba(255,255,255,0.06)",
    borderWidth: 0.8,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 10,
  },
  durationLabel: {
    color: "#8C8C8C",
    fontSize: 12,
    marginBottom: 8,
  },
  sliderWrap: {
    marginBottom: 12,
  },
  sliderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sliderValue: {
    color: "#EDEDED",
    fontSize: 16,
    fontWeight: "700",
  },
  sliderHint: {
    color: "#7E7E7E",
    fontSize: 11,
  },
  sliderTrackTouchArea: {
    height: 30,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 6,
    backgroundColor: "#222222",
    borderRadius: 999,
    width: "100%",
    position: "absolute",
  },
  sliderFill: {
    height: 6,
    backgroundColor: "#EDEDED",
    borderRadius: 999,
    position: "absolute",
    left: 0,
  },
  sliderThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111111",
    top: 6,
    marginLeft: -9,
  },
  sliderRangeRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderRangeText: {
    color: "#666666",
    fontSize: 11,
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
  setTaskBtn: {
    backgroundColor: "#DCDCDC",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BEBEBE",
  },
  primaryBtnText: {
    color: "#0A0A0A",
    fontWeight: "600",
    fontSize: 14,
  },
  primaryBtnHint: {
    color: "#3C3C3C",
    fontWeight: "500",
    fontSize: 11,
    marginTop: 2,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#CFCFCF",
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  shapeLine: {
    width: 44,
    height: 2,
    borderRadius: 1,
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

  sessionItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sessionTask: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  sessionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sessionBadgeSuccess: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  sessionBadgeFail: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.4)",
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sessionBadgeTextSuccess: {
    color: "#4CAF50",
  },
  sessionBadgeTextFail: {
    color: "#F44336",
  },
  sessionMeta: {
    color: "#7F7F7F",
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#0F0F10",
    borderRadius: 20,
    padding: 28,
    width: "85%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  failureIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(244, 67, 54, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(244, 67, 54, 0.4)",
  },
  failureIcon: {
    fontSize: 32,
    color: "#F44336",
    fontWeight: "bold",
  },
  failureTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  failureTask: {
    color: "#B3B3B3",
    fontSize: 15,
    marginBottom: 12,
    fontStyle: "italic",
  },
  failureMessage: {
    color: "#7F7F7F",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  failureDismissBtn: {
    backgroundColor: "#EDEDED",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: "center",
  },
  failureDismissBtnText: {
    color: "#0A0A0A",
    fontWeight: "600",
    fontSize: 14,
  },

  successIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  successIcon: {
    fontSize: 32,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  successTask: {
    color: "#B3B3B3",
    fontSize: 15,
    marginBottom: 12,
    fontStyle: "italic",
  },
  successMessage: {
    color: "#8BCB8E",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  successDismissBtn: {
    backgroundColor: "#EDEDED",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: "center",
  },
  successDismissBtnText: {
    color: "#0A0A0A",
    fontWeight: "600",
    fontSize: 14,
  },

  completedTaskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  completedTaskBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  completedTaskBadgeFailed: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
    borderColor: "rgba(244, 67, 54, 0.4)",
  },
  completedTaskIcon: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  completedTaskIconFailed: {
    color: "#F44336",
  },
  completedTaskText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  completedTaskContent: {
    flex: 1,
  },
  completedTaskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  completedTaskMeta: {
    color: "#808080",
    fontSize: 12,
    textAlign: "right",
  },

  swipeRowWrap: {
    position: "relative",
    overflow: "hidden",
  },
  swipeDeleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 110,
    backgroundColor: "rgba(244, 67, 54, 0.18)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  swipeDeleteText: {
    color: "#F44336",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    color: "#7F7F7F",
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#EDEDED",
    fontSize: 24,
    fontWeight: "700",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 12,
  },
  summaryMessage: {
    color: "#B1B1B1",
    fontSize: 13,
    textAlign: "center",
  },
});
