import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useListDbancContacts } from "@workspace/api-client-react";
import type { DbancContact } from "@workspace/api-client-react";
import React, { useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const MENU = [
  { icon: "call-outline", label: "Start Call", desc: "Select contact & begin script", action: "call" },
  { icon: "time-outline", label: "Call Logs", desc: "History of all logged calls", action: "logs" },
  { icon: "create-outline", label: "Script Editor", desc: "Edit the full call script tree", action: "script" },
  { icon: "git-branch-outline", label: "Script Simulation", desc: "Walk through script as a caller", action: "simulation" },
] as const;

export default function PxpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { callerSession, logoutCaller } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<DbancContact | null>(null);

  const contactsQ = useListDbancContacts();
  const contacts = contactsQ.data?.contacts ?? [];
  const filtered = contacts
    .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase()))
    .slice(0, 5);

  function handleAction(action: string) {
    if (action === "call") {
      if (selectedContact) {
        router.push({ pathname: "/admin/pxp/contact/[id]" as any, params: { id: selectedContact.id } });
      } else {
        router.push("/admin/pxp/logs" as any);
      }
    } else if (action === "logs") {
      router.push("/admin/pxp/logs" as any);
    } else if (action === "script") {
      router.push("/admin/pxp/script" as any);
    } else {
      router.push("/admin/pxp/simulation" as any);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>PXP</Text>
        <Pressable onPress={async () => { await logoutCaller(); router.replace("/"); }}>
          <Ionicons name="log-out-outline" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {callerSession && (
        <View style={[styles.callerBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.callerName, { color: colors.foreground }]}>{callerSession.callerName}</Text>
          <Text style={[styles.callerCampus, { color: colors.mutedForeground }]}>{callerSession.campus}</Text>
        </View>
      )}

      <View style={styles.contactSection}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Select Contact (optional)</Text>
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
          <TextInput
            value={contactSearch}
            onChangeText={setContactSearch}
            placeholder="Search contacts…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {selectedContact && <Pressable onPress={() => { setSelectedContact(null); setContactSearch(""); }}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>}
        </View>

        {selectedContact ? (
          <View style={[styles.selectedContact, { backgroundColor: colors.primary }]}>
            <Text style={[styles.selectedName, { color: colors.primaryForeground }]}>
              {selectedContact.firstName} {selectedContact.lastName}
            </Text>
          </View>
        ) : contactSearch.length > 0 ? (
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filtered.map((c) => (
              <Pressable key={c.id} onPress={() => { setSelectedContact(c); setContactSearch(""); }} style={[styles.dropdownItem, { borderBottomColor: colors.border }]}>
                <Text style={[styles.dropdownName, { color: colors.foreground }]}>{c.firstName} {c.lastName}</Text>
                {c.campus && <Text style={[styles.dropdownMeta, { color: colors.mutedForeground }]}>{c.campus}</Text>}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.menu}>
        {MENU.map(item => (
          <Pressable
            key={item.label}
            onPress={() => handleAction(item.action)}
            style={({ pressed }) => [styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name={item.icon as any} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  callerBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 20 },
  callerName: { flex: 1, fontSize: 14, fontFamily: "Georgia" },
  callerCampus: { fontSize: 12, fontFamily: "Georgia" },
  contactSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 8 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Georgia" },
  selectedContact: { padding: 10, borderRadius: 8, marginTop: 6 },
  selectedName: { fontSize: 14, fontFamily: "Georgia", textAlign: "center" },
  dropdown: { borderRadius: 8, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  dropdownItem: { padding: 12, borderBottomWidth: 1 },
  dropdownName: { fontSize: 14, fontFamily: "Georgia" },
  dropdownMeta: { fontSize: 12, fontFamily: "Georgia", marginTop: 2 },
  menu: { gap: 12 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  itemLabel: { fontSize: 15, fontFamily: "Georgia", fontWeight: "600" },
  itemDesc: { fontSize: 12, fontFamily: "Georgia", marginTop: 2 },
});
