import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

export default function LandingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orgSession } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient
      colors={["#0e0b08", "#1a1510", "#201a10"]}
      style={[styles.root, { paddingTop: topPad + 40 }]}
    >
      <View style={styles.hero}>
        <Ionicons name="flame" size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>HIS ALTAR</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Ministry Portal</Text>
      </View>

      <View style={styles.btns}>
        <Option
          icon="business-outline"
          label="Church Sign In"
          desc="Org login for church staff"
          onPress={() => router.push(orgSession ? "/team" : "/org-login")}
          colors={colors}
        />
        <Option
          icon="keypad-outline"
          label="Enter with PIN"
          desc="Quick access via PIN code"
          onPress={() => router.push("/pin")}
          colors={colors}
        />
        <Option
          icon="headset-outline"
          label="Caller Login"
          desc="PXP follow-up team"
          onPress={() => router.push("/caller-login")}
          colors={colors}
        />
      </View>
    </LinearGradient>
  );
}

function Option({ icon, label, desc, onPress, colors }: {
  icon: any; label: string; desc: string; onPress: () => void; colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.opt,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.optText}>
        <Text style={[styles.optLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.optDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },
  hero: { alignItems: "center", marginBottom: 56 },
  title: { fontSize: 36, fontFamily: "Georgia", letterSpacing: 8, marginTop: 16 },
  sub: { fontSize: 12, letterSpacing: 4, marginTop: 4, textTransform: "uppercase", fontFamily: "Georgia" },
  btns: { gap: 12 },
  opt: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderRadius: 12, borderWidth: 1 },
  optText: { flex: 1 },
  optLabel: { fontSize: 16, fontFamily: "Georgia", fontWeight: "600" },
  optDesc: { fontSize: 12, marginTop: 2, fontFamily: "Georgia" },
});
