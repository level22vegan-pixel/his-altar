import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

export default function CallerLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loginCaller } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function submit() {
    if (digits.length === 0) return;
    const code = digits.join("");
    setLoading(true);
    setError("");
    try {
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "";
      const res = await fetch(`${baseUrl}/api/pxp/callers/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError("Code not found. Check your code and try again.");
        setDigits([]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loginCaller(data.caller.id, data.caller.name, data.caller.campus ?? "");
        router.replace("/admin/pxp" as any);
      }
    } catch {
      setError("Connection error. Try again.");
      setDigits([]);
    } finally {
      setLoading(false);
    }
  }

  const keys = [["1","2","3"],["4","5","6"],["7","8","9"],[null,"0","del"]];
  const displayDots = Math.max(digits.length, 6);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </Pressable>

      <Text style={[styles.title, { color: colors.foreground }]}>CALLER ACCESS</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Enter your caller code</Text>

      <View style={styles.dots}>
        {Array.from({ length: displayDots }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < digits.length ? colors.primary : colors.muted,
                borderColor: colors.border,
              },
            ]}
          />
        ))}
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}

      <View style={styles.pad}>
        {keys.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((k, ki) => {
              if (k === null) return <View key={ki} style={styles.key} />;
              if (k === "del") return (
                <Pressable key={ki} onPress={del} style={({ pressed }) => [styles.key, { opacity: pressed ? 0.5 : 1 }]}>
                  <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
                </Pressable>
              );
              return (
                <Pressable
                  key={ki}
                  onPress={() => press(k)}
                  style={({ pressed }) => [styles.key, { backgroundColor: pressed ? colors.muted : "transparent" }]}
                >
                  <Text style={[styles.keyText, { color: colors.foreground }]}>{k}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Pressable
        onPress={submit}
        disabled={digits.length === 0 || loading}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: colors.primary, opacity: pressed || digits.length === 0 || loading ? 0.5 : 1 },
        ]}
      >
        <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
          {loading ? "Checking…" : "Sign In"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", paddingHorizontal: 32 },
  back: { alignSelf: "flex-start", padding: 8, marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Georgia", letterSpacing: 6, marginBottom: 8 },
  sub: { fontSize: 13, fontFamily: "Georgia", letterSpacing: 1, marginBottom: 40 },
  dots: { flexDirection: "row", gap: 10, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  error: { fontSize: 12, fontFamily: "Georgia", marginBottom: 16, textAlign: "center" },
  pad: { width: "100%", maxWidth: 280, gap: 8, marginTop: 20 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  key: { width: 80, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  keyText: { fontSize: 24, fontFamily: "Georgia" },
  submit: { marginTop: 28, width: "100%", maxWidth: 280, paddingVertical: 16, borderRadius: 10, alignItems: "center" },
  submitText: { fontSize: 14, fontFamily: "Georgia", letterSpacing: 2, textTransform: "uppercase" },
});
