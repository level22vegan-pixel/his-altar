import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const TEAMS = [
  { id: "altar", icon: "flame-outline", label: "ALTAR", desc: "Check-in & roster", route: "/home" },
  { id: "pxp", icon: "call-outline", label: "FOLLOW-UP CALLS", desc: "PXP caller login", route: "/caller-login" },
  { id: "admin", icon: "settings-outline", label: "ADMIN", desc: "Reports & management", route: "/admin" },
] as const;

export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orgSession, logout } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient colors={["#0e0b08", "#1a1510"]} style={[styles.root, { paddingTop: topPad + 20 }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>SELECT TEAM</Text>
          {orgSession && (
            <Text style={[styles.orgName, { color: colors.primary }]}>{orgSession.orgName}</Text>
          )}
        </View>
        <Pressable onPress={async () => { await logout(); router.replace("/"); }} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.cards}>
        {TEAMS.map(team => (
          <Pressable
            key={team.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(team.route as any); }}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name={team.icon as any} size={28} color={colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: colors.foreground }]}>{team.label}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{team.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 },
  title: { fontSize: 20, fontFamily: "Georgia", letterSpacing: 5 },
  orgName: { fontSize: 13, fontFamily: "Georgia", marginTop: 4 },
  logoutBtn: { padding: 8 },
  cards: { gap: 14 },
  card: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 16, fontFamily: "Georgia", fontWeight: "600", letterSpacing: 1 },
  cardDesc: { fontSize: 12, marginTop: 3, fontFamily: "Georgia" },
});
