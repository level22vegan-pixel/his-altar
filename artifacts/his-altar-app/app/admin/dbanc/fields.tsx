import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useListDbancCustomFields,
  useCreateDbancCustomField,
  useUpdateDbancCustomField,
  useDeleteDbancCustomField,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const FIELD_TYPES = ["text", "select", "boolean"] as const;
type FieldType = typeof FIELD_TYPES[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children, locked }: { children: string; locked?: boolean }) {
  return (
    <View style={sLabel.row}>
      <Text style={sLabel.text}>{children}</Text>
      {locked && <Ionicons name="lock-closed-outline" size={10} color="rgba(255,255,255,0.2)" />}
    </View>
  );
}
const sLabel = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18, marginBottom: 10 },
  text: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", color: "rgba(255,255,255,0.35)" },
});

function PreviewInput({ label, placeholder }: { label: string; placeholder?: string }) {
  const colors = useColors();
  return (
    <View style={pi.wrap}>
      <SectionLabel locked>{label}</SectionLabel>
      <View style={[pi.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[pi.text, { color: colors.mutedForeground }]}>{placeholder ?? label}</Text>
        <Ionicons name="lock-closed-outline" size={12} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
      </View>
    </View>
  );
}
const pi = StyleSheet.create({
  wrap: { marginBottom: 2 },
  box: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 10, borderWidth: 1, opacity: 0.6 },
  text: { fontFamily: "Georgia", fontSize: 14 },
});

