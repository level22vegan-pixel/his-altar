import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking } from "react-native";
import React, { useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  action?: () => void;
  danger?: boolean;
  dividerAbove?: boolean;
}

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orgSession, campusSession, logout } = useAppContext();

  const isAdmin = campusSession?.role === "admin" || !!orgSession;
  if (!isAdmin) return null;

  function go(route: string) {
    setOpen(false);
    setTimeout(() => router.push(route as any), 150);
  }

  async function signOut() {
    setOpen(false);
    await logout();
    setTimeout(() => router.replace("/"), 150);
  }

  const menuItems: MenuItem[] = [
    // ── Account (mirrors web app) ────────────────────────────────────────────
    { icon: "👤", label: "Profile", route: "/admin/profile" },
    { icon: "🔑", label: "Access Codes", route: "/admin/access-codes" },
    { icon: "📞", label: "PXP Callers", route: "/admin/pxp/callers" },
    { icon: "💳", label: "Billing & Subscription", route: "/org/billing" },
    { icon: "✉️", label: "Contact Support", action: () => {
      setOpen(false);
      Linking.openURL("mailto:support@hisaltar.com");
    }},
    // ── Navigation (mobile-specific, no sidebar) ──────────────────────────────
    { icon: "🙏", label: "Prayer Contacts", route: "/admin/dbanc", dividerAbove: true },
    { icon: "🗓️", label: "Follow-Up Calls", route: "/admin/pxp" },
    { icon: "👥", label: "Roster Manager", route: "/admin/roster" },
    { icon: "📋", label: "Altar Report", route: "/admin/altar-report" },
    { icon: "⚙️", label: "Admin Panel", route: "/admin" },
    // ── Sign out ──────────────────────────────────────────────────────────────
    { icon: "↩", label: "Sign Out", action: signOut, danger: true, dividerAbove: true },
  ];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.burger, { opacity: pressed ? 0.6 : 1, borderColor: colors.border }]}
      >
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.drawer,
              {
                backgroundColor: "#0f0e1a",
                borderColor: colors.border,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <Text style={styles.drawerTitle}>
                {orgSession ? orgSession.orgName : "Admin Menu"}
              </Text>
              <Text style={styles.drawerSub}>
                {orgSession ? "Church Admin" : campusSession?.role ?? "Admin"}
              </Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>

            <ScrollView>
              {menuItems.map((item) => (
                <View key={item.label}>
                  {item.dividerAbove && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      if (item.action) item.action();
                      else if (item.route) go(item.route);
                    }}
                    style={[styles.menuItem, { borderBottomColor: colors.border }]}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                    <Text style={[styles.menuLabel, item.danger && { color: "rgba(255,80,80,0.85)" }]}>
                      {item.label}
                    </Text>
                    {!item.danger && (
                      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" style={{ marginLeft: "auto" }} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  burger: {
    width: 40, height: 40,
    borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  line: { width: 18, height: 1.5, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 2 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  drawer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "85%",
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  drawerTitle: {
    fontFamily: "Georgia", fontSize: 16, color: "#fff", fontWeight: "400", marginRight: 36,
  },
  drawerSub: {
    fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.3)",
    letterSpacing: 2, textTransform: "uppercase", marginTop: 3,
  },
  closeBtn: { position: "absolute", top: 18, right: 16, padding: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20, marginVertical: 4 },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  menuIcon: { fontSize: 17, width: 26, textAlign: "center" },
  menuLabel: {
    fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.82)",
  },
});
