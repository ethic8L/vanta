import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getHasCompletedOnboarding,
  setHasCompletedOnboarding,
} from "@/services/onboardingStorage";

type OnboardingSlide = {
  id: string;
  title: string;
  subtitle: string;
};

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    title: "Capture what matters",
    subtitle: "Quickly add tasks and keep your day clear, simple, and focused.",
  },
  {
    id: "2",
    title: "Focus on one thing",
    subtitle:
      "Minimal view, zero noise. Work in calm sessions and finish faster.",
  },
  {
    id: "3",
    title: "Build consistent habits",
    subtitle:
      "Small daily wins compound. Track progress and stay in your momentum.",
  },
];

export default function Onboarding() {
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const visibleIndex = viewableItems[0]?.index;
      if (visibleIndex !== null && visibleIndex !== undefined) {
        setCurrentIndex(visibleIndex);
      }
    },
  ).current;

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60 }),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const checkCompletionState = async () => {
      const hasCompletedOnboarding = await getHasCompletedOnboarding();

      if (isMounted && hasCompletedOnboarding) {
        router.replace("/home");
      }
    };

    void checkCompletionState();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSkip = () => {
    flatListRef.current?.scrollToIndex({
      index: ONBOARDING_SLIDES.length - 1,
      animated: true,
    });
  };

  const handleNext = () => {
    if (isLastSlide) {
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  const handleStart = async () => {
    await setHasCompletedOnboarding(true);
    router.replace("/home");
  };

  const renderSlide: ListRenderItem<OnboardingSlide> = ({ item }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>Vanta</Text>

        {!isLastSlide ? (
          <TouchableOpacity onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dotRow}>
          {ONBOARDING_SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {isLastSlide ? (
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleStart}>
            <Text style={styles.buttonPrimaryText}>Get started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.buttonSecondary} onPress={handleNext}>
            <Text style={styles.buttonSecondaryText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  headerRow: {
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: "#F3F3F3",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  skipText: {
    color: "#9A9A9A",
    fontSize: 15,
    fontWeight: "500",
  },
  skipPlaceholder: {
    width: 36,
    height: 20,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#FFF",
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: 0.3,
    lineHeight: 41,
  },
  subtitle: {
    color: "#8F8F8F",
    fontSize: 17,
    marginTop: 14,
    lineHeight: 25,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  dotRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#2A2A2A",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#FFFFFF",
  },
  buttonPrimary: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonPrimaryText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    backgroundColor: "#141414",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  buttonSecondaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