function PreviewChips({ label, items }: { label: string; items: string[] }) {
  const colors = useColors();
  return (
    <View>
      <SectionLabel locked>{label}</SectionLabel>
      <View style={pc.wrap}>
        {items.map(item => (
          <View key={item} style={[pc.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[pc.text, { color: colors.mutedForeground }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, opacity: 0.6 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 12, fontFamily: "Georgia" },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FieldsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fieldsQ = useListDbancCustomFields();
  const fields = fieldsQ.data?.fields ?? [];
  const create = useCreateDbancCustomField();
  const update = useUpdateDbancCustomField();
  const del = useDeleteDbancCustomField();

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newOptions, setNewOptions] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editType, setEditType] = useState<FieldType>("text");
  const [editOptions, setEditOptions] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const options = newType === "select"
        ? newOptions.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      await create.mutateAsync({ data: { label: newLabel.trim(), fieldType: newType, options, sortOrder: fields.length } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewLabel(""); setNewType("text"); setNewOptions(""); setShowAdd(false);
      fieldsQ.refetch();
    } catch { } finally { setSaving(false); }
  }

  function startEdit(field: { id: number; label: string; fieldType: string; options?: unknown }) {
    setEditingId(field.id);
    setEditLabel(field.label);
    setEditType(field.fieldType as FieldType);
    const opts = Array.isArray(field.options) ? (field.options as string[]).join(", ") : "";
    setEditOptions(opts);
  }

  async function handleSaveEdit() {
    if (!editingId || !editLabel.trim()) return;
    setEditSaving(true);
    try {
      const options = editType === "select"
        ? editOptions.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      await update.mutateAsync({ id: editingId, data: { label: editLabel.trim(), fieldType: editType, options } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingId(null);
      fieldsQ.refetch();
    } catch { } finally { setEditSaving(false); }
  }

  function handleDelete(field: { id: number; label: string }) {
    Alert.alert("Delete Field", `Remove "${field.label}" from the form?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => { await del.mutateAsync({ id: field.id }); fieldsQ.refetch(); },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>CONTACT FORM</Text>
        <Pressable
          onPress={() => { setShowAdd(v => !v); setEditingId(null); }}
          hitSlop={10}
        >
          <Ionicons name={showAdd ? "close-circle-outline" : "add-circle-outline"} size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Standard locked fields ── */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <Text style={[styles.sectionBadge, { color: colors.mutedForeground, backgroundColor: colors.muted }]}>
            CORE FIELDS · READ-ONLY
          </Text>
          <PreviewInput label="First Name" placeholder="e.g. John" />
          <PreviewInput label="Last Name" placeholder="e.g. Smith" />
          <PreviewInput label="Phone" placeholder="(555) 000-0000" />
          <PreviewChips label="Carrier" items={["AT&T", "Verizon", "T-Mobile", "Sprint", "Other"]} />
          <PreviewChips label="Gender" items={["Male", "Female"]} />
          <PreviewChips label="Came Forward For" items={["Salvation", "Rededication", "Came Forward for Prayer"]} />
          <PreviewChips label="Service Time" items={["8:00 AM", "10:00 AM", "12:00 PM", "7:00 PM"]} />
          <SectionLabel locked>Prayer Notes</SectionLabel>
          <View style={[styles.notesPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesPlaceholder, { color: colors.mutedForeground }]}>Prayer request or notes…</Text>
          </View>
        </View>

        {/* ── Custom fields ── */}
        <View style={[styles.section, { borderColor: colors.primary + "44" }]}>
          <Text style={[styles.sectionBadge, { color: colors.primary, backgroundColor: colors.primary + "22" }]}>
            CUSTOM FIELDS · EDITABLE
          </Text>

          {fields.length === 0 && !showAdd && (
            <View style={styles.emptyCustom}>
              <Ionicons name="add-circle-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No custom fields yet.{"\n"}Tap + to add one.
              </Text>
            </View>
          )}

          {fields.map(field => {
            const isEditing = editingId === field.id;
            const opts = Array.isArray(field.options) ? (field.options as string[]) : [];
            return (
              <View key={field.id} style={[styles.customFieldWrap, { borderColor: isEditing ? colors.primary : colors.border, backgroundColor: colors.card }]}>
                {isEditing ? (
                  /* ── Edit form ── */
                  <View style={styles.editForm}>
                    <Text style={[styles.editHeading, { color: colors.primary }]}>Edit Field</Text>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Label</Text>
                    <TextInput
                      value={editLabel}
                      onChangeText={setEditLabel}
                      autoFocus
                      style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                    />
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Type</Text>
                    <View style={styles.typeRow}>
                      {FIELD_TYPES.map(t => (
                        <Pressable key={t} onPress={() => setEditType(t)}
                          style={[styles.typeBtn, { backgroundColor: editType === t ? colors.primary : colors.muted }]}>
                          <Text style={[styles.typeBtnText, { color: editType === t ? colors.primaryForeground : colors.mutedForeground }]}>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {editType === "select" && (
                      <>
                        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Options (comma-separated)</Text>
                        <TextInput
                          value={editOptions}
                          onChangeText={setEditOptions}
                          placeholder="Option A, Option B, Option C"
                          placeholderTextColor={colors.mutedForeground}
                          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        />
                      </>
                    )}
                    <View style={styles.editActions}>
                      <Pressable onPress={handleSaveEdit} disabled={editSaving || !editLabel.trim()}
                        style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: editSaving || !editLabel.trim() ? 0.5 : 1 }]}>
                        <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{editSaving ? "Saving…" : "Save"}</Text>
                      </Pressable>
                      <Pressable onPress={() => setEditingId(null)}
                        style={[styles.cancelBtn, { borderColor: colors.border }]}>
                        <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  /* ── Field preview ── */
                  <View>
                    <View style={styles.customFieldHeader}>
                      <View style={[styles.typePill, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.typePillText, { color: colors.primary }]}>{field.fieldType}</Text>
                      </View>
                      <Text style={[styles.customFieldLabel, { color: colors.foreground }]}>{field.label}</Text>
                      <Pressable onPress={() => { startEdit(field); setShowAdd(false); }} hitSlop={8} style={styles.iconBtn}>
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(field)} hitSlop={8} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                      </Pressable>
                    </View>

                    {/* Mini preview of the rendered field */}
                    {field.fieldType === "boolean" && (
                      <View style={pc.wrap}>
                        {["Yes", "No"].map(o => (
                          <View key={o} style={[pc.chip, { borderColor: colors.border, opacity: 0.5 }]}>
                            <Text style={[pc.text, { color: colors.mutedForeground }]}>{o}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {field.fieldType === "select" && opts.length > 0 && (
                      <View style={pc.wrap}>
                        {opts.map(o => (
                          <View key={o} style={[pc.chip, { borderColor: colors.border, opacity: 0.5 }]}>
                            <Text style={[pc.text, { color: colors.mutedForeground }]}>{o}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {field.fieldType === "text" && (
                      <View style={[styles.textPreview, { borderColor: colors.border, opacity: 0.5 }]}>
                        <Text style={[styles.textPreviewPlaceholder, { color: colors.mutedForeground }]}>{field.label}…</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* ── Add new field form ── */}
          {showAdd && (
            <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Text style={[styles.editHeading, { color: colors.primary }]}>New Field</Text>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Label</Text>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="e.g. Follow-up Status"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              />
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Type</Text>
              <View style={styles.typeRow}>
                {FIELD_TYPES.map(t => (
                  <Pressable key={t} onPress={() => setNewType(t)}
                    style={[styles.typeBtn, { backgroundColor: newType === t ? colors.primary : colors.muted }]}>
                    <Text style={[styles.typeBtnText, { color: newType === t ? colors.primaryForeground : colors.mutedForeground }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              {newType === "select" && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Options (comma-separated)</Text>
                  <TextInput
                    value={newOptions}
                    onChangeText={setNewOptions}
                    placeholder="Option A, Option B, Option C"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  />
                </>
              )}
              <View style={styles.editActions}>
                <Pressable onPress={handleAdd} disabled={saving || !newLabel.trim()}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || !newLabel.trim() ? 0.5 : 1 }]}>
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{saving ? "Adding…" : "Add Field"}</Text>
                </Pressable>
                <Pressable onPress={() => { setShowAdd(false); setNewLabel(""); setNewType("text"); setNewOptions(""); }}
                  style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* ── Locked bottom field ── */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <Text style={[styles.sectionBadge, { color: colors.mutedForeground, backgroundColor: colors.muted }]}>
            CORE FIELDS · READ-ONLY
          </Text>
          <PreviewInput label="Name of Altar Worker" placeholder="Type a name…" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  scroll: { padding: 16, gap: 16 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 0 },
  sectionBadge: {
    alignSelf: "flex-start", fontSize: 9, letterSpacing: 2.5,
    fontFamily: "Georgia", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, marginBottom: 8,
  },
  notesPreview: {
    padding: 14, borderRadius: 10, borderWidth: 1, minHeight: 70,
    opacity: 0.6, marginBottom: 4,
  },
  notesPlaceholder: { fontFamily: "Georgia", fontSize: 14 },
  emptyCustom: { alignItems: "center", gap: 10, paddingVertical: 28 },
  emptyText: { fontFamily: "Georgia", fontSize: 13, textAlign: "center", lineHeight: 20 },
  customFieldWrap: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  customFieldHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  typePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  typePillText: { fontSize: 9, fontFamily: "Georgia", letterSpacing: 1.5, textTransform: "uppercase" },
  customFieldLabel: { flex: 1, fontFamily: "Georgia", fontSize: 14, fontWeight: "600" },
  iconBtn: { padding: 4 },
  textPreview: {
    padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 4,
  },
  textPreviewPlaceholder: { fontFamily: "Georgia", fontSize: 13 },
  editForm: { gap: 0 },
  editHeading: { fontFamily: "Georgia", fontSize: 12, letterSpacing: 2, marginBottom: 12 },
  inputLabel: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 6, marginTop: 10 },
  input: { padding: 11, borderRadius: 8, borderWidth: 1, fontSize: 14, fontFamily: "Georgia" },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  typeBtnText: { fontSize: 12, fontFamily: "Georgia" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  saveBtnText: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 1 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontSize: 12, fontFamily: "Georgia" },
  addForm: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 8 },
});
