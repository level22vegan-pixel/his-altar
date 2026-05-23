import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCreateDbancContact, useListDbancCustomFields, useListWorkers } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { GoldButton } from "@/components/GoldButton";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={sl.text}>{children}</Text>;
}
const sl = StyleSheet.create({
  text: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", color: "rgba(255,255,255,0.35)", marginBottom: 10, marginTop: 18 },
});

function Chips({ items, value, onChange, colors }: {
  items: string[]; value: string; onChange: (v: string) => void; colors: any;
}) {
  return (
    <View style={s.chips}>
      {items.map(item => (
        <Pressable
          key={item}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(value === item ? "" : item); }}
          style={[s.chip, { backgroundColor: value === item ? colors.primary : colors.card, borderColor: value === item ? colors.primary : colors.border }]}
        >
          <Text style={[s.chipText, { color: value === item ? colors.primaryForeground : colors.foreground }]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DarkField({ label, value, onChange, multiline, keyboardType, colors }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; keyboardType?: "default" | "phone-pad"; colors: any;
}) {
  return (
    <View>
      <SectionLabel>{label}</SectionLabel>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={`${label}…`}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={keyboardType === "phone-pad" ? "none" : "words"}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        style={[s.input, {
          backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground,
          minHeight: multiline ? 90 : undefined, textAlignVertical: multiline ? "top" : "center",
        }]}
      />
    </View>
  );
}

export default function NewContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Single keyed state for all field values:
  // system fields keyed by systemKey, custom fields keyed by field id (string)
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Autocomplete state for altar worker field
  const [showSuggestions, setShowSuggestions] = useState(false);

  const workersQ = useListWorkers({ category: "master" });
  const workers = workersQ.data?.workers ?? [];

  const fieldsQ = useListDbancCustomFields();
  const fields = fieldsQ.data?.fields ?? [];

  const create = useCreateDbancContact();

  function set(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      // Map system fields to their DB columns; remaining go to customData
      const customData: Record<string, string> = {};
      for (const f of fields) {
        const key = f.systemKey ? f.systemKey : String(f.id);
        if (!f.systemKey && values[key]) customData[f.label] = values[key];
      }

      const v = (k: string) => values[k] ?? "";

      await create.mutateAsync({
        data: {
          firstName: v("first_name"),
          lastName: v("last_name"),
          phone: v("phone"),
          carrier: v("carrier"),
          gender: v("gender"),
          campus: "",
          serviceTime: v("service_time"),
          prayerType: v("prayer_type"),
          notes: v("notes"),
          prayedForBy: v("prayed_for_by"),
          customData,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  const prayedByVal = values["prayed_for_by"] ?? "";
  const suggestions = prayedByVal.trim().length > 0
    ? workers.filter(w => w.name.toLowerCase().includes(prayedByVal.toLowerCase()))
    : workers;

  if (fieldsQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.root, { paddingTop: topPad + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[s.title, { color: colors.foreground }]}>NEW CONTACT</Text>
          <View style={{ width: 32 }} />
        </View>

        {fields.map(field => {
          const key = field.systemKey ?? String(field.id);
          const val = values[key] ?? "";
          const setVal = (v: string) => set(key, v);
          const opts = Array.isArray(field.options) ? (field.options as string[]) : [];

          if (field.fieldType === "select") {
            return (
              <View key={field.id}>
                <SectionLabel>{field.label}</SectionLabel>
                <Chips items={opts} value={val} onChange={setVal} colors={colors} />
              </View>
            );
          }

          if (field.fieldType === "boolean") {
            return (
              <View key={field.id}>
                <SectionLabel>{field.label}</SectionLabel>
                <Chips items={["Yes", "No"]} value={val} onChange={setVal} colors={colors} />
              </View>
            );
          }

          // Text fields — special cases
          if (field.systemKey === "phone") {
            return (
              <DarkField
                key={field.id} label={field.label} value={val}
                onChange={t => setVal(formatPhone(t))}
                keyboardType="phone-pad" colors={colors}
              />
            );
          }

          if (field.systemKey === "notes") {
            return (
              <DarkField key={field.id} label={field.label} value={val} onChange={setVal} multiline colors={colors} />
            );
          }

          if (field.systemKey === "prayed_for_by") {
            return (
              <View key={field.id}>
                <SectionLabel>{field.label}</SectionLabel>
                <View style={[s.autocompleteWrap, { zIndex: 10 }]}>
                  <TextInput
                    value={val}
                    onChangeText={t => { setVal(t); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Type a name…"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    style={[s.autocompleteInput, { borderColor: colors.border }]}
                  />
                  {val.length > 0 && (
                    <Pressable onPress={() => { setVal(""); setShowSuggestions(false); }} style={s.clearBtn}>
                      <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
                    </Pressable>
                  )}
                  {showSuggestions && (workersQ.isLoading ? (
                    <View style={[s.suggestionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <ActivityIndicator color={colors.primary} size="small" style={{ margin: 10 }} />
                    </View>
                  ) : suggestions.length > 0 ? (
                    <View style={[s.suggestionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {suggestions.slice(0, 6).map((w, i) => (
                        <Pressable
                          key={w.id}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVal(w.name); setShowSuggestions(false); }}
                          style={[s.suggestionRow, i > 0 && { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }]}
                        >
                          <View style={s.suggestionAvatar}>
                            <Text style={s.suggestionInitial}>{w.name?.charAt(0).toUpperCase()}</Text>
                          </View>
                          <Text style={[s.suggestionName, { color: colors.foreground }]}>{w.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null)}
                </View>
              </View>
            );
          }

          // Default text field
          return (
            <DarkField key={field.id} label={field.label} value={val} onChange={setVal} colors={colors} />
          );
        })}

        {error ? <Text style={[s.error, { color: colors.destructive }]}>{error}</Text> : null}
        <View style={{ marginTop: 24 }}>
          <GoldButton label="Save Contact" onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Georgia" },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 14, fontFamily: "Georgia", marginBottom: 4 },
  error: { fontSize: 12, fontFamily: "Georgia", marginBottom: 12 },
  autocompleteWrap: { position: "relative", marginBottom: 24 },
  autocompleteInput: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1,
    color: "#fff", fontFamily: "Georgia", fontSize: 14,
    paddingVertical: 12, paddingHorizontal: 14, paddingRight: 38,
  },
  clearBtn: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  suggestionBox: {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
    borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: "hidden",
  },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  suggestionAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(124,58,237,0.3)", alignItems: "center", justifyContent: "center" },
  suggestionInitial: { fontFamily: "Georgia", fontSize: 13, color: "#c4b5fd", fontWeight: "600" },
  suggestionName: { fontFamily: "Georgia", fontSize: 13, flex: 1 },
});
