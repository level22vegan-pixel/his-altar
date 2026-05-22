import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useListPxpCallLogs, useListDbancContacts } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  FlatList, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

function formatDate(d: string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

export default function LogsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { callerSession } = useAppContext();

  const logsQ = useListPxpCallLogs({});
  const contactsQ = useListDbancContacts();

  const logs = logsQ.data?.logs ?? [];
  const contacts = contactsQ.data?.contacts ?? [];
  const contactsMap = Object.fromEntries(contacts.map((c) => [c.id, c]));
  const callerNames = [...new Set(logs.map((l) => l.callerName).filter(Boolean))].sort();

  const lockedCaller = callerSession?.callerName ?? null;
  const [filterCaller, setFilterCaller] = useState(lockedCaller ?? "");
  const [showCallerPicker, setShowCallerPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [showNewCall, setShowNewCall] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (filterCaller && log.callerName !== filterCaller) return false;
    return true;
  });

  const uniqueContacts = new Set(filteredLogs.map((l) => l.contactId)).size;
  const uniqueCallers = new Set(filteredLogs.map((l) => l.callerName)).size;

  const outcomeCounts: Record<string, number> = {};
  for (const log of filteredLogs) {
    const key = log.outcome?.trim() || "No outcome";
    outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1;
  }
  const topOutcomes = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const filteredContacts = contacts
    .filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase())
    )
    .slice(0, 6);

  const isLoading = logsQ.isLoading || contactsQ.isLoading;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>CALL HISTORY</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { logsQ.refetch(); contactsQ.refetch(); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            {/* Stats bar */}
            {logs.length > 0 && (
              <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statsRow}>
                  {[
                    { label: "Calls", value: filteredLogs.length },
                    { label: "Contacts", value: uniqueContacts },
                    { label: "Callers", value: uniqueCallers },
                  ].map(({ label, value }) => (
                    <View key={label} style={styles.statItem}>
                      <Text style={[styles.statNum, { color: colors.primary }]}>{value}</Text>
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
                    </View>
                  ))}
                </View>
                {topOutcomes.length > 0 && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                      <View style={styles.outcomeChips}>
                        {topOutcomes.map(([outcome, count]) => (
                          <View key={outcome} style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                            <Text style={[styles.chipCount, { color: colors.primary }]}>{count}</Text>
                            <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>{outcome}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}
              </View>
            )}

            {/* Filter by caller */}
            {!lockedCaller && callerNames.length > 0 && (
              <View style={{ marginBottom: 4 }}>
                <Pressable
                  onPress={() => setShowCallerPicker(!showCallerPicker)}
                  style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: filterCaller ? colors.primary : colors.border }]}
                >
                  <Ionicons name="funnel-outline" size={14} color={filterCaller ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.filterText, { color: filterCaller ? colors.primary : colors.mutedForeground }]}>
                    {filterCaller || "All callers"}
                  </Text>
                  {filterCaller && (
                    <Pressable onPress={() => setFilterCaller("")}>
                      <Ionicons name="close-circle" size={15} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </Pressable>
                {showCallerPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Pressable onPress={() => { setFilterCaller(""); setShowCallerPicker(false); }}
                      style={[styles.pickerItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.pickerItemText, { color: colors.mutedForeground }]}>All callers</Text>
                    </Pressable>
                    {callerNames.map((n) => (
                      <Pressable key={n} onPress={() => { setFilterCaller(n); setShowCallerPicker(false); }}
                        style={[styles.pickerItem, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.pickerItemText, { color: n === filterCaller ? colors.primary : colors.foreground }]}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* New Call search */}
            <Pressable
              onPress={() => setShowNewCall(!showNewCall)}
              style={[styles.newCallBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.newCallText, { color: colors.primaryForeground }]}>New Call</Text>
            </Pressable>

            {showNewCall && (
              <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
                  <TextInput
                    value={contactSearch}
                    onChangeText={setContactSearch}
                    placeholder="Search contacts…"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.searchInput, { color: colors.foreground }]}
                    autoFocus
                  />
                </View>
                {filteredContacts.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setShowNewCall(false);
                      setContactSearch("");
                      router.push({ pathname: "/admin/pxp/contact/[id]" as any, params: { id: c.id } });
                    }}
                    style={[styles.contactRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {c.firstName[0]}{c.lastName[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contactName, { color: colors.foreground }]}>
                        {c.firstName} {c.lastName}
                      </Text>
                      {c.campus && (
                        <Text style={[styles.contactMeta, { color: colors.mutedForeground }]}>{c.campus}</Text>
                      )}
                    </View>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                  </Pressable>
                ))}
                {contactSearch.length > 0 && filteredContacts.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No contacts found</Text>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="call-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No calls logged yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const contact = contactsMap[item.contactId];
          const name = contact
            ? `${contact.firstName} ${contact.lastName}`
            : `Contact #${item.contactId}`;
          return (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/admin/pxp/contact/[id]" as any, params: { id: item.contactId } })
              }
              style={({ pressed }) => [
                styles.logRow,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.logAvatar, { backgroundColor: colors.muted }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {contact ? `${contact.firstName[0]}${contact.lastName[0]}` : "#"}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[styles.logName, { color: colors.foreground }]}>{name}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{item.callerName}</Text>
                  </View>
                  {item.campus && (
                    <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{item.campus}</Text>
                    </View>
                  )}
                  {item.outcome && (
                    <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{item.outcome}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.logDate, { color: colors.mutedForeground }]}>{formatDate(item.calledAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  statsCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 3 },
  statNum: { fontFamily: "Georgia", fontSize: 26, lineHeight: 30 },
  statLabel: { fontFamily: "Georgia", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" },
  divider: { height: 1, marginVertical: 12 },
  outcomeChips: { flexDirection: "row", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipCount: { fontFamily: "Georgia", fontSize: 13, fontWeight: "bold" },
  chipLabel: { fontFamily: "Georgia", fontSize: 10 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  filterText: { flex: 1, fontFamily: "Georgia", fontSize: 13 },
  pickerDropdown: { borderRadius: 10, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  pickerItem: { padding: 12, borderBottomWidth: 1 },
  pickerItemText: { fontFamily: "Georgia", fontSize: 14 },
  newCallBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 12, marginBottom: 12 },
  newCallText: { fontFamily: "Georgia", fontSize: 14, letterSpacing: 2 },
  searchCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderBottomWidth: 1, borderColor: "transparent" },
  searchInput: { flex: 1, fontFamily: "Georgia", fontSize: 14 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  logAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontFamily: "Georgia", fontSize: 13, fontWeight: "bold" },
  contactName: { fontFamily: "Georgia", fontSize: 14 },
  contactMeta: { fontFamily: "Georgia", fontSize: 11, marginTop: 2 },
  logRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  logName: { fontFamily: "Georgia", fontSize: 15, fontWeight: "600" },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontFamily: "Georgia", fontSize: 10, letterSpacing: 0.3 },
  logDate: { fontFamily: "Georgia", fontSize: 10 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontFamily: "Georgia", fontSize: 14, padding: 12, textAlign: "center" },
});
