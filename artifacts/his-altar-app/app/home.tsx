import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

import { CAMPUSES } from "@/constants/campuses";
const SERVICES = ["8:00am", "10:00am", "12:00pm", "7:00pm"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectCampusService } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [campus, setCampus] = useState<string | null>(null);

  function selectCampus(c: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCampus(c);
  }

  function selectService(s: string) {
    if (!campus) return;
    const today = new Date().toISOString().split("T")[0];
    selectCampusService(campus, s, today);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/checkin");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.root, { paddingTop: topPad + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>SELECT CAMPUS</Text>

        <View style={styles.grid}>
          {CAMPUSES.map(c => (
            <Pressable
              key={c}
              onPress={() => selectCampus(c)}
              style={({ pressed }) => [
                styles.campusCard,
                {
                  backgroundColor: campus === c ? colors.primary : colors.card,
                  borderColor: campus === c ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.campusText, { color: campus === c ? colors.primaryForeground : colors.foreground }]}>
                {c.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {campus && (
          <View style={styles.serviceSection}>
            <Text style={[styles.serviceTitle, { color: colors.mutedForeground }]}>SERVICE TIME — {campus.toUpperCase()}</Text>
            <View style={styles.services}>
              {SERVICES.map(s => (
                <Pressable
                  key={s}
                  onPress={() => selectService(s)}
                  style={({ pressed }) => [
                    styles.serviceBtn,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.serviceText, { color: colors.foreground }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 60 },
  back: { alignSelf: "flex-start", padding: 8, marginBottom: 24 },
  title: { fontSize: 20, fontFamily: "Georgia", letterSpacing: 5, marginBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  campusCard: { width: "47%", paddingVertical: 24, alignItems: "center", borderRadius: 12, borderWidth: 1 },
  campusText: { fontSize: 13, fontFamily: "Georgia", letterSpacing: 2, fontWeight: "600" },
  serviceSection: { marginTop: 36 },
  serviceTitle: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 16 },
  services: { gap: 10 },
  serviceBtn: { padding: 18, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  serviceText: { fontSize: 16, fontFamily: "Georgia", letterSpacing: 1 },
});
