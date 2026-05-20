import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function PinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { loginCampus } = useAppContext();

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (cleaned && index < 3) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "") && cleaned) {
      submit(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: any) {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function submit(code: string) {
    setLoading(true);
    setError("");
    try {
      // Try campus code first
      const res = await fetch(`${BASE_URL}/api/campus-passwords/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const data = await res.json();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loginCampus(data.campus ?? "", data.role ?? "campus");
        router.replace("/team");
        return;
      }

      // Fallback: try admin password
      const adminRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: code }),
      });
      const adminData = await adminRes.json().catch(() => ({}));
      if (adminData.valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loginCampus("ADMIN", "admin");
        router.replace("/team");
        return;
      }

      // Try org login sequence as fallback
      const seqRes = await fetch(`${BASE_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: code.split("").map(Number) }),
      });
      const seqData = await seqRes.json().catch(() => ({}));
      if (seqData.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loginCampus(seqData.campus ?? "", seqData.role ?? "campus");
        router.replace("/team");
        return;
      }

      setError("Invalid code. Please try again.");
      setDigits(["", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 50);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      setError("Connection error. Please try again.");
      setDigits(["", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]}
      locations={[0, 0.6, 1]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: topPad }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Purple glow */}
        <View style={styles.bgGlow} pointerEvents="none" />

        <View style={styles.content}>
          <Text style={styles.title}>Campus Access</Text>
          <Text style={styles.sub}>Enter your 4-digit campus code</Text>

          {/* 4 digit boxes */}
          <View style={styles.digitRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                value={d}
                onChangeText={(v) => handleChange(i, v)}
                onKeyPress={(e) => handleKeyDown(i, e)}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                editable={!loading}
                style={[
                  styles.digitBox,
                  {
                    borderColor: d ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.15)",
                    backgroundColor: d ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                  },
                ]}
              />
            ))}
          </View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="rgba(180,140,255,0.7)" size="small" />
              <Text style={styles.loadingText}>Verifying…</Text>
            </View>
          ) : null}

          {/* Forgot code / email fallback */}
          <Pressable
            onPress={() => router.push("/org-login")}
            style={{ marginTop: 36 }}
          >
            <Text style={styles.forgotText}>Forgot your code? Sign in with email →</Text>
          </Pressable>
        </View>

        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  bgGlow: {
    position: "absolute",
    top: "30%", left: "50%",
    width: 480, height: 480,
    marginLeft: -240, marginTop: -240,
    borderRadius: 240,
    backgroundColor: "rgba(120,60,200,0.07)",
  },
  content: { width: "100%", maxWidth: 360, paddingHorizontal: 24, alignItems: "center", zIndex: 1 },
  title: { color: "#ffffff", fontFamily: "Georgia", fontSize: 24, fontWeight: "400", letterSpacing: 1.5, textShadowColor: "rgba(180,140,255,0.6)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  sub: { color: "rgba(255,255,255,0.3)", fontFamily: "Georgia", fontSize: 12, letterSpacing: 2, marginTop: 10, marginBottom: 40 },
  digitRow: { flexDirection: "row", gap: 14, marginBottom: 24 },
  digitBox: {
    width: 68, height: 80,
    borderWidth: 1.5, borderRadius: 14,
    fontFamily: "Georgia", fontSize: 36, fontWeight: "400",
    textAlign: "center",
  },
  error: { color: "rgba(255,100,100,0.9)", fontFamily: "Georgia", fontSize: 13, letterSpacing: 1, textAlign: "center" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  loadingText: { color: "rgba(180,140,255,0.6)", fontFamily: "Georgia", fontSize: 13 },
  forgotText: { color: "rgba(180,140,255,0.5)", fontFamily: "Georgia", fontSize: 11, letterSpacing: 1.5, textAlign: "center" },
  back: { position: "absolute", bottom: 48, alignSelf: "center" },
  backText: { color: "rgba(255,255,255,0.22)", fontFamily: "Georgia", fontSize: 12, letterSpacing: 2 },
});
