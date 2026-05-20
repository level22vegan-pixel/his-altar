import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Mode = "choose" | "faceid" | "name-code" | "code";

interface Caller {
  id: number;
  name: string;
  campus: string;
}

export default function CallerLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loginCaller } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [mode, setMode] = useState<Mode>("choose");
  const [callers, setCallers] = useState<Caller[]>([]);
  const [selectedCaller, setSelectedCaller] = useState<Caller | null>(null);
  const [digits, setDigits] = useState<string[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (has) LocalAuthentication.isEnrolledAsync().then(setBiometricAvailable);
    });
    fetchCallers();
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

  async function verifyByCode(code: string, fallbackCallerId?: number): Promise<boolean> {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/pxp/callers/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loginCaller(data.caller.id, data.caller.name, data.caller.campus ?? "");
        router.replace("/admin/pxp" as any);
        return true;
      }
      // If we already have a selected caller (name-code mode), verify against that caller
      if (fallbackCallerId && data.caller) {
        loginCaller(data.caller.id, data.caller.name, data.caller.campus ?? "");
        router.replace("/admin/pxp" as any);
        return true;
      }
      setError("Invalid code. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    } catch {
      setError("Connection error. Try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // --- FACE ID ---
  async function tryFaceId() {
    setMode("faceid");
    setError("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate as Caller",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Biometric passed — let them pick their name
        setMode("name-code");
        setSelectedCaller(null);
      } else {
        setError("Biometric not confirmed. Try another method.");
        setMode("choose");
      }
    } catch {
      setError("Face ID not available. Try another method.");
      setMode("choose");
    }
  }

  // --- NAME PICKER + CODE ---
  function selectCaller(caller: Caller) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCaller(caller);
    setDigits([]);
    setError("");
  }

  async function submitNameCode() {
    if (!selectedCaller || digits.length === 0) return;
    const code = digits.join("");
    await verifyByCode(code, selectedCaller.id);
  }

  // --- CODE KEYPAD ---
  function press(k: string) {
    if (digits.length >= 10) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError("");
    setDigits(prev => [...prev, k]);
  }

  function del() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDigits(prev => prev.slice(0, -1));
    setError("");
  }

  async function submitCode() {
    if (digits.length === 0) return;
    await verifyByCode(digits.join(""));
    setDigits([]);
  }

  // --- KEY PAD COMPONENT ---
  function NumPad({ onPress, onDel, onSubmit }: { onPress: (k: string) => void; onDel: () => void; onSubmit: () => void }) {
    const keys = [["1","2","3"],["4","5","6"],["7","8","9"],[null,"0","del"]];
    return (
      <View style={pad.pad}>
        {keys.map((row, ri) => (
          <View key={ri} style={pad.row}>
            {row.map((k, ki) => {
              if (k === null) return (
                <Pressable key={ki} onPress={onSubmit}
                  style={({ pressed }) => [pad.key, { backgroundColor: pressed ? colors.primary : "rgba(124,58,237,0.2)", borderRadius: 12 }]}>
                  <Ionicons name="checkmark" size={22} color="#fff" />
                </Pressable>
              );
              if (k === "del") return (
                <Pressable key={ki} onPress={onDel} style={({ pressed }) => [pad.key, { opacity: pressed ? 0.5 : 1 }]}>
                  <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
                </Pressable>
              );
              return (
                <Pressable key={ki} onPress={() => onPress(k)}
                  style={({ pressed }) => [pad.key, { backgroundColor: pressed ? colors.muted : "transparent" }]}>
                  <Text style={[pad.keyText, { color: colors.foreground }]}>{k}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  function Dots({ count, filled }: { count: number; filled: number }) {
    return (
      <View style={styles.dots}>
        {Array.from({ length: Math.max(count, 6) }).map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < filled ? colors.primary : colors.muted, borderColor: colors.border }]} />
        ))}
      </View>
    );
  }

  // =================== CHOOSE MODE ===================
  if (mode === "choose") {
    return (
      <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
        <View style={[styles.root, { paddingTop: topPad }]}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Text style={styles.title}>CALLER ACCESS</Text>
          <Text style={styles.sub}>Choose how to sign in</Text>

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          <View style={styles.optionList}>
            {biometricAvailable && (
              <Pressable onPress={tryFaceId} style={({ pressed }) => [styles.option, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={styles.optionIcon}>🪪</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Face ID / Biometrics</Text>
                  <Text style={styles.optionDesc}>Use your device biometrics then pick your name</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
              </Pressable>
            )}

            <Pressable onPress={() => { setMode("name-code"); setError(""); }}
              style={({ pressed }) => [styles.option, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
              <Text style={styles.optionIcon}>👤</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>Select Name + Code</Text>
                <Text style={styles.optionDesc}>Pick your name from the list, then enter your passcode</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
            </Pressable>

            <Pressable onPress={() => { setMode("code"); setError(""); setDigits([]); }}
              style={({ pressed }) => [styles.option, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
              <Text style={styles.optionIcon}>🔢</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>Enter Code</Text>
                <Text style={styles.optionDesc}>Type your unique caller code directly</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // =================== FACE ID (loading state) ===================
  if (mode === "faceid") {
    return (
      <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
        <View style={[styles.root, { paddingTop: topPad, justifyContent: "center" }]}>
          <Text style={[styles.title, { marginBottom: 24 }]}>AUTHENTICATING</Text>
          <ActivityIndicator color="rgba(180,140,255,0.7)" size="large" />
          <Text style={styles.sub}>Waiting for Face ID…</Text>
        </View>
      </LinearGradient>
    );
  }

  // =================== NAME + CODE ===================
  if (mode === "name-code") {
    return (
      <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
        <View style={[styles.root, { paddingTop: topPad }]}>
          <Pressable onPress={() => { setMode("choose"); setSelectedCaller(null); setDigits([]); setError(""); }} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Text style={styles.title}>SELECT CALLER</Text>
          <Text style={styles.sub}>{selectedCaller ? `${selectedCaller.name} — enter your code` : "Tap your name"}</Text>

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          {!selectedCaller ? (
            <ScrollView style={styles.callerList} contentContainerStyle={{ gap: 8, paddingBottom: 40 }}>
              {callers.length === 0 && (
                <Text style={styles.sub}>No callers found. Ask admin to add you.</Text>
              )}
              {callers.map((c) => (
                <Pressable key={c.id} onPress={() => selectCaller(c)}
                  style={({ pressed }) => [styles.callerRow, { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card }]}>
                  <Text style={styles.callerName}>{c.name}</Text>
                  <Text style={styles.callerCampus}>{c.campus}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <>
              <Dots count={6} filled={digits.length} />
              <NumPad onPress={press} onDel={del} onSubmit={submitNameCode} />
              <Pressable onPress={() => { setSelectedCaller(null); setDigits([]); setError(""); }} style={{ marginTop: 20 }}>
                <Text style={[styles.sub, { color: "rgba(180,140,255,0.5)" }]}>← Pick a different name</Text>
              </Pressable>
            </>
          )}
        </View>
      </LinearGradient>
    );
  }

  // =================== CODE ONLY ===================
  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={[styles.root, { paddingTop: topPad }]}>
        <Pressable onPress={() => { setMode("choose"); setDigits([]); setError(""); }} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
        </Pressable>

        <Text style={styles.title}>CALLER CODE</Text>
        <Text style={styles.sub}>Enter your unique code</Text>

        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

        <Dots count={6} filled={digits.length} />
        <NumPad onPress={press} onDel={del} onSubmit={submitCode} />

        {loading && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
            <ActivityIndicator color="rgba(180,140,255,0.7)" size="small" />
            <Text style={styles.sub}>Verifying…</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  back: { alignSelf: "flex-start", padding: 8, marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Georgia", letterSpacing: 6, color: "#fff", marginBottom: 8,
    textShadowColor: "rgba(180,140,255,0.6)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  sub: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 1, color: "rgba(255,255,255,0.3)", marginBottom: 32, textAlign: "center" },
  error: { fontSize: 12, fontFamily: "Georgia", marginBottom: 12, textAlign: "center" },
  dots: { flexDirection: "row", gap: 10, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  optionList: { width: "100%", gap: 12, marginTop: 8 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 18, borderRadius: 16, borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  optionIcon: { fontSize: 26 },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: "Georgia", fontSize: 15, color: "#fff", marginBottom: 3 },
  optionDesc: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.3 },
  callerList: { width: "100%", flex: 1 },
  callerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1 },
  callerName: { fontFamily: "Georgia", fontSize: 15, color: "#fff" },
  callerCampus: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 },
});

const pad = StyleSheet.create({
  pad: { width: "100%", maxWidth: 280, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  key: { width: 80, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  keyText: { fontSize: 24, fontFamily: "Georgia" },
});
