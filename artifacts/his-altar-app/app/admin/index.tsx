import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";
import { loadNotifPrefs, type NotifPrefs } from "@/components/NotificationPrefsModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MENU = [
  { icon: "flame-outline", label: "Altar Report", desc: "Log service responses", route: "/admin/altar-report" },
  { icon: "people-outline", label: "Roster Manager", desc: "Add or remove workers", route: "/admin/roster" },
  { icon: "book-outline", label: "Dbanc", desc: "Prayer contact database", route: "/admin/dbanc" },
  { icon: "list-outline", label: "Contact Form Fields", desc: "Add or remove custom fields", route: "/admin/dbanc/fields" },
  { icon: "call-outline", label: "PXP Follow-Up", desc: "Call system & logs", route: "/admin/pxp" },
  { icon: "notifications-outline", label: "Notifications", desc: "Send push alerts to staff", route: "/admin/notifications" },
] as const;

const PREFS_KEY = "notificationPrefs";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orgSession, campusSession, logout } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ teamUpdates: true, weeklySummary: true });

  const isAdmin = !!(orgSession || campusSession?.role === "admin");

  useEffect(() => {
    if (!isAdmin) router.replace("/team" as any);
    else loadNotifPrefs().then(setNotifPrefs);
  }, [isAdmin]);

  async function togglePref(key: keyof NotifPrefs) {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  if (!isAdmin) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.root, { paddingTop: topPad + 20 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>ADMIN</Text>
          <Pressable onPress={async () => { await logout(); router.replace("/"); }}>
            <Ionicons name="log-out-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {orgSession && (
          <Text style={[styles.orgName, { color: colors.primary }]}>{orgSession.orgName}</Text>
        )}

        <View style={styles.menu}>
          {MENU.map(item => (
            <Pressable
              key={item.label}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any); }}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name={item.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        {/* Push notification preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PUSH NOTIFICATIONS</Text>
          <View style={[styles.prefsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.prefRow}>
              <View style={[styles.prefIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.prefText}>
                <Text style={[styles.prefLabel, { color: colors.foreground }]}>Team Updates</Text>
                <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>Alerts sent to campus staff</Text>
              </View>
              <Switch
                value={notifPrefs.teamUpdates}
                onValueChange={() => togglePref("teamUpdates")}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#ffffff"
                ios_backgroundColor={colors.muted}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.prefRow}>
              <View style={[styles.prefIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.prefText}>
                <Text style={[styles.prefLabel, { color: colors.foreground }]}>Weekly Summary</Text>
                <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>End-of-week ministry recap</Text>
              </View>
              <Switch
                value={notifPrefs.weeklySummary}
                onValueChange={() => togglePref("weeklySummary")}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#ffffff"
                ios_backgroundColor={colors.muted}
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 20, fontFamily: "Georgia", letterSpacing: 5 },
  orgName: { fontSize: 13, fontFamily: "Georgia", marginBottom: 32, textAlign: "center" },
  menu: { gap: 12 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 16, fontFamily: "Georgia", fontWeight: "600" },
  itemDesc: { fontSize: 12, marginTop: 2, fontFamily: "Georgia" },
  section: { marginTop: 32 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, fontFamily: "Georgia", marginBottom: 10, paddingHorizontal: 2 },
  prefsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  prefIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  prefText: { flex: 1 },
  prefLabel: { fontSize: 15, fontFamily: "Georgia", fontWeight: "600" },
  prefDesc: { fontSize: 11, fontFamily: "Georgia", marginTop: 2, lineHeight: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
