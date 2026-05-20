import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useListWorkers, useListCheckIns, useCreateCheckIn, useDeleteCheckIn,
  useGetTeamPreset, useSetTeamPreset,
} from "@workspace/api-client-react";
import type { Worker } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator, Dimensions, FlatList, Image, Modal, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";

const TABS = ["Roster", "Active", "Alt"] as const;
type Tab = typeof TABS[number];

const { width: SCREEN_W } = Dimensions.get("window");
const COLS = 2;
const GAP = 12;
const PAD = 16;
const CARD_SIZE = (SCREEN_W - PAD * 2 - GAP) / COLS;
const AVATAR_SIZE = CARD_SIZE * 0.44;

// ─── Avatar (photo or initials) ───────────────────────────────────────────────
function WorkerAvatar({ name, photoUrl, isIn, size }: { name: string; photoUrl?: string | null; isIn: boolean; size: number }) {
  const initials = name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[avStyle.img, { width: size, height: size, borderRadius: size / 2, borderColor: isIn ? "#4ade80" : "rgba(255,255,255,0.12)" }]}
      />
    );
  }
  return (
    <LinearGradient
      colors={isIn ? ["#14532d", "#16a34a"] : ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.04)"]}
      style={[avStyle.grad, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[avStyle.initials, { fontSize: size * 0.33, color: isIn ? "#86efac" : "rgba(255,255,255,0.45)" }]}>
        {initials}
      </Text>
    </LinearGradient>
  );
}
const avStyle = StyleSheet.create({
  img: { borderWidth: 2.5 },
  grad: { alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: "Georgia", fontWeight: "600" },
});

// ─── Worker card ──────────────────────────────────────────────────────────────
function WorkerCard({
  item, isIn, onPress,
}: {
  item: Worker; isIn: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isIn ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.04)",
          borderColor: isIn ? "rgba(74,222,128,0.55)" : "rgba(255,255,255,0.1)",
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {isIn && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
        </View>
      )}
      <WorkerAvatar name={item.name} photoUrl={item.photoUrl} isIn={isIn} size={AVATAR_SIZE} />
      <Text style={[styles.cardName, { color: isIn ? "#86efac" : "rgba(255,255,255,0.78)" }]} numberOfLines={2}>
        {item.name}
      </Text>
      {item.role ? <Text style={styles.cardRole} numberOfLines={1}>{item.role}</Text> : null}
    </Pressable>
  );
}

