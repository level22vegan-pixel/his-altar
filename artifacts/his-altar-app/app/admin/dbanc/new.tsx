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
import { DarkInput } from "@/components/DarkInput";
import { GoldButton } from "@/components/GoldButton";

const CARRIERS = ["AT&T", "Verizon", "T-Mobile", "Sprint", "Other"];

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
const GENDERS = ["Male", "Female"];
const PRAYER_TYPES = ["Salvation", "Rededication", "Came Forward for Prayer"] as const;
const SERVICES = ["8:00 AM", "10:00 AM", "12:00 PM", "7:00 PM"];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={label.text}>{children}</Text>
  );
}
const label = StyleSheet.create({
  text: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", color: "rgba(255,255,255,0.35)", marginBottom: 10, marginTop: 18 },
});

export default function NewContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [carrier, setCarrier] = useState("");
  const [gender, setGender] = useState("");
  const [prayerType, setPrayerType] = useState("");
  const [serviceTime, setServiceTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Who prayed — single autocomplete field
  const [prayedBy, setPrayedBy] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const workersQ = useListWorkers({ category: "master" });
  const workers = workersQ.data?.workers ?? [];
  const customFieldsQ = useListDbancCustomFields();
  const customFields = customFieldsQ.data?.fields ?? [];

  const create = useCreateDbancContact();

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError("First and last name required."); return; }
    setSaving(true); setError("");
    const finalPrayedBy = prayedBy.trim();
    try {
      await create.mutateAsync({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          carrier,
          gender,
          campus: "",
          serviceTime,
          notes: notes.trim(),
          customData: { ...(prayerType ? { prayerType } : {}), ...(finalPrayedBy ? { prayedBy: finalPrayedBy } : {}), ...customValues },
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  function Chips({ items, value, onChange }: { items: readonly string[]; value: string; onChange: (v: string) => void }) {
    return (
      <View style={styles.chips}>
        {items.map(item => (
          <Pressable
            key={item}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(value === item ? "" : item); }}
            style={[styles.chip, { backgroundColor: value === item ? colors.primary : colors.card, borderColor: value === item ? colors.primary : colors.border }]}
          >
            <Text style={[styles.chipText, { color: value === item ? colors.primaryForeground : colors.foreground }]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  const suggestions = prayedBy.trim().length > 0
    ? workers.filter(w => w.name.toLowerCase().includes(prayedBy.toLowerCase()))
    : workers;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: topPad + 20 }]} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>NEW CONTACT</Text>
          <View style={{ width: 32 }} />
        </View>

        <DarkInput label="First Name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <DarkInput label="Last Name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <DarkInput label="Phone" value={phone} onChangeText={t => setPhone(formatPhone(t))} keyboardType="phone-pad" />

        <SectionLabel>Carrier</SectionLabel>
        <Chips items={CARRIERS} value={carrier} onChange={setCarrier} />

        <SectionLabel>Gender</SectionLabel>
        <Chips items={GENDERS} value={gender} onChange={setGender} />

        <SectionLabel>Came Forward For</SectionLabel>
        <Chips items={PRAYER_TYPES} value={prayerType} onChange={setPrayerType} />

        <SectionLabel>Service Time</SectionLabel>
        <Chips items={SERVICES} value={serviceTime} onChange={setServiceTime} />

        <SectionLabel>Prayer Notes</SectionLabel>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Prayer request or notes…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          style={[styles.notes, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        {/* ── Admin-defined custom fields ── */}
        {customFields.map(field => {
          const val = customValues[field.label] ?? "";
          const setVal = (v: string) => setCustomValues(prev => ({ ...prev, [field.label]: v }));
          if (field.fieldType === "boolean") {
            return (
              <View key={field.id}>
                <SectionLabel>{field.label}</SectionLabel>
                <Chips items={["Yes", "No"]} value={val} onChange={setVal} />
              </View>
            );
          }
          if (field.fieldType === "select") {
            const opts = (field.options ?? []) as string[];
            return (
              <View key={field.id}>
                <SectionLabel>{field.label}</SectionLabel>
                <Chips items={opts} value={val} onChange={setVal} />
              </View>
            );
          }
          return (
            <DarkInput key={field.id} label={field.label} value={val} onChangeText={setVal} />
          );
        })}

        {/* ── Who Prayed ── */}
        <SectionLabel>Name of Altar Worker</SectionLabel>
        <View style={styles.autocompleteWrap}>
          <TextInput
            value={prayedBy}
            onChangeText={t => { setPrayedBy(t); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Type a name…"
            placeholderTextColor="rgba(255,255,255,0.2)"
            style={styles.autocompleteInput}
          />
          {prayedBy.length > 0 && (
            <Pressable onPress={() => { setPrayedBy(""); setShowSuggestions(false); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
            </Pressable>
          )}
          {showSuggestions && (workersQ.isLoading ? (
            <View style={styles.suggestionBox}>
              <ActivityIndicator color="rgba(167,139,250,0.6)" size="small" style={{ margin: 10 }} />
            </View>
          ) : suggestions.length > 0 ? (
            <View style={styles.suggestionBox}>
              {suggestions.slice(0, 6).map((w, i) => (
                <Pressable
                  key={w.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPrayedBy(w.name); setShowSuggestions(false); }}
                  style={[styles.suggestionRow, i > 0 && styles.suggestionDivider]}
                >
                  <View style={styles.suggestionAvatar}>
                    <Text style={styles.suggestionInitial}>{w.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.suggestionName}>{w.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null)}
        </View>

        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <GoldButton label="Save Contact" onPress={handleSave} loading={saving} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Georgia" },
  notes: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 14, fontFamily: "Georgia", minHeight: 100, textAlignVertical: "top", marginBottom: 8 },
  error: { fontSize: 12, fontFamily: "Georgia", marginBottom: 12 },

  // Autocomplete
  autocompleteWrap: { position: "relative", marginBottom: 24, zIndex: 10 },
  autocompleteInput: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)", color: "#fff", fontFamily: "Georgia",
    fontSize: 14, paddingVertical: 12, paddingHorizontal: 14, paddingRight: 38,
  },
  clearBtn: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  suggestionBox: {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
    backgroundColor: "#1a1228", borderWidth: 1, borderColor: "rgba(167,139,250,0.25)",
    borderRadius: 12, marginTop: 4, overflow: "hidden",
  },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  suggestionDivider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  suggestionAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.3)", alignItems: "center", justifyContent: "center",
  },
  suggestionInitial: { fontFamily: "Georgia", fontSize: 13, color: "#c4b5fd", fontWeight: "600" },
  suggestionName: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.85)", flex: 1 },
});
