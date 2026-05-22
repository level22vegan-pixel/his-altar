import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Caller { id: number; name: string; campus: string; }

export default function CallerLoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginCaller } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Name picker after biometric success
  const [showNamePicker, setShowNamePicker] = useState(false);
  const [callers, setCallers] = useState<Caller[]>([]);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (has) LocalAuthentication.isEnrolledAsync().then(setBiometricAvailable);
    });
  }, []);

  async function fetchCallers() {
    try {
      const res = await fetch(`${BASE_URL}/api/pxp/callers`);
      if (res.ok) {
        const data = await res.json();
        setCallers(data.callers ?? []);
      }
    } catch {}
  }

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/pxp/callers/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loginCaller(data.caller.id, data.caller.name, data.caller.campus ?? "");
        router.replace("/admin/pxp/logs" as any);
        return;
      }
      setError("Invalid code. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCode("");
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function tryFaceId() {
    setError("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate as Caller",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchCallers();
        setShowNamePicker(true);
      } else {
        setError("Biometric not confirmed.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError("Face ID not available.");
    }
  }

  function selectCaller(c: Caller) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loginCaller(c.id, c.name, c.campus ?? "");
    router.replace("/admin/pxp" as any);
  }

  // ── Name picker (post biometric) ──
  if (showNamePicker) {
    return (
      <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
        <View style={[styles.root, { paddingTop: topPad }]}>
          <Pressable onPress={() => setShowNamePicker(false)} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>SELECT YOUR NAME</Text>
          <ScrollView style={{ width: "100%", flex: 1 }} contentContainerStyle={{ gap: 8, paddingTop: 24, paddingBottom: 40 }}>
            {callers.length === 0 ? (
              <Text style={styles.hint}>No callers found. Ask admin to add you.</Text>
            ) : null}
            {callers.map((c) => (
              <Pressable key={c.id} onPress={() => selectCaller(c)}
                style={({ pressed }) => [styles.callerRow, { opacity: pressed ? 0.75 : 1 }]}>
                <View style={styles.callerAvatar}>
                  <Text style={styles.callerInitial}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.callerName}>{c.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    );
  }

  // ── Main sign-in screen ──
  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={[styles.root, { paddingTop: topPad }]}>

        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
        </Pressable>

        {/* Centered content */}
        <View style={styles.center}>
          <Text style={styles.title}>CALLER ACCESS</Text>

          {/* Code input + Face ID row */}
          <View style={styles.inputRow}>
            <Pressable style={styles.inputWrap} onPress={() => inputRef.current?.focus()}>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(v) => { setCode(v); setError(""); }}
                onSubmitEditing={submit}
                placeholder="Enter code"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="number-pad"
                secureTextEntry
                returnKeyType="go"
                style={styles.input}
                autoFocus
              />
            </Pressable>

            {biometricAvailable && (
              <Pressable onPress={tryFaceId} style={({ pressed }) => [styles.faceBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <LinearGradient
                  colors={["rgba(124,58,237,0.3)", "rgba(124,58,237,0.15)"]}
                  style={styles.faceBtnInner}
                >
                  <Ionicons name="scan-outline" size={26} color="#a78bfa" />
                </LinearGradient>
              </Pressable>
            )}
          </View>

          {/* Error */}
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          {/* Sign In button */}
          <Pressable
            onPress={submit}
            disabled={loading || !code.trim()}
            style={({ pressed }) => [styles.signInBtn, { opacity: pressed || loading || !code.trim() ? 0.5 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.signInText}>SIGN IN</Text>}
          </Pressable>
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", paddingHorizontal: 32 },
  back: { alignSelf: "flex-start", padding: 8 },

  // Centered block
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    width: "100%", gap: 0,
    // slight upward bias so title feels anchored above center
    marginTop: -60,
  },
  title: {
    fontSize: 20, fontFamily: "Georgia", letterSpacing: 6, color: "#fff",
    marginBottom: 40,
    textShadowColor: "rgba(167,139,250,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  // Input row
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%", marginBottom: 16 },
  inputWrap: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(124,58,237,0.4)",
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  input: {
    fontFamily: "Georgia", fontSize: 18, color: "#fff",
    paddingHorizontal: 18, paddingVertical: 16,
    letterSpacing: 4,
  },
  faceBtn: { borderRadius: 14 },
  faceBtnInner: {
    width: 58, height: 58, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.35)",
  },

  error: {
    fontFamily: "Georgia", fontSize: 12, color: "#f87171",
    textAlign: "center", marginBottom: 12,
  },

  // Sign-in button
  signInBtn: {
    marginTop: 8, width: "100%",
    backgroundColor: "#7c3aed", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  signInText: {
    fontFamily: "Georgia", fontSize: 13, color: "#fff", letterSpacing: 4,
  },

  // Name picker
  hint: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 20 },
  callerRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  callerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  callerInitial: { fontFamily: "Georgia", fontSize: 16, color: "#a78bfa" },
  callerName: { flex: 1, fontFamily: "Georgia", fontSize: 15, color: "#fff" },
});
