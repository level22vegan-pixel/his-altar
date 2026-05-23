import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";
import { GoldButton } from "@/components/GoldButton";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface DeviceToken {
  id: number;
  campus: string;
  deviceName: string;
  updatedAt: string;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orgSession } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [typeTeamUpdate, setTypeTeamUpdate] = useState(true);
  const [typeWeeklySummary, setTypeWeeklySummary] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<DeviceToken[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (orgSession?.token) headers["Authorization"] = `Bearer ${orgSession.token}`;

  useEffect(() => {
    fetch(`${BASE_URL}/api/notifications/tokens`, { headers })
      .then(r => r.json())
      .then(data => setDevices(Array.isArray(data) ? data : []))
      .catch(() => setDevices([]))
      .finally(() => setLoadingDevices(false));
  }, []);

  async function handleSend() {
    if (!title.trim() || !body.trim()) { setError("Title and message are required."); return; }
    if (!typeTeamUpdate && !typeWeeklySummary) { setError("Select at least one message type."); return; }
    const types: string[] = [];
    if (typeTeamUpdate) types.push("team-update");
    if (typeWeeklySummary) types.push("weekly-summary");
    setSending(true); setError(""); setSent(null);
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: title.trim(), body: body.trim(), types }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Send failed");
      setSent(data.sent ?? 0);
      setTitle("");
      setBody("");
    } catch (e: any) {
      setError(e.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: topPad + 16 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>NOTIFICATIONS</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>REGISTERED DEVICES</Text>
          {loadingDevices ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : devices.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No staff devices yet. Staff must log in at least once to appear here.
            </Text>
          ) : (
            <View style={styles.deviceList}>
              {devices.map(d => (
                <View key={d.id} style={[styles.deviceRow, { borderBottomColor: colors.border }]}>
                  <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.deviceName, { color: colors.foreground }]}>
                      {d.deviceName || "Unknown Device"}
                    </Text>
                    <Text style={[styles.deviceCampus, { color: colors.mutedForeground }]}>
                      {d.campus || "No campus"} · {new Date(d.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {devices.length} device{devices.length !== 1 ? "s" : ""} will receive this notification
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>COMPOSE MESSAGE</Text>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Message Type</Text>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => { setTypeTeamUpdate(v => !v); setError(""); }}
              style={[styles.typeChip, { borderColor: typeTeamUpdate ? colors.primary : colors.border, backgroundColor: typeTeamUpdate ? `${colors.primary}22` : colors.muted }]}
            >
              <Ionicons name="megaphone-outline" size={14} color={typeTeamUpdate ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.typeChipText, { color: typeTeamUpdate ? colors.primary : colors.mutedForeground }]}>Team Update</Text>
              {typeTeamUpdate && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
            </Pressable>
            <Pressable
              onPress={() => { setTypeWeeklySummary(v => !v); setError(""); }}
              style={[styles.typeChip, { borderColor: typeWeeklySummary ? colors.primary : colors.border, backgroundColor: typeWeeklySummary ? `${colors.primary}22` : colors.muted }]}
            >
              <Ionicons name="calendar-outline" size={14} color={typeWeeklySummary ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.typeChipText, { color: typeWeeklySummary ? colors.primary : colors.mutedForeground }]}>Weekly Summary</Text>
              {typeWeeklySummary && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={t => { setTitle(t); setError(""); setSent(null); }}
            placeholder="e.g. Service Update"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Message</Text>
          <TextInput
            value={body}
            onChangeText={t => { setBody(t); setError(""); setSent(null); }}
            placeholder="e.g. Please arrive 15 minutes early today."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.multiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
          />

          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
          {sent !== null ? (
            <Text style={[styles.successText, { color: "#4ade80" }]}>
              Sent to {sent} device{sent !== 1 ? "s" : ""}
            </Text>
          ) : null}

          <GoldButton
            label={sending ? "Sending…" : `Send to ${devices.length} Device${devices.length !== 1 ? "s" : ""}`}
            onPress={handleSend}
            loading={sending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 5 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontFamily: "Georgia", letterSpacing: 3, marginBottom: 14 },
  emptyText: { fontSize: 13, fontFamily: "Georgia", lineHeight: 20, marginBottom: 12 },
  deviceList: { marginBottom: 12 },
  deviceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  deviceName: { fontSize: 13, fontFamily: "Georgia" },
  deviceCampus: { fontSize: 11, fontFamily: "Georgia", marginTop: 2 },
  badge: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" },
  badgeText: { fontSize: 12, fontFamily: "Georgia" },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  typeChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1 },
  typeChipText: { flex: 1, fontSize: 12, fontFamily: "Georgia" },
  fieldLabel: { fontSize: 10, fontFamily: "Georgia", letterSpacing: 2, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Georgia" },
  multiline: { height: 100, textAlignVertical: "top" },
  errorText: { fontSize: 12, fontFamily: "Georgia", marginTop: 10 },
  successText: { fontSize: 13, fontFamily: "Georgia", marginTop: 10, textAlign: "center" },
});
