import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useListDbancCustomFields, useCreateDbancCustomField, useDeleteDbancCustomField } from "@workspace/api-client-react";
import React, { useState } from "react";
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const FIELD_TYPES = ["text", "select", "boolean"] as const;

export default function FieldsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "select" | "boolean">("text");
  const [saving, setSaving] = useState(false);

  const fieldsQ = useListDbancCustomFields();
  const fields = fieldsQ.data?.fields ?? [];
  const create = useCreateDbancCustomField();
  const del = useDeleteDbancCustomField();

  async function handleAdd() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await create.mutateAsync({ data: { label: label.trim(), fieldType, options: [], sortOrder: 0 } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLabel(""); setShowAdd(false); fieldsQ.refetch();
    } catch { } finally { setSaving(false); }
  }

  function handleDelete(field: { id: number; label: string }) {
    Alert.alert("Delete Field", `Delete "${field.label}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await del.mutateAsync({ id: field.id }); fieldsQ.refetch(); } },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>CUSTOM FIELDS</Text>
        <Pressable onPress={() => setShowAdd(v => !v)}>
          <Ionicons name={showAdd ? "close" : "add"} size={24} color={colors.primary} />
        </Pressable>
      </View>

      {showAdd && (
        <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Field label"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          />
          <View style={styles.typeRow}>
            {FIELD_TYPES.map(t => (
              <Pressable key={t} onPress={() => setFieldType(t)} style={[styles.typeBtn, { backgroundColor: fieldType === t ? colors.primary : colors.muted }]}>
                <Text style={[styles.typeBtnText, { color: fieldType === t ? colors.primaryForeground : colors.mutedForeground }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={handleAdd} disabled={saving || !label.trim()} style={[styles.addBtn, { backgroundColor: colors.primary, opacity: saving || !label.trim() ? 0.5 : 1 }]}>
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Add Field</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={fields}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={fieldsQ.isLoading} onRefresh={() => fieldsQ.refetch()} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No custom fields</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.fieldType, { color: colors.mutedForeground }]}>{item.fieldType}</Text>
            </View>
            <Pressable onPress={() => handleDelete(item)} style={styles.delBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </Pressable>
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
  addForm: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, gap: 10 },
  input: { padding: 12, borderRadius: 8, fontSize: 14, fontFamily: "Georgia" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  typeBtnText: { fontSize: 12, fontFamily: "Georgia" },
  addBtn: { paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  addBtnText: { fontSize: 13, fontFamily: "Georgia", letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1 },
  fieldLabel: { fontSize: 15, fontFamily: "Georgia" },
  fieldType: { fontSize: 11, fontFamily: "Georgia", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  delBtn: { padding: 8 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: "Georgia" },
});
