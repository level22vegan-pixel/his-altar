import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PREFS_KEY = "notificationPrefs";

export interface NotifPrefs {
  teamUpdates: boolean;
  weeklySummary: boolean;
}

const DEFAULT_PREFS: NotifPrefs = { teamUpdates: true, weeklySummary: true };

export async function loadNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

async function saveNotifPrefs(prefs: NotifPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationPrefsModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (visible) loadNotifPrefs().then(setPrefs);
  }, [visible]);

  async function toggle(key: keyof NotifPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await saveNotifPrefs(next);
  }

  const ROW_BG = colors.card;
  const BORDER = colors.border;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderColor: BORDER,
            paddingBottom: Platform.OS === "ios" ? insets.bottom + 12 : 24,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.muted }]} />

        {/* Title row */}
        <View style={styles.titleRow}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            NOTIFICATIONS
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Choose which alerts you receive on this device
        </Text>

        {/* Toggles */}
        <View style={styles.rows}>
          <ToggleRow
            icon="megaphone-outline"
            label="Team Updates"
            desc="Alerts sent to your campus staff"
            value={prefs.teamUpdates}
            onToggle={() => toggle("teamUpdates")}
            rowBg={ROW_BG}
            border={BORDER}
            colors={colors}
          />
          <ToggleRow
            icon="calendar-outline"
            label="Weekly Summary"
            desc="End-of-week ministry recap"
            value={prefs.weeklySummary}
            onToggle={() => toggle("weeklySummary")}
            rowBg={ROW_BG}
            border={BORDER}
            colors={colors}
          />
        </View>
      </View>
    </Modal>
  );
}

function ToggleRow({
  icon, label, desc, value, onToggle, rowBg, border, colors,
}: {
  icon: string; label: string; desc: string; value: boolean;
  onToggle: () => void; rowBg: string; border: string; colors: any;
}) {
  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderColor: border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor="#ffffff"
        ios_backgroundColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Georgia",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Georgia",
    marginBottom: 20,
    lineHeight: 18,
  },
  rows: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Georgia", fontWeight: "600" },
  rowDesc: { fontSize: 11, fontFamily: "Georgia", marginTop: 2, lineHeight: 16 },
});