// ─── Set Team modal ───────────────────────────────────────────────────────────
function SetTeamModal({
  visible, allWorkers, presetIds, onSave, onClose,
}: {
  visible: boolean; allWorkers: Worker[]; presetIds: number[];
  onSave: (ids: number[]) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(presetIds));

  function toggle(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tm.overlay}>
        <View style={tm.sheet}>
          {/* Header */}
          <View style={tm.header}>
            <View>
              <Text style={tm.title}>SET TEAM</Text>
              <Text style={tm.sub}>Tap to include in preset · {selected.size} selected</Text>
            </View>
            <Pressable onPress={onClose} style={tm.closeBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>

          {/* Grid */}
          <ScrollView contentContainerStyle={tm.grid}>
            {allWorkers.map(w => {
              const sel = selected.has(w.id);
              return (
                <Pressable key={w.id} onPress={() => toggle(w.id)}
                  style={[tm.cell, { backgroundColor: sel ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.04)", borderColor: sel ? "rgba(74,222,128,0.45)" : "rgba(255,255,255,0.08)" }]}>
                  {sel && <View style={tm.selBadge}><Ionicons name="checkmark" size={10} color="#4ade80" /></View>}
                  <WorkerAvatar name={w.name} photoUrl={w.photoUrl} isIn={sel} size={52} />
                  <Text style={[tm.cellName, { color: sel ? "#86efac" : "rgba(255,255,255,0.7)" }]} numberOfLines={1}>{w.name}</Text>
                  {w.role ? <Text style={tm.cellRole} numberOfLines={1}>{w.role}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={tm.footer}>
            <Pressable onPress={() => onSave([...selected])} style={tm.saveBtn}>
              <Text style={tm.saveBtnText}>SAVE TEAM ({selected.size})</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(new Set())} style={tm.clearBtn}>
              <Text style={tm.clearBtnText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: { flex: 1, backgroundColor: "#0a0a0f", marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: "rgba(255,255,255,0.1)" },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  title: { fontFamily: "Georgia", fontSize: 14, letterSpacing: 4, color: "#fff" },
  sub: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 10 },
  cell: { width: (SCREEN_W - 52) / 3, borderRadius: 14, borderWidth: 1, alignItems: "center", padding: 10, gap: 6, position: "relative" },
  selBadge: { position: "absolute", top: 7, right: 7, width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(22,163,74,0.5)", alignItems: "center", justifyContent: "center" },
  cellName: { fontFamily: "Georgia", fontSize: 11, textAlign: "center" },
  cellRole: { fontFamily: "Georgia", fontSize: 9, color: "rgba(255,255,255,0.25)", textAlign: "center" },
  footer: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  saveBtn: { flex: 1, backgroundColor: "rgba(74,222,128,0.18)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(74,222,128,0.35)", paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: "Georgia", fontSize: 12, letterSpacing: 3, color: "#4ade80" },
  clearBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  clearBtnText: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const { selectedService, selectedDate } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<Tab>("Roster");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [settingActive, setSettingActive] = useState(false);

  const campus = "main";
  const service = selectedService ?? "";
  const serviceDate = selectedDate ?? new Date().toISOString().split("T")[0];

  const masterQ = useListWorkers({ category: "master" });
  const altQ = useListWorkers({ category: "alt" });
  const checkInsQ = useListCheckIns(
    { campus, service, serviceDate },
    { query: { queryKey: ["checkIns", campus, service, serviceDate], enabled: !!service } },
  );
  const createCi = useCreateCheckIn();
  const deleteCi = useDeleteCheckIn();

  const presetQ = useGetTeamPreset(
    { campus, service },
    { query: { queryKey: ["teamPreset", campus, service], enabled: !!service } },
  );
  const setPresetMut = useSetTeamPreset();

  const masterWorkers = masterQ.data?.workers ?? [];
  const altWorkers = altQ.data?.workers ?? [];
  const checkIns = checkInsQ.data?.checkIns ?? [];
  const checkedInIds = new Set(checkIns.map((c) => c.workerId));
  const teamPreset: number[] = presetQ.data?.workerIds ?? [];

  async function toggle(worker: Worker) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (checkedInIds.has(worker.id)) {
      const ci = checkIns.find((c) => c.workerId === worker.id);
      if (ci) await deleteCi.mutateAsync({ id: ci.id });
    } else {
      await createCi.mutateAsync({ data: { workerId: worker.id, campus, service, serviceDate } });
    }
    checkInsQ.refetch();
  }

  async function savePreset(ids: number[]) {
    await setPresetMut.mutateAsync({ data: { campus, service, workerIds: ids } });
    presetQ.refetch();
    setShowTeamModal(false);
  }

  async function handleSetActive() {
    const toCheckIn = teamPreset
      .map(id => masterWorkers.find(w => w.id === id))
      .filter((w): w is Worker => !!w && !w.onHold && !checkedInIds.has(w.id));
    if (toCheckIn.length === 0) return;
    setSettingActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await Promise.all(toCheckIn.map(w =>
        createCi.mutateAsync({ data: { workerId: w.id, campus, service, serviceDate } })
      ));
      checkInsQ.refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSettingActive(false);
    }
  }

  const displayWorkers = useMemo(() => {
    if (tab === "Active") return [...masterWorkers, ...altWorkers].filter(w => checkedInIds.has(w.id));
    if (tab === "Alt") return altWorkers;
    return masterWorkers;
  }, [tab, masterWorkers, altWorkers, checkedInIds]);

  const allRosterWorkers = [...masterWorkers, ...altWorkers];
  const isLoading = (tab === "Alt" ? altQ : masterQ).isLoading || checkInsQ.isLoading;
  const presetCount = teamPreset.length;

  function refetchAll() { masterQ.refetch(); altQ.refetch(); checkInsQ.refetch(); }

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
          {/* Active count */}
          <View style={[styles.activePill, { opacity: checkIns.length > 0 ? 1 : 0.3 }]}>
            <Text style={styles.activePillText}>{checkIns.length} in</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, { borderBottomColor: tab === t ? "#4ade80" : "transparent" }]}>
              <Text style={[styles.tabText, { color: tab === t ? "#4ade80" : "rgba(255,255,255,0.3)" }]}>
                {t}{t === "Active" && checkIns.length > 0 ? ` (${checkIns.length})` : ""}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Set Team + Set Active action bar */}
        <View style={styles.actionBar}>
          <Pressable onPress={() => setShowTeamModal(true)} style={styles.actionBtn}>
            <Ionicons name="people-outline" size={15} color="rgba(147,197,253,0.7)" />
            <Text style={[styles.actionBtnText, { color: "rgba(147,197,253,0.7)" }]}>
              Set Team{presetCount > 0 ? ` (${presetCount})` : ""}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSetActive}
            disabled={presetCount === 0 || settingActive}
            style={[styles.actionBtn, styles.setActiveBtn, { opacity: presetCount === 0 ? 0.35 : 1 }]}
          >
            {settingActive
              ? <ActivityIndicator size="small" color="#4ade80" />
              : <Ionicons name="flash-outline" size={15} color="#4ade80" />}
            <Text style={[styles.actionBtnText, { color: "#4ade80" }]}>Set Active</Text>
          </Pressable>
        </View>

        {/* Grid */}
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
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetchAll} tintColor="rgba(180,140,255,0.7)" />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.12)" />
                <Text style={styles.emptyText}>
                  {tab === "Active" ? "No workers checked in yet" : "No workers in this roster"}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <WorkerCard
                item={item}
                isIn={checkedInIds.has(item.id)}
                onPress={() => tab !== "Active" ? toggle(item) : null}
              />
            )}
          />
        )}
      </View>

      {/* Set Team Modal */}
      <SetTeamModal
        visible={showTeamModal}
        allWorkers={allRosterWorkers}
        presetIds={teamPreset}
        onSave={savePreset}
        onClose={() => setShowTeamModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  serviceLabel: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },
  dateSub: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 },
  activePill: { backgroundColor: "rgba(22,163,74,0.2)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(74,222,128,0.3)", paddingVertical: 3, paddingHorizontal: 10 },
  activePillText: { fontFamily: "Georgia", fontSize: 11, color: "#4ade80" },

  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", marginHorizontal: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2 },
  tabText: { fontSize: 11, fontFamily: "Georgia", letterSpacing: 2, textTransform: "uppercase" },

  actionBar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "rgba(147,197,253,0.2)", backgroundColor: "rgba(147,197,253,0.06)" },
  setActiveBtn: { borderColor: "rgba(74,222,128,0.3)", backgroundColor: "rgba(22,163,74,0.1)" },
  actionBtnText: { fontFamily: "Georgia", fontSize: 11, letterSpacing: 1 },

  // Grid cards
  card: {
    width: CARD_SIZE, height: CARD_SIZE,
    borderRadius: 20, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    padding: 12, position: "relative",
  },
  checkBadge: { position: "absolute", top: 10, right: 10 },
  cardName: { fontFamily: "Georgia", fontSize: 13, textAlign: "center", letterSpacing: 0.3, lineHeight: 18, marginTop: 8 },
  cardRole: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 3, letterSpacing: 0.5 },

  empty: { alignItems: "center", gap: 14, paddingTop: 80 },
  emptyText: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.2)", textAlign: "center" },
});
