import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCreateDbancContact, useListWorkers } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
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

  // Who prayed
  const [prayedBy, setPrayedBy] = useState("");
  const [manualPrayer, setManualPrayer] = useState("");
  const [showManual, setShowManual] = useState(false);

  const workersQ = useListWorkers({ category: "master" });
  const workers = workersQ.data?.workers ?? [];

  const create = useCreateDbancContact();

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError("First and last name required."); return; }
    setSaving(true); setError("");
    const finalPrayedBy = showManual ? manualPrayer.trim() : prayedBy;
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
          customData: (finalPrayedBy || prayerType) ? { ...(prayerType ? { prayerType } : {}), ...(finalPrayedBy ? { prayedBy: finalPrayedBy } : {}) } : undefined,
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

  const activePrayedBy = showManual ? manualPrayer.trim() : prayedBy;

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

        {/* ── Who Prayed ── */}
        <View style={[styles.prayedCard, { backgroundColor: "rgba(124,58,237,0.07)", borderColor: "rgba(124,58,237,0.25)" }]}>
          <View style={styles.prayedHeader}>
            <Ionicons name="hand-right-outline" size={16} color="rgba(167,139,250,0.7)" />
            <Text style={styles.prayedTitle}>NAME OF ALTAR WORKER</Text>
            {activePrayedBy ? (
              <View style={styles.prayedBadge}>
                <Text style={styles.prayedBadgeText}>{activePrayedBy}</Text>
              </View>
            ) : null}
          </View>

          {/* Roster picker */}
          {!showManual && (
            <>
              {workersQ.isLoading ? (
                <ActivityIndicator color="rgba(167,139,250,0.6)" size="small" style={{ marginVertical: 10 }} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 2, paddingVertical: 4 }}>
                    {workers.map(w => {
                      const selected = prayedBy === w.name;
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPrayedBy(selected ? "" : w.name); }}
                          style={[styles.workerChip, {
                            backgroundColor: selected ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.05)",
                            borderColor: selected ? "#a78bfa" : "rgba(255,255,255,0.1)",
                          }]}
                        >
                          <LinearGradient
                            colors={selected ? ["#4c1d95", "#7c3aed"] : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)"]}
                            style={styles.workerAvatar}
                          >
                            <Text style={[styles.workerInitial, { color: selected ? "#fff" : "rgba(255,255,255,0.5)" }]}>
                              {w.name?.charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                          <Text style={[styles.workerName, { color: selected ? "#c4b5fd" : "rgba(255,255,255,0.6)" }]} numberOfLines={1}>
                            {w.name}
                          </Text>
                          {selected && <Ionicons name="checkmark-circle" size={14} color="#a78bfa" />}
                        </Pressable>
                      );
                    })}
                    {workers.length === 0 && !workersQ.isLoading && (
                      <Text style={styles.emptyWorkers}>No roster workers found</Text>
                    )}
                  </View>
                </ScrollView>
              )}
            </>
          )}

          {/* Manual entry */}
          {showManual && (
            <TextInput
              value={manualPrayer}
              onChangeText={setManualPrayer}
              placeholder="Enter name…"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoFocus
              style={styles.manualInput}
            />
          )}

          {/* Toggle manual/roster */}
          <Pressable
            onPress={() => {
              setShowManual(v => !v);
              setPrayedBy("");
              setManualPrayer("");
            }}
            style={styles.manualToggle}
          >
            <Ionicons name={showManual ? "people-outline" : "pencil-outline"} size={13} color="rgba(167,139,250,0.6)" />
            <Text style={styles.manualToggleText}>
              {showManual ? "Pick from roster" : "Enter manually"}
            </Text>
          </Pressable>
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

  // Who Prayed card
  prayedCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24 },
  prayedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  prayedTitle: { fontSize: 10, letterSpacing: 3, fontFamily: "Georgia", color: "rgba(167,139,250,0.7)", flex: 1 },
  prayedBadge: { backgroundColor: "rgba(124,58,237,0.3)", borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(167,139,250,0.4)" },
  prayedBadgeText: { fontFamily: "Georgia", fontSize: 11, color: "#c4b5fd" },

  // Roster worker chips (horizontal)
  workerChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, maxWidth: 150 },
  workerAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  workerInitial: { fontFamily: "Georgia", fontSize: 12, fontWeight: "600" },
  workerName: { fontFamily: "Georgia", fontSize: 12, flexShrink: 1 },
  emptyWorkers: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.2)", alignSelf: "center", paddingVertical: 8 },

  // Manual input
  manualInput: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)", color: "#fff", fontFamily: "Georgia",
    fontSize: 14, padding: 12, marginBottom: 10,
  },

  // Toggle link
  manualToggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  manualToggleText: { fontFamily: "Georgia", fontSize: 11, color: "rgba(167,139,250,0.6)" },
});
