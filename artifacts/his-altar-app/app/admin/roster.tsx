import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useListWorkers, useCreateWorker, useDeleteWorker } from "@workspace/api-client-react";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const TABS = ["Master", "Alt"] as const;
const CAMPUSES = ["Hallmark", "Arizona", "Arrowhead", "Pomona", "Riverside", "LA"];

export default function RosterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<"Master" | "Alt">("Master");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [campus, setCampus] = useState(CAMPUSES[0]);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const workersQ = useListWorkers({ category: tab.toLowerCase() });
  const workers = workersQ.data?.workers ?? [];
  const create = useCreateWorker();
  const del = useDeleteWorker();

  async function handleAdd() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await create.mutateAsync({ data: { name: name.trim(), role: role.trim() || tab, category: tab.toLowerCase(), campus, photoUrl: "" } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName(""); setRole(""); setShowAdd(false);
      workersQ.refetch();
    } catch { } finally { setAdding(false); }
  }

  function handleDelete(worker: { id: number; name: string }) {
    Alert.alert("Remove Worker", `Remove ${worker.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await del.mutateAsync({ id: worker.id });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          workersQ.refetch();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { paddingTop: topPad + 20 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>ROSTER</Text>
          <Pressable onPress={() => setShowAdd(v => !v)}>
            <Ionicons name={showAdd ? "close" : "add"} size={24} color={colors.primary} />
          </Pressable>
        </View>

        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {TABS.map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, { borderBottomColor: tab === t ? colors.primary : "transparent" }]}>
              <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>{t} Roster</Text>
            </Pressable>
          ))}
        </View>

        {showAdd && (
          <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Worker name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 8 }]}
            />
            <TextInput
              value={role}
              onChangeText={setRole}
              placeholder="Role (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 8 }]}
            />
            <View style={styles.campusRow}>
              {CAMPUSES.map(c => (
                <Pressable key={c} onPress={() => setCampus(c)} style={[styles.campusChip, { backgroundColor: campus === c ? colors.primary : colors.muted }]}>
                  <Text style={[styles.campusChipText, { color: campus === c ? colors.primaryForeground : colors.mutedForeground }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={handleAdd}
              disabled={adding || !name.trim()}
              style={[styles.addBtn, { backgroundColor: colors.primary, opacity: adding || !name.trim() ? 0.5 : 1 }]}
            >
              {adding ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : (
                <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Add to {tab} Roster</Text>
              )}
            </Pressable>
          </View>
        )}

        {workersQ.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
          <FlatList
            data={workers}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => workersQ.refetch()} tintColor={colors.primary} />}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No workers in {tab} roster</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  <Text style={{ color: colors.foreground, fontFamily: "Georgia", fontSize: 14 }}>{item.name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                  {item.campus && <Text style={[styles.role, { color: colors.mutedForeground }]}>{item.campus}</Text>}
                </View>
                <Pressable onPress={() => handleDelete(item)} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 0 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16, marginBottom: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 2 },
  tabText: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 1, textTransform: "uppercase" },
  addForm: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, gap: 10 },
  input: { padding: 12, fontSize: 14, fontFamily: "Georgia" },
  campusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  campusChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  campusChipText: { fontSize: 11, fontFamily: "Georgia" },
  addBtn: { paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  addBtnText: { fontSize: 13, fontFamily: "Georgia", letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontFamily: "Georgia" },
  role: { fontSize: 11, fontFamily: "Georgia", marginTop: 2 },
  delBtn: { padding: 8 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: "Georgia" },
});
