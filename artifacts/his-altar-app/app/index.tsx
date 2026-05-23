import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import AltarSplash from "@/components/AltarSplash";

export default function LandingScreen() {
  const [splashDone, setSplashDone] = useState(false);
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

  if (!splashDone) {
    return <AltarSplash onDone={() => setSplashDone(true)} />;
  }

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
        <Text style={styles.enterBtnText}>ENTER SITE</Text>
      </Pressable>

      {/* Church Sign-In button */}
      <Pressable
        onPress={() => router.push("/org-login")}
        style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.75 : 1 }]}
      >
        <Text style={styles.signInBtnText}>CHURCH SIGN-IN</Text>
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
  signInBtn: {
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 64,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.4)",
  },
  signInBtnText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Georgia",
    fontSize: 13,
    letterSpacing: 2,
  },
  signupRow: { flexDirection: "row", marginTop: 28 },
  signupText: { fontFamily: "Georgia", fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.3)" },
  aboutWrap: { position: "absolute", right: 20 },
  aboutText: { color: "rgba(255,255,255,0.25)", fontFamily: "Georgia", fontSize: 10, letterSpacing: 4 },
});
