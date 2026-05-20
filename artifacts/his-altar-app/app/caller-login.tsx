import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useListPxpCallers } from "@workspace/api-client-react";
import type { PxpCaller } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const CAMPUSES = ["Hallmark", "Arizona", "Arrowhead", "Pomona", "Riverside", "LA"];

export default function CallerLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loginCaller } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [campus, setCampus] = useState<string | null>(null);
  const [selectedCaller, setSelectedCaller] = useState<PxpCaller | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callersQ = useListPxpCallers(campus ? { campus } : {});
  const callers = callersQ.data?.callers ?? [];

  async function handleLogin() {
    if (!selectedCaller || !code.trim()) {
      setError("Select your name and enter your code."); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/pxp/callers/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerId: selectedCaller.id, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError("Incorrect code. Try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loginCaller(selectedCaller.id, selectedCaller.name, campus ?? "");
        router.replace("/admin/pxp" as any);
      }
    } catch {
      setError("Connection error. Try again.");
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { paddingTop: topPad + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>CALLER LOGIN</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Follow-Up Team</Text>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Campus</Text>
        <View style={styles.chips}>
          {CAMPUSES.map(c => (
            <Pressable
              key={c}
              onPress={() => { setCampus(c); setSelectedCaller(null); }}
              style={[styles.chip, { backgroundColor: campus === c ? colors.primary : colors.card, borderColor: campus === c ? colors.primary : colors.border }]}
            >
              <Text style={[styles.chipText, { color: campus === c ? colors.primaryForeground : colors.foreground }]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        {campus && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>Your Name</Text>
            {callersQ.isLoading ? <ActivityIndicator color={colors.primary} /> : (
              <FlatList
                data={callers}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { setSelectedCaller(item); setCode(""); setError(""); }}
                    style={[styles.callerChip, { backgroundColor: selectedCaller?.id === item.id ? colors.primary : colors.card, borderColor: selectedCaller?.id === item.id ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.callerChipText, { color: selectedCaller?.id === item.id ? colors.primaryForeground : colors.foreground }]}>
                      {item.name}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </>
        )}

        {selectedCaller && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Access Code</Text>
            <TextInput
              value={code}
              onChangeText={t => { setCode(t); setError(""); }}
              secureTextEntry
              keyboardType="default"
              autoCapitalize="characters"
              placeholder="Enter your code"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.codeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            />
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [styles.signInBtn, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.7 : 1 }]}
            >
              {loading ? <ActivityIndicator color={colors.primaryForeground} /> : (
                <Text style={[styles.signInText, { color: colors.primaryForeground }]}>SIGN IN</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  back: { alignSelf: "flex-start", padding: 8, marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Georgia", letterSpacing: 5, marginBottom: 8 },
  sub: { fontSize: 13, fontFamily: "Georgia", letterSpacing: 1, marginBottom: 32 },
  sectionLabel: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Georgia" },
  callerChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1 },
  callerChipText: { fontSize: 14, fontFamily: "Georgia" },
  codeInput: { padding: 14, borderRadius: 10, borderWidth: 1, fontSize: 18, fontFamily: "Georgia", letterSpacing: 4, marginBottom: 16 },
  error: { fontSize: 12, fontFamily: "Georgia", marginBottom: 12 },
  signInBtn: { paddingVertical: 16, borderRadius: 10, alignItems: "center" },
  signInText: { fontSize: 14, fontFamily: "Georgia", letterSpacing: 3 },
});
