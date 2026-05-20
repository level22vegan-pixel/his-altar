import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function LandingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 0 : insets.bottom;

  const glowOpacity = useSharedValue(0.75);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.75, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <LinearGradient
      colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]}
      locations={[0, 0.6, 1]}
      style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad + 40 }]}
    >
      {/* Background purple glow */}
      <View style={styles.bgGlow} pointerEvents="none" />

      {/* Title */}
      <View style={styles.hero}>
        <Animated.Text style={[styles.title, glowStyle]}>
          His Altar
        </Animated.Text>
      </View>

      {/* Enter Site button */}
      <Pressable
        onPress={() => router.push("/pin")}
        style={({ pressed }) => [styles.enterBtn, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={styles.enterBtnText}>Enter Site</Text>
      </Pressable>

      {/* Sign up subtext */}
      <Pressable onPress={() => router.push("/org-signup")} style={styles.signupRow}>
        <Text style={styles.signupText}>New church? </Text>
        <Text style={[styles.signupText, { color: colors.lavender }]}>Sign up</Text>
      </Pressable>

      {/* About link top right */}
      <View style={[styles.aboutWrap, { top: topPad + 16 }]}>
        <Text style={styles.aboutText}>ABOUT US</Text>
      </View>

      {/* App Store badges */}
      <View style={[styles.appStores, { bottom: bottomPad + 28 }]}>
        <View style={[styles.storeBadge, { borderColor: colors.border }]}>
          <Text style={styles.storeText}> App Store</Text>
        </View>
        <View style={[styles.storeBadge, { borderColor: colors.border }]}>
          <Text style={styles.storeText}> Google Play</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  bgGlow: {
    position: "absolute",
    top: "30%",
    left: "50%",
    width: 400,
    height: 400,
    marginLeft: -200,
    marginTop: -200,
    borderRadius: 200,
    backgroundColor: "rgba(120,60,200,0.08)",
  },
  hero: { alignItems: "center", marginBottom: 56 },
  title: {
    color: "#ffffff",
    fontFamily: "Georgia",
    fontSize: 32,
    fontWeight: "400",
    letterSpacing: 2,
    textShadowColor: "rgba(180,140,255,0.85)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  enterBtn: {
    paddingVertical: 18,
    paddingHorizontal: 64,
    backgroundColor: "#7c3aed",
    borderRadius: 50,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  enterBtnText: {
    color: "#ffffff",
    fontFamily: "Georgia",
    fontSize: 17,
    letterSpacing: 2,
  },
  signupRow: { flexDirection: "row", marginTop: 28 },
  signupText: { fontFamily: "Georgia", fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.3)" },
  aboutWrap: { position: "absolute", right: 20 },
  aboutText: { color: "rgba(255,255,255,0.25)", fontFamily: "Georgia", fontSize: 10, letterSpacing: 4 },
  appStores: { position: "absolute", flexDirection: "row", gap: 12 },
  storeBadge: { flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderRadius: 10 },
  storeText: { color: "rgba(255,255,255,0.7)", fontFamily: "Georgia", fontSize: 12 },
});
