import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCreateDbancContact } from "@workspace/api-client-react";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { DarkInput } from "@/components/DarkInput";
import { GoldButton } from "@/components/GoldButton";

const CARRIERS = ["AT&T", "Verizon", "T-Mobile", "Sprint", "Other"];
const GENDERS = ["Male", "Female", "Other"];
const SERVICES = ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"];

export default function NewContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [carrier, setCarrier] = useState("");
  const [gender, setGender] = useState("");
  const [serviceTime, setServiceTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const create = useCreateDbancContact();

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError("First and last name required."); return; }
    setSaving(true); setError("");
    try {
      await create.mutateAsync({ data: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), carrier, gender, campus: "", serviceTime, notes: notes.trim() } });
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
          <Pressable key={item} onPress={() => onChange(value === item ? "" : item)} style={[styles.chip, { backgroundColor: value === item ? colors.primary : colors.card, borderColor: value === item ? colors.primary : colors.border }]}>
            <Text style={[styles.chipText, { color: value === item ? colors.primaryForeground : colors.foreground }]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: topPad + 20 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>NEW CONTACT</Text>
          <View style={{ width: 32 }} />
        </View>

        <DarkInput label="First Name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <DarkInput label="Last Name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <DarkInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Carrier</Text>
        <Chips items={CARRIERS} value={carrier} onChange={setCarrier} />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Gender</Text>
        <Chips items={GENDERS} value={gender} onChange={setGender} />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Service Time</Text>
        <Chips items={SERVICES} value={serviceTime} onChange={setServiceTime} />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Prayer Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Prayer request or notes…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          style={[styles.notes, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

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
  sectionLabel: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Georgia" },
  notes: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 14, fontFamily: "Georgia", minHeight: 100, textAlignVertical: "top", marginBottom: 20 },
  error: { fontSize: 12, fontFamily: "Georgia", marginBottom: 12 },
});
