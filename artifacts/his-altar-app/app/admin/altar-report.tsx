import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useListServiceReports, useUpsertServiceReport } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SERVICES = ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface DayReport {
  servants: number;
  salvations: number;
  prayers: number;
}

export default function AltarReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [servants, setServants] = useState("0");
  const [salvations, setSalvations] = useState("0");
  const [prayers, setPrayers] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reportsQ = useListServiceReports();
  const upsert = useUpsertServiceReport();
  const allReports = reportsQ.data?.reports ?? [];

  // Group reports by date → sum of servants, salvations, prayers
  const byDate = useMemo(() => {
    const map: Record<string, DayReport> = {};
    for (const r of allReports) {
      if (!r.serviceDate) continue;
      const d = r.serviceDate.slice(0, 10);
      if (!map[d]) map[d] = { servants: 0, salvations: 0, prayers: 0 };
      map[d].servants += r.servants ?? 0;
      map[d].salvations += r.salvations ?? 0;
      map[d].prayers += r.prayers ?? 0;
    }
    return map;
  }, [allReports]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function openDay(day: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dateStr = toDateStr(year, month, day);
    setSelectedDate(dateStr);
    // Pre-fill with first matching report for this date+service
    const existing = allReports.find(r => r.serviceDate?.slice(0, 10) === dateStr && r.service === selectedService);
    setServants(String(existing?.servants ?? 0));
    setSalvations(String(existing?.salvations ?? 0));
    setPrayers(String(existing?.prayers ?? 0));
    setNotes(existing?.notes ?? "");
    setModalVisible(true);
  }

  function handleServiceChange(s: string) {
    setSelectedService(s);
    const existing = allReports.find(r => r.serviceDate?.slice(0, 10) === selectedDate && r.service === s);
    setServants(String(existing?.servants ?? 0));
    setSalvations(String(existing?.salvations ?? 0));
    setPrayers(String(existing?.prayers ?? 0));
    setNotes(existing?.notes ?? "");
  }

  function counter(val: string, set: (v: string) => void, label: string) {
    const n = parseInt(val) || 0;
    return (
      <View style={modal.counterRow}>
        <Text style={modal.counterLabel}>{label}</Text>
        <View style={modal.counterControls}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set(String(Math.max(0, n - 1))); }}
            style={[modal.counterBtn, { borderColor: colors.border }]}>
            <Text style={[modal.counterBtnText, { color: colors.foreground }]}>−</Text>
          </Pressable>
          <TextInput
            value={val}
            onChangeText={set}
            keyboardType="number-pad"
            style={[modal.counterInput, { color: colors.foreground, borderColor: colors.border }]}
          />
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set(String(n + 1)); }}
            style={[modal.counterBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Text style={[modal.counterBtnText, { color: "#fff" }]}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsert.mutateAsync({
        data: {
          campus: "",
          service: selectedService,
          serviceDate: selectedDate,
          servants: parseInt(servants) || 0,
          salvations: parseInt(salvations) || 0,
          prayers: parseInt(prayers) || 0,
          totalEntries: (parseInt(servants) || 0) + (parseInt(salvations) || 0) + (parseInt(prayers) || 0),
          family: 0,
          notes: notes.trim() || undefined,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reportsQ.refetch();
      setModalVisible(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setSaving(false); }
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: topPad }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <Text style={styles.title}>ALTAR REPORT</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Month nav */}
        <View style={styles.monthRow}>
          <Pressable onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
          <Pressable onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.dowRow}>
          {DAYS.map((d, i) => (
            <Text key={i} style={styles.dow}>{d}</Text>
          ))}
        </View>

        {/* Loading */}
        {reportsQ.isLoading && (
          <ActivityIndicator color="rgba(180,140,255,0.7)" style={{ marginTop: 20 }} />
        )}

        {/* Calendar grid */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) return <View key={idx} style={styles.emptyCell} />;
              const dateStr = toDateStr(year, month, day);
              const data = byDate[dateStr];
              const isToday = dateStr === todayStr;
              return (
                <Pressable
                  key={idx}
                  onPress={() => openDay(day)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isToday && { borderColor: "rgba(124,58,237,0.6)", backgroundColor: "rgba(124,58,237,0.08)" },
                    data && { borderColor: "rgba(124,58,237,0.3)" },
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[
                    styles.dayNum,
                    isToday && { color: "#a78bfa" },
                    !data && { color: "rgba(255,255,255,0.4)" },
                  ]}>
                    {day}
                  </Text>
                  {data && (
                    <View style={styles.dataRow}>
                      {data.servants > 0 && <View style={[styles.dot, { backgroundColor: "#60a5fa" }]} />}
                      {data.salvations > 0 && <View style={[styles.dot, { backgroundColor: "#34d399" }]} />}
                      {data.prayers > 0 && <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />}
                    </View>
                  )}
                  {data && (
                    <Text style={styles.dayTotal}>
                      {(data.servants + data.salvations + data.prayers)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#60a5fa" }]} />
              <Text style={styles.legendText}>Workers</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#34d399" }]} />
              <Text style={styles.legendText}>Salvations</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
              <Text style={styles.legendText}>Prayer</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={modal.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[modal.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={e => e.stopPropagation()}>
            <View style={modal.handle} />
            <Text style={modal.dateLabel}>{selectedDate}</Text>

            {/* Service tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
                {SERVICES.map(s => (
                  <Pressable key={s} onPress={() => handleServiceChange(s)}
                    style={[modal.serviceTab, { backgroundColor: selectedService === s ? "#7c3aed" : "rgba(255,255,255,0.06)", borderColor: selectedService === s ? "#7c3aed" : "rgba(255,255,255,0.1)" }]}>
                    <Text style={[modal.serviceTabText, { color: selectedService === s ? "#fff" : "rgba(255,255,255,0.5)" }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {counter(servants, setServants, "🙏 Altar Workers")}
            {counter(salvations, setSalvations, "✝ Salvations")}
            {counter(prayers, setPrayers, "🕊 Prayer Received")}

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)…"
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              style={modal.notesInput}
            />

            <Pressable onPress={handleSave} disabled={saving}
              style={[modal.saveBtn, { opacity: saving ? 0.6 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.saveBtnText}>SAVE REPORT</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontFamily: "Georgia", fontSize: 16, letterSpacing: 4, color: "#fff", textShadowColor: "rgba(180,140,255,0.5)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8 },
  navBtn: { padding: 10 },
  monthLabel: { fontFamily: "Georgia", fontSize: 18, color: "#fff", letterSpacing: 1 },
  dowRow: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 8 },
  dow: { flex: 1, textAlign: "center", fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 4 },
  emptyCell: { width: `${100 / 7}%` as any, aspectRatio: 1 },
  dayCell: {
    width: `${100 / 7 - 1}%` as any,
    aspectRatio: 0.9,
    borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center", justifyContent: "center",
    paddingVertical: 4,
  },
  dayNum: { fontFamily: "Georgia", fontSize: 14, color: "#fff" },
  dataRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayTotal: { fontFamily: "Georgia", fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 20, paddingHorizontal: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.35)" },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0f0e1a", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24, paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 16 },
  dateLabel: { fontFamily: "Georgia", fontSize: 16, color: "#fff", textAlign: "center", letterSpacing: 2, marginBottom: 16 },
  serviceTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  serviceTabText: { fontFamily: "Georgia", fontSize: 12 },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  counterLabel: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.8)", flex: 1 },
  counterControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  counterBtnText: { fontSize: 20, fontFamily: "Georgia" },
  counterInput: { width: 52, textAlign: "center", fontFamily: "Georgia", fontSize: 20, borderBottomWidth: 1 },
  notesInput: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: "Georgia",
    fontSize: 13, padding: 12, minHeight: 60, textAlignVertical: "top", marginBottom: 16,
  },
  saveBtn: { backgroundColor: "#7c3aed", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontFamily: "Georgia", fontSize: 13, letterSpacing: 3, color: "#fff" },
});
