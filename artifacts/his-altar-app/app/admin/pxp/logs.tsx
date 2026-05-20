import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useListPxpCallLogs } from "@workspace/api-client-react";
import React from "react";
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function formatDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LogsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const logsQ = useListPxpCallLogs();
  const logs = logsQ.data?.logs ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>CALL LOGS</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={logsQ.isLoading} onRefresh={() => logsQ.refetch()} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="call-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No calls logged yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.callerName, { color: colors.foreground }]}>{item.callerName}</Text>
              <Text style={[styles.outcome, { color: colors.mutedForeground }]}>{item.outcome}</Text>
              {item.campus && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.campus} · {formatDate(item.calledAt)}</Text>}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  callerName: { fontSize: 15, fontFamily: "Georgia" },
  outcome: { fontSize: 12, fontFamily: "Georgia", marginTop: 2 },
  meta: { fontSize: 11, fontFamily: "Georgia", marginTop: 2 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: "Georgia" },
});
