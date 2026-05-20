import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useVerifyLogin } from "@workspace/api-client-react";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const MAX = 8;

export default function PinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [digits, setDigits] = useState<number[]>([]);
  const [error, setError] = useState("");
  const verify = useVerifyLogin();

  function press(n: number) {
    if (digits.length >= MAX) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError("");
    setDigits(prev => [...prev, n]);
  }

  function del() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDigits(prev => prev.slice(0, -1));
    setError("");
  }

  async function submit() {
    if (digits.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await verify.mutateAsync({ data: { sequence: digits } });
      if (res.success) {
        router.replace("/team");
      } else {
        setError("Incorrect PIN. Try again.");
        setDigits([]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError("Connection error. Try again.");
      setDigits([]);
    }
  }

  const keys = [[1,2,3],[4,5,6],[7,8,9],[null,0,"del"]];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </Pressable>

      <Text style={[styles.title, { color: colors.foreground }]}>STAFF LOGIN</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Enter your access code</Text>

      <View style={styles.dots}>
        {Array.from({ length: Math.max(digits.length, 4) }).map((_, i) => (
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

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <View style={styles.pad}>
        {keys.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((k, ki) => {
              if (k === null) return <View key={ki} style={styles.key} />;
              if (k === "del") return (
                <Pressable key={ki} onPress={del} style={({ pressed }) => [styles.key, { opacity: pressed ? 0.6 : 1 }]}>
                  <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
                </Pressable>
              );
              return (
                <Pressable
                  key={ki}
                  onPress={() => press(k as number)}
                  style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: pressed ? colors.muted : "transparent" },
                  ]}
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
        disabled={digits.length === 0 || verify.isPending}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: colors.primary, opacity: pressed || digits.length === 0 ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
          {verify.isPending ? "Verifying…" : "Enter"}
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
  dots: { flexDirection: "row", gap: 14, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  error: { fontSize: 12, marginBottom: 16, fontFamily: "Georgia" },
  pad: { width: "100%", maxWidth: 280, gap: 8, marginTop: 24 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  key: { width: 80, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  keyText: { fontSize: 24, fontFamily: "Georgia" },
  submit: { marginTop: 28, width: "100%", maxWidth: 280, paddingVertical: 16, borderRadius: 10, alignItems: "center" },
  submitText: { fontSize: 14, fontFamily: "Georgia", letterSpacing: 2, textTransform: "uppercase" },
});
