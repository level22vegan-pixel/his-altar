import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useListWorkers, useListCheckIns, useCreateCheckIn, useDeleteCheckIn,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const TABS = ["Roster", "Active", "Alt"] as const;
type Tab = typeof TABS[number];

export default function CheckInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCampus, selectedService, selectedDate } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<Tab>("Roster");

  const campus = selectedCampus ?? "";
  const service = selectedService ?? "";
  const serviceDate = selectedDate ?? new Date().toISOString().split("T")[0];

  const workersQ = useListWorkers({ campus, category: tab === "Alt" ? "alt" : "master" });
  const checkInsQ = useListCheckIns({ campus, service, serviceDate });
  const createCi = useCreateCheckIn();
  const deleteCi = useDeleteCheckIn();

  const workers = workersQ.data?.workers ?? [];
  const checkIns = checkInsQ.data?.checkIns ?? [];
  const checkedInIds = new Set(checkIns.map((c) => c.workerId));

  async function toggle(worker: { id: number; name: string }) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (checkedInIds.has(worker.id)) {
      const ci = checkIns.find((c) => c.workerId === worker.id);
      if (ci) await deleteCi.mutateAsync({ id: ci.id });
    } else {
      await createCi.mutateAsync({ data: { workerId: worker.id, campus, service, serviceDate } });
    }
    checkInsQ.refetch();
  }

  const displayWorkers = tab === "Active"
    ? checkIns.map((ci) => ({ id: ci.workerId, name: "Worker" }))
    : workers;

  const isLoading = workersQ.isLoading || checkInsQ.isLoading;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={[styles.campus, { color: colors.foreground }]}>{selectedCampus?.toUpperCase()}</Text>
          <Text style={[styles.service, { color: colors.mutedForeground }]}>{selectedService} · {serviceDate}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, { borderBottomColor: tab === t ? colors.primary : "transparent" }]}>
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayWorkers}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => { workersQ.refetch(); checkInsQ.refetch(); }} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No workers found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isIn = checkedInIds.has(item.id);
            return (
              <Pressable
                onPress={() => tab !== "Active" ? toggle(item) : null}
                style={[styles.row, { backgroundColor: colors.card, borderColor: isIn ? colors.primary : colors.border }]}
              >
                <View style={[styles.avatar, { backgroundColor: isIn ? colors.primary : colors.muted }]}>
                  <Text style={{ color: isIn ? colors.primaryForeground : colors.foreground, fontFamily: "Georgia", fontSize: 13 }}>
                    {item.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                {tab !== "Active" && (
                  <View style={[styles.check, { backgroundColor: isIn ? colors.primary : "transparent", borderColor: isIn ? colors.primary : colors.border }]}>
                    {isIn && <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />}
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  campus: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 3 },
  service: { fontSize: 12, fontFamily: "Georgia", marginTop: 2 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 2 },
  tabText: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 1, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, borderWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontSize: 15, fontFamily: "Georgia" },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: "Georgia" },
});
