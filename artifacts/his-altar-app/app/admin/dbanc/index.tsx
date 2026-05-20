import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useListDbancContacts, useDeleteDbancContact } from "@workspace/api-client-react";
import React, { useState } from "react";
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function DbancScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [search, setSearch] = useState("");

  const contactsQ = useListDbancContacts();
  const contacts = contactsQ.data?.contacts ?? [];
  const del = useDeleteDbancContact();

  const filtered = contacts.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(contact: { id: number; firstName: string; lastName: string }) {
    Alert.alert("Delete Contact", `Delete ${contact.firstName} ${contact.lastName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await del.mutateAsync({ id: contact.id }); contactsQ.refetch(); } },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>DBANC</Text>
        <Pressable onPress={() => router.push("/admin/dbanc/new" as any)}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={contactsQ.isLoading} onRefresh={() => contactsQ.refetch()} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No contacts match" : "No contacts yet"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/admin/dbanc/${item.id}` as any)}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Georgia", fontSize: 14 }}>{item.firstName?.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.firstName} {item.lastName}</Text>
              {item.campus && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.campus}</Text>}
              {item.phone && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.phone}</Text>}
            </View>
            <Pressable onPress={() => handleDelete(item)} style={styles.delBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, padding: 12, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Georgia" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontFamily: "Georgia" },
  meta: { fontSize: 12, fontFamily: "Georgia", marginTop: 2 },
  delBtn: { padding: 8 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: "Georgia" },
});
