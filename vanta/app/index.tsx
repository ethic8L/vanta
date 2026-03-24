import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { getHasCompletedOnboarding } from "@/services/onboardingStorage";
import { hasAuthSession } from "@/services/authStorage";

export default function Splash() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(10)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 550,
        delay: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const navigateAfterBoot = async () => {
      const minimumDelay = new Promise((resolve) => setTimeout(resolve, 1600));
      const [hasCompletedOnboarding, authenticated] = await Promise.all([
        getHasCompletedOnboarding(),
        hasAuthSession(),
        minimumDelay,
      ]);

      if (!isMounted) {
        return;
      }

      if (!hasCompletedOnboarding) {
        router.replace("/onboarding");
        return;
      }

      router.replace(authenticated ? "/home" : "/auth");
    };

    void navigateAfterBoot();

    return () => {
      isMounted = false;
    };
  }, [logoOpacity, logoTranslateY, taglineOpacity]);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.logo,
          { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] },
        ]}
      >
        Vanta
      </Animated.Text>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        plan less. do more.
      </Animated.Text>

      <ActivityIndicator size="small" color="#8A8A8A" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    color: "#FFF",
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: 1.8,
  },
  tagline: {
    color: "#828282",
    fontSize: 14,
    marginTop: 10,
    letterSpacing: 0.6,
  },
  loader: {
    marginTop: 28,
  },
});
