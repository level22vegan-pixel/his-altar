import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useListWorkers, useListCheckIns, useCreateCheckIn, useDeleteCheckIn,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator, Dimensions, FlatList, Platform,
  Pressable, RefreshControl, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const TABS = ["Roster", "Active", "Alt"] as const;
type Tab = typeof TABS[number];

const { width: SCREEN_W } = Dimensions.get("window");
const COLS = 2;
const GAP = 12;
const PAD = 16;
const CARD_SIZE = (SCREEN_W - PAD * 2 - GAP) / COLS;

export default function CheckInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedService, selectedDate } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<Tab>("Roster");

  const service = selectedService ?? "";
  const serviceDate = selectedDate ?? new Date().toISOString().split("T")[0];

  const workersQ = useListWorkers({ category: tab === "Alt" ? "alt" : "master" });
  const checkInsQ = useListCheckIns({ campus: "", service, serviceDate });
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
      await createCi.mutateAsync({ data: { workerId: worker.id, campus: "", service, serviceDate } });
    }
    checkInsQ.refetch();
  }

  const displayWorkers = tab === "Active"
    ? workers.filter(w => checkedInIds.has(w.id))
    : workers;

  const isLoading = workersQ.isLoading || checkInsQ.isLoading;

  function WorkerCard({ item }: { item: { id: number; name: string; role?: string | null } }) {
    const isIn = checkedInIds.has(item.id);
    const initials = item.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() ?? "?";
    return (
      <Pressable
        onPress={() => tab !== "Active" ? toggle(item) : null}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isIn ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.04)",
            borderColor: isIn ? "rgba(124,58,237,0.65)" : "rgba(255,255,255,0.1)",
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        {/* Check badge */}
        {isIn && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#a78bfa" />
          </View>
        )}

        {/* Avatar */}
        <LinearGradient
          colors={isIn ? ["#4c1d95", "#7c3aed"] : ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.04)"]}
          style={styles.avatar}
        >
          <Text style={[styles.initials, { color: isIn ? "#fff" : "rgba(255,255,255,0.5)" }]}>
            {initials}
          </Text>
        </LinearGradient>

        {/* Name */}
        <Text style={[styles.cardName, { color: isIn ? "#fff" : "rgba(255,255,255,0.75)" }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.role ? (
          <Text style={styles.cardRole} numberOfLines={1}>{item.role}</Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: topPad }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.serviceLabel}>{service || "Check-In"}</Text>
            <Text style={styles.dateSub}>{serviceDate}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: "rgba(255,255,255,0.08)" }]}>
          {TABS.map(t => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, { borderBottomColor: tab === t ? "#7c3aed" : "transparent" }]}
            >
              <Text style={[styles.tabText, { color: tab === t ? "#a78bfa" : "rgba(255,255,255,0.3)" }]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {/* Active count badge */}
        {checkIns.length > 0 && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{checkIns.length} checked in</Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color="rgba(180,140,255,0.7)" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            key={tab}
            data={displayWorkers}
            keyExtractor={(item) => String(item.id)}
            numColumns={COLS}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={{ padding: PAD, gap: GAP }}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => { workersQ.refetch(); checkInsQ.refetch(); }}
                tintColor="rgba(180,140,255,0.7)"
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyText}>No workers in this roster</Text>
              </View>
            }
            renderItem={({ item }) => <WorkerCard item={item} />}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  serviceLabel: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },
  dateSub: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 },
  tabs: {
    flexDirection: "row", borderBottomWidth: 1,
    marginHorizontal: 16, marginBottom: 4,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2 },
  tabText: { fontSize: 11, fontFamily: "Georgia", letterSpacing: 2, textTransform: "uppercase" },
  activeBadge: {
    alignSelf: "center", paddingVertical: 4, paddingHorizontal: 14,
    backgroundColor: "rgba(124,58,237,0.15)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)", marginVertical: 6,
  },
  activeBadgeText: { fontFamily: "Georgia", fontSize: 11, color: "#a78bfa", letterSpacing: 1 },

  // Grid cards
  card: {
    width: CARD_SIZE, height: CARD_SIZE,
    borderRadius: 20, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    padding: 12, position: "relative",
  },
  checkBadge: { position: "absolute", top: 10, right: 10 },
  avatar: {
    width: CARD_SIZE * 0.44, height: CARD_SIZE * 0.44,
    borderRadius: CARD_SIZE * 0.22,
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  initials: { fontFamily: "Georgia", fontSize: CARD_SIZE * 0.16, fontWeight: "600" },
  cardName: {
    fontFamily: "Georgia", fontSize: 13, textAlign: "center",
    letterSpacing: 0.3, lineHeight: 18,
  },
  cardRole: {
    fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.25)",
    textAlign: "center", marginTop: 3, letterSpacing: 0.5,
  },
  empty: { alignItems: "center", gap: 14, paddingTop: 80 },
  emptyText: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.2)" },
});
