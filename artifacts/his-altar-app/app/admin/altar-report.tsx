import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCreateAltarReport, useListAltarReports } from "@workspace/api-client-react";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

const RESPONSE_TYPES = ["Salvation", "Rededication", "Holy Spirit", "Water Baptism", "Healing", "Prayer"];

export default function AltarReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCampus, selectedService, selectedDate } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [name, setName] = useState("");
  const [responseType, setResponseType] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const reportsQ = useListAltarReports();
  const reports = reportsQ.data?.reports ?? (Array.isArray(reportsQ.data) ? (reportsQ.data as any[]) : []);
  const create = useCreateAltarReport();

  async function submit() {
    if (!responseType) { setError("Select a response type."); return; }
    setSaving(true); setError("");
    try {
      await create.mutateAsync({
        data: {
          name: name.trim() || "Anonymous",
          campus: selectedCampus ?? "",
          service: selectedService ?? "",
          responseType,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setName(""); setResponseType(""); setPhone(""); setNotes("");
      reportsQ.refetch();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Try again.");
    } finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: topPad + 20 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>ALTAR REPORT</Text>
          <View style={{ width: 32 }} />
        </View>

        {selectedCampus && (
          <Text style={[styles.context, { color: colors.mutedForeground }]}>
            {selectedCampus} · {selectedService} · {selectedDate}
          </Text>
        )}

        {/* Log entry form */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.mutedForeground }]}>LOG RESPONSE</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Person's name (optional)"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground }]}
          />

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Response Type</Text>
          <View style={styles.typeGrid}>
            {RESPONSE_TYPES.map(t => (
              <Pressable
                key={t}
                onPress={() => { setResponseType(t); setError(""); }}
                style={[styles.typeBtn, { backgroundColor: responseType === t ? colors.primary : colors.muted, borderColor: responseType === t ? colors.primary : colors.border }]}
              >
                <Text style={[styles.typeBtnText, { color: responseType === t ? colors.primaryForeground : colors.foreground }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone (optional)"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground }]}
          />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={2}
            style={[styles.textArea, { backgroundColor: colors.muted, color: colors.foreground }]}
          />

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          {saved ? <Text style={[styles.saved, { color: colors.success }]}>✓ Response logged</Text> : null}

          <Pressable
            onPress={submit}
            disabled={saving}
            style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, opacity: pressed || saving ? 0.7 : 1 }]}
          >
            {saving ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : (
              <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>LOG RESPONSE</Text>
            )}
          </Pressable>
        </View>

        {/* Recent entries */}
        <Text style={[styles.recentTitle, { color: colors.mutedForeground }]}>RECENT ENTRIES</Text>
        {reportsQ.isLoading ? <ActivityIndicator color={colors.primary} /> : (
          reports.slice(0, 10).map((r: any, i: number) => (
            <View key={r.id ?? i} style={[styles.reportRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>{r.responseType?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reportName, { color: colors.foreground }]}>{r.name}</Text>
                <Text style={[styles.reportMeta, { color: colors.mutedForeground }]}>{r.responseType} · {r.campus}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  context: { fontSize: 12, fontFamily: "Georgia", textAlign: "center", marginBottom: 20 },
  formCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 28 },
  formTitle: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia" },
  textInput: { padding: 12, borderRadius: 8, fontSize: 14, fontFamily: "Georgia" },
  textArea: { padding: 12, borderRadius: 8, fontSize: 14, fontFamily: "Georgia", minHeight: 60, textAlignVertical: "top" },
  sectionLabel: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  typeBtnText: { fontSize: 12, fontFamily: "Georgia" },
  error: { fontSize: 12, fontFamily: "Georgia" },
  saved: { fontSize: 12, fontFamily: "Georgia", textAlign: "center" },
  submitBtn: { paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  submitBtnText: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 3 },
  recentTitle: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 12 },
  reportRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 14, fontFamily: "Georgia", fontWeight: "600" },
  reportName: { fontSize: 14, fontFamily: "Georgia" },
  reportMeta: { fontSize: 11, fontFamily: "Georgia", marginTop: 2 },
});
