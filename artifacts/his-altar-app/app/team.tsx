import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";
import HamburgerMenu from "@/components/HamburgerMenu";
import NotificationPrefsModal from "@/components/NotificationPrefsModal";

const TILES = [
  {
    id: "altar",
    emoji: "🙏",
    label: "Altar",
    gradient: ["#091828", "#0d2240", "#091828"] as const,
    border: "rgba(56,130,200,0.4)",
    shadow: "rgba(56,130,200,0.35)",
    route: "/admin/dbanc/new",
  },
  {
    id: "checkin",
    emoji: "✅",
    extraLabel: "-in",
    label: "Check-in",
    gradient: ["#92651a", "#b8860b", "#7a4f10"] as const,
    border: "rgba(184,134,11,0.4)",
    shadow: "rgba(184,134,11,0.35)",
    route: "/home",
  },
  {
    id: "calls",
    emoji: "📞",
    label: "Calls",
    gradient: ["#4c1d95", "#7c3aed", "#6d28d9"] as const,
    border: "rgba(124,58,237,0.5)",
    shadow: "rgba(124,58,237,0.4)",
    route: "/caller-login",
  },
  {
    id: "admin",
    emoji: "⚙",
    label: "Admin",
    gradient: ["#111827", "#1f2937", "#111827"] as const,
    border: "rgba(100,120,160,0.3)",
    shadow: "rgba(100,120,160,0.2)",
    route: "/admin",
  },
] as const;

export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orgSession, campusSession } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 0 : insets.bottom;
  const [notifOpen, setNotifOpen] = useState(false);

  // Admin access: org session (church admin) OR campus session with role "admin"
  const isAdmin = !!(orgSession || campusSession?.role === "admin");

  function handleTile(route: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route as any);
  }

  const visibleTiles = TILES.filter((t) => t.id !== "admin" || isAdmin);

  return (
    <LinearGradient
      colors={["#06050f", "#0d0818", "#06050f"]}
      locations={[0, 0.6, 1]}
      style={{ flex: 1 }}
    >
      <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/")} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.headerRight}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotifOpen(true); }}
              style={styles.bellBtn}
              hitSlop={10}
            >
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.45)" />
            </Pressable>
            {/* Hamburger only shows for admin/org sessions */}
            <HamburgerMenu />
          </View>
        </View>

        <NotificationPrefsModal visible={notifOpen} onClose={() => setNotifOpen(false)} />

        {/* Welcome label */}
        {(orgSession || campusSession) && (
          <Text style={styles.welcomeText}>
            {orgSession ? orgSession.orgName : campusSession?.campus ? campusSession.campus.toUpperCase() : "WELCOME"}
          </Text>
        )}

        {/* Tiles */}
        <View style={styles.tiles}>
          {visibleTiles.map((tile) => (
            <Pressable
              key={tile.id}
              onPress={() => handleTile(tile.route)}
              style={({ pressed }) => [styles.tileWrap, { opacity: pressed ? 0.88 : 1 }]}
            >
              <LinearGradient
                colors={tile.gradient}
                locations={[0, 0.4, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.tile, { borderColor: tile.border, shadowColor: tile.shadow }]}
              >
                {tile.id === "checkin" ? (
                  <View style={styles.checkinRow}>
                    <Text style={styles.tileEmoji}>✅</Text>
                    <Text style={styles.checkinLabel}>-in</Text>
                  </View>
                ) : (
                  <Text style={styles.tileEmoji}>{tile.emoji}</Text>
                )}
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {},
  backText: { color: "rgba(255,255,255,0.35)", fontFamily: "Georgia", fontSize: 11, letterSpacing: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  bellBtn: { padding: 4 },
  welcomeText: {
    fontFamily: "Georgia", fontSize: 10, letterSpacing: 4,
    color: "rgba(255,255,255,0.2)", textAlign: "center",
    paddingVertical: 8,
  },
  tiles: { flex: 1, padding: 16, gap: 12 },
  tileWrap: { flex: 1 },
  tile: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 36,
    elevation: 12,
  },
  tileEmoji: { fontSize: 48 },
  checkinRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkinLabel: { fontSize: 32, fontFamily: "Georgia", fontWeight: "700", color: "#fff", letterSpacing: -0.5 },
});
