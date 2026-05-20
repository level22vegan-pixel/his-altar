import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const SERVICES = ["Sunday 8:00am", "Sunday 10:00am", "Sunday 12:00pm", "Wednesday 7:00pm"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectCampusService } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function selectService(s: string) {
    const today = new Date().toISOString().split("T")[0];
    selectCampusService("", s, today);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/checkin");
  }

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={[styles.root, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.title}>SELECT SERVICE</Text>
          <Text style={styles.sub}>Which service are you working?</Text>

          <View style={styles.services}>
            {SERVICES.map((s) => (
              <Pressable
                key={s}
                onPress={() => selectService(s)}
                style={({ pressed }) => [
                  styles.serviceBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                  },
                ]}
              >
                <Text style={styles.serviceText}>{s}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { padding: 16, alignSelf: "flex-start" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  title: {
    fontSize: 22, fontFamily: "Georgia", letterSpacing: 5, color: "#fff",
    textShadowColor: "rgba(180,140,255,0.5)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
    marginBottom: 8,
  },
  sub: { fontSize: 12, fontFamily: "Georgia", color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 36 },
  services: { gap: 12 },
  serviceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderRadius: 16, borderWidth: 1,
  },
  serviceText: { fontFamily: "Georgia", fontSize: 16, color: "#fff", letterSpacing: 0.5 },
});
