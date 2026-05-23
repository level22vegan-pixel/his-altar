import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";
import { NOTIF_HISTORY_KEY, type NotificationHistoryEntry } from "@/context/AppContext";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function typeLabel(type?: string): string {
  if (type === "team-update") return "Team Update";
  if (type === "weekly-summary") return "Weekly Summary";
  return "Alert";
}

export default function StaffMenu() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { campusSession, orgSession } = useAppContext();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<NotificationHistoryEntry[]>([]);

  const isLoggedIn = !!(campusSession || orgSession);
  const isAdmin = campusSession?.role === "admin" || !!orgSession;

  // Staff menu only shows for non-admin staff who are logged in
  if (!isLoggedIn || isAdmin) return null;

  function handleOpen() {
    AsyncStorage.getItem(NOTIF_HISTORY_KEY).then((raw) => {
      setHistory(raw ? JSON.parse(raw) : []);
    });
    setOpen(true);
  }

  async function clearHistory() {
    await AsyncStorage.removeItem(NOTIF_HISTORY_KEY);
    setHistory([]);
  }

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [styles.burger, { opacity: pressed ? 0.6 : 1, borderColor: colors.border }]}
      >
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.drawer, { backgroundColor: "#0f0e1a", borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}
            onPress={e => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} style={{ marginBottom: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerTitle}>Alerts & Messages</Text>
                <Text style={styles.drawerSub}>
                  {campusSession?.campus ? campusSession.campus.toUpperCase() : "STAFF"}
                </Text>
              </View>
              {history.length > 0 && (
                <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
                  <Text style={[styles.clearText, { color: colors.mutedForeground }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>

            <ScrollView>
              {history.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="notifications-off-outline" size={36} color="rgba(255,255,255,0.12)" />
                  <Text style={styles.emptyText}>No alerts yet</Text>
                  <Text style={styles.emptySubText}>
                    Messages from your church admin will appear here
                  </Text>
                </View>
              ) : (
                history.map((item, i) => (
                  <View
                    key={item.id ?? i}
                    style={[styles.notifRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.typePill, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.typeText, { color: colors.primary }]}>
                        {typeLabel(item.type)}
                      </Text>
                    </View>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifBody}>{item.body}</Text>
                    <Text style={styles.notifTime}>{timeAgo(item.receivedAt)}</Text>
                  </View>
                ))
              )}
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  drawer: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0,
    maxHeight: "80%",
  },
  drawerHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, marginBottom: 4,
  },
  drawerTitle: { fontFamily: "Georgia", fontSize: 16, color: "#fff" },
  drawerSub: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginTop: 2 },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  clearText: { fontFamily: "Georgia", fontSize: 11, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: { fontFamily: "Georgia", fontSize: 15, color: "rgba(255,255,255,0.2)" },
  emptySubText: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.15)", textAlign: "center", paddingHorizontal: 32, lineHeight: 18 },
  notifRow: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  typePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  typeText: { fontSize: 9, fontFamily: "Georgia", letterSpacing: 2, textTransform: "uppercase" },
  notifTitle: { fontFamily: "Georgia", fontSize: 14, color: "#fff", fontWeight: "600" },
  notifBody: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 19, marginTop: 2 },
  notifTime: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 },
});
