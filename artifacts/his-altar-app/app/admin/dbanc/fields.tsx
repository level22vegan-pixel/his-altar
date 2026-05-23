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

// ── Same visual helpers as the real form ────────────────────────────────────

function FormLabel({ children }: { children: string }) {
  return <Text style={fl.text}>{children}</Text>;
}
const fl = StyleSheet.create({
  text: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", color: "rgba(255,255,255,0.35)", marginBottom: 10, marginTop: 18 },
});

function StaticInput({ label, placeholder }: { label: string; placeholder?: string }) {
  const colors = useColors();
  return (
    <View>
      <FormLabel>{label}</FormLabel>
      <View style={[si.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[si.placeholder, { color: colors.mutedForeground }]}>{placeholder ?? label}</Text>
      </View>
    </View>
  );
}
const si = StyleSheet.create({
  box: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  placeholder: { fontFamily: "Georgia", fontSize: 14 },
});

function StaticChips({ label, items }: { label: string; items: string[] }) {
  const colors = useColors();
  return (
    <View>
      <FormLabel>{label}</FormLabel>
      <View style={sc.row}>
        {items.map(item => (
          <View key={item} style={[sc.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[sc.text, { color: colors.foreground }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 12, fontFamily: "Georgia" },
});

// ── Inline edit panel ────────────────────────────────────────────────────────

function EditPanel({
  label, setLabel, fieldType, setFieldType, options, setOptions,
  onSave, onCancel, saving, isNew, colors,
}: {
  label: string; setLabel: (v: string) => void;
  fieldType: FieldType; setFieldType: (v: FieldType) => void;
  options: string; setOptions: (v: string) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; isNew: boolean; colors: any;
}) {
  return (
    <View style={[ep.wrap, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <Text style={[ep.heading, { color: colors.primary }]}>{isNew ? "NEW FIELD" : "EDIT FIELD"}</Text>

      <Text style={[ep.label, { color: colors.mutedForeground }]}>Label</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        autoFocus
        placeholder="e.g. Follow-up Status"
        placeholderTextColor={colors.mutedForeground}
        style={[ep.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
      />

      <Text style={[ep.label, { color: colors.mutedForeground }]}>Type</Text>
      <View style={ep.typeRow}>
        {FIELD_TYPES.map(t => (
          <Pressable key={t} onPress={() => setFieldType(t)}
            style={[ep.typeBtn, { backgroundColor: fieldType === t ? colors.primary : colors.muted }]}>
            <Text style={[ep.typeBtnText, { color: fieldType === t ? colors.primaryForeground : colors.mutedForeground }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {fieldType === "select" && (
        <>
          <Text style={[ep.label, { color: colors.mutedForeground }]}>Options (comma-separated)</Text>
          <TextInput
            value={options}
            onChangeText={setOptions}
            placeholder="Option A, Option B, Option C"
            placeholderTextColor={colors.mutedForeground}
            style={[ep.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          />
        </>
      )}

      <View style={ep.actions}>
        <Pressable onPress={onSave} disabled={saving || !label.trim()}
          style={[ep.saveBtn, { backgroundColor: colors.primary, opacity: saving || !label.trim() ? 0.5 : 1 }]}>
          <Text style={[ep.saveBtnText, { color: colors.primaryForeground }]}>{saving ? "Saving…" : isNew ? "Add" : "Save"}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={[ep.cancelBtn, { borderColor: colors.border }]}>
          <Text style={[ep.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
const ep = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, borderStyle: "dashed", padding: 16, marginVertical: 8 },
  heading: { fontSize: 10, letterSpacing: 3, fontFamily: "Georgia", marginBottom: 4 },
  label: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 6, marginTop: 10 },
  input: { padding: 11, borderRadius: 8, borderWidth: 1, fontSize: 14, fontFamily: "Georgia" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  typeBtnText: { fontSize: 12, fontFamily: "Georgia" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  saveBtnText: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 1 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontSize: 12, fontFamily: "Georgia" },
});

// ── Custom field row ─────────────────────────────────────────────────────────

function CustomFieldRow({
  field, isEditing, onEdit, onDelete, colors,
}: {
  field: { id: number; label: string; fieldType: string; options?: unknown };
  isEditing: boolean; onEdit: () => void; onDelete: () => void; colors: any;
}) {
  const opts = Array.isArray(field.options) ? (field.options as string[]) : [];

  return (
    <View style={[cfr.wrap, { borderColor: isEditing ? colors.primary : "transparent" }]}>
      {/* Label row with controls */}
      <View style={cfr.labelRow}>
        <Text style={[cfr.label, { color: "rgba(255,255,255,0.35)" }]}>{field.label.toUpperCase()}</Text>
        <Pressable onPress={onEdit} hitSlop={10} style={cfr.iconBtn}>
          <Ionicons name="pencil-outline" size={15} color={colors.primary} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={10} style={cfr.iconBtn}>
          <Ionicons name="trash-outline" size={15} color={colors.destructive} />
        </Pressable>
      </View>

      {/* Rendered field */}
      {field.fieldType === "boolean" && (
        <View style={sc.row}>
          {["Yes", "No"].map(o => (
            <View key={o} style={[sc.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[sc.text, { color: colors.foreground }]}>{o}</Text>
            </View>
          ))}
        </View>
      )}
      {field.fieldType === "select" && opts.length > 0 && (
        <View style={sc.row}>
          {opts.map(o => (
            <View key={o} style={[sc.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[sc.text, { color: colors.foreground }]}>{o}</Text>
            </View>
          ))}
        </View>
      )}
      {field.fieldType === "text" && (
        <View style={[si.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[si.placeholder, { color: colors.mutedForeground }]}>{field.label}…</Text>
        </View>
      )}
    </View>
  );
}
const cfr = StyleSheet.create({
  wrap: { borderRadius: 10, borderWidth: 1, paddingTop: 0 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8 },
  label: { flex: 1, fontSize: 10, letterSpacing: 3, fontFamily: "Georgia" },
  iconBtn: { padding: 4 },
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

  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newOptions, setNewOptions] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editType, setEditType] = useState<FieldType>("text");
  const [editOptions, setEditOptions] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAddSaving(true);
    try {
      const options = newType === "select" ? newOptions.split(",").map(s => s.trim()).filter(Boolean) : [];
      await create.mutateAsync({ data: { label: newLabel.trim(), fieldType: newType, options, sortOrder: fields.length } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewLabel(""); setNewType("text"); setNewOptions(""); setShowAdd(false);
      fieldsQ.refetch();
    } catch { } finally { setAddSaving(false); }
  }

  function startEdit(field: { id: number; label: string; fieldType: string; options?: unknown }) {
    setEditingId(field.id);
    setEditLabel(field.label);
    setEditType(field.fieldType as FieldType);
    setEditOptions(Array.isArray(field.options) ? (field.options as string[]).join(", ") : "");
    setShowAdd(false);
  }

  async function handleSaveEdit() {
    if (!editingId || !editLabel.trim()) return;
    setEditSaving(true);
    try {
      const options = editType === "select" ? editOptions.split(",").map(s => s.trim()).filter(Boolean) : [];
      await update.mutateAsync({ id: editingId, data: { label: editLabel.trim(), fieldType: editType, options } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingId(null);
      fieldsQ.refetch();
    } catch { } finally { setEditSaving(false); }
  }

  function handleDelete(field: { id: number; label: string }) {
    Alert.alert("Remove Field", `Remove "${field.label}" from the form?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await del.mutateAsync({ id: field.id }); fieldsQ.refetch(); } },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>CONTACT FORM</Text>
        <Pressable onPress={() => { setShowAdd(v => !v); setEditingId(null); }} hitSlop={10}>
          <Ionicons name={showAdd ? "close-circle-outline" : "add-circle-outline"} size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Standard fields */}
        <StaticInput label="First Name" placeholder="e.g. John" />
        <StaticInput label="Last Name" placeholder="e.g. Smith" />
        <StaticInput label="Phone" placeholder="(555) 000-0000" />
        <StaticChips label="Carrier" items={["AT&T", "Verizon", "T-Mobile", "Sprint", "Other"]} />
        <StaticChips label="Gender" items={["Male", "Female"]} />
        <StaticChips label="Came Forward For" items={["Salvation", "Rededication", "Came Forward for Prayer"]} />
        <StaticChips label="Service Time" items={["8:00 AM", "10:00 AM", "12:00 PM", "7:00 PM"]} />

        <FormLabel>Prayer Notes</FormLabel>
        <View style={[si.box, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 70 }]}>
          <Text style={[si.placeholder, { color: colors.mutedForeground }]}>Prayer request or notes…</Text>
        </View>

        {/* Custom fields — rendered in form position with edit controls */}
        {fields.map(field => (
          <View key={field.id}>
            {editingId === field.id ? (
              <EditPanel
                label={editLabel} setLabel={setEditLabel}
                fieldType={editType} setFieldType={setEditType}
                options={editOptions} setOptions={setEditOptions}
                onSave={handleSaveEdit} onCancel={() => setEditingId(null)}
                saving={editSaving} isNew={false} colors={colors}
              />
            ) : (
              <CustomFieldRow
                field={field} isEditing={false}
                onEdit={() => startEdit(field)}
                onDelete={() => handleDelete(field)}
                colors={colors}
              />
            )}
          </View>
        ))}

        {/* Add new field panel */}
        {showAdd && (
          <EditPanel
            label={newLabel} setLabel={setNewLabel}
            fieldType={newType} setFieldType={setNewType}
            options={newOptions} setOptions={setNewOptions}
            onSave={handleAdd} onCancel={() => { setShowAdd(false); setNewLabel(""); setNewType("text"); setNewOptions(""); }}
            saving={addSaving} isNew colors={colors}
          />
        )}

        {/* Altar worker field */}
        <StaticInput label="Name of Altar Worker" placeholder="Type a name…" />
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
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
});
