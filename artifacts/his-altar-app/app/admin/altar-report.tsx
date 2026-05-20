import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useListServiceReports, useUpsertServiceReport } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Keyboard, Modal, Platform, Pressable, ScrollView, Share,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

// ─── Stable Counter component (module-level to prevent remount on re-render) ──
interface CounterProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dotColor: string;
}
function Counter({ label, value, onChange, dotColor }: CounterProps) {
  const [focused, setFocused] = useState(false);
  const n = parseInt(value) || 0;
  return (
    <View style={ctr.row}>
      <View style={[ctr.dot, { backgroundColor: dotColor }]} />
      <Text style={ctr.label}>{label}</Text>
      <View style={ctr.controls}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(String(Math.max(0, n - 1))); }}
          style={ctr.minusBtn}
        >
          <Text style={ctr.btnTxt}>−</Text>
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); const v = parseInt(value); onChange(isNaN(v) ? "0" : String(Math.max(0, v))); }}
          keyboardType="number-pad"
          selectTextOnFocus
          style={ctr.input}
        />
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(String(n + 1)); }}
          style={ctr.plusBtn}
        >
          <Text style={ctr.btnTxt}>+</Text>
        </Pressable>
        {focused && (
          <Pressable onPress={() => Keyboard.dismiss()} style={ctr.doneBtn}>
            <Text style={ctr.doneTxt}>Done</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const ctr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  label: { flex: 1, fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.8)" },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 },
  minusBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  plusBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center",
  },
  btnTxt: { fontSize: 20, color: "#fff", fontFamily: "Georgia" },
  input: {
    width: 56, textAlign: "center", fontFamily: "Georgia", fontSize: 20,
    color: "#fff", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 2,
  },
  doneBtn: {
    backgroundColor: "rgba(124,58,237,0.35)", borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(167,139,250,0.4)", paddingHorizontal: 10, paddingVertical: 6,
  },
  doneTxt: { fontFamily: "Georgia", fontSize: 12, color: "#c4b5fd" },
});

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICES = ["8:00 AM", "10:00 AM", "12:00 PM", "7:00 PM"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface DayTotals { servants: number; salvations: number; rededications: number; prayers: number; }

// ─── Export helpers ───────────────────────────────────────────────────────────
function buildDayExport(date: string, service: string, servants: number, salvations: number, rededications: number, prayers: number, notes: string) {
  return [
    `HIS ALTAR — DAY REPORT`,
    `Date: ${date}`,
    `Service: ${service}`,
    ``,
    `🙏 Altar Workers: ${servants}`,
    `✝  Salvations:    ${salvations}`,
    `↩  Rededications: ${rededications}`,
    `🕊  Prayer:        ${prayers}`,
    notes ? `\nNotes: ${notes}` : "",
  ].filter(l => l !== undefined).join("\n");
}

function buildMonthExport(year: number, month: number, reports: any[]) {
  const monthReports = reports.filter(r => {
    const d = r.serviceDate?.slice(0, 10) ?? "";
    return d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
  });

  const totals = monthReports.reduce(
    (acc, r) => ({
      servants: acc.servants + (r.servants ?? 0),
      salvations: acc.salvations + (r.salvations ?? 0),
      rededications: acc.rededications + (r.family ?? 0),
      prayers: acc.prayers + (r.prayers ?? 0),
    }),
    { servants: 0, salvations: 0, rededications: 0, prayers: 0 }
  );

  const lines: string[] = [
    `HIS ALTAR — MONTHLY REPORT`,
    `${MONTH_NAMES[month]} ${year}`,
    ``,
    `MONTHLY TOTALS`,
    `🙏 Altar Workers: ${totals.servants}`,
    `✝  Salvations:    ${totals.salvations}`,
    `↩  Rededications: ${totals.rededications}`,
    `🕊  Prayer:        ${totals.prayers}`,
    ``,
    `BY SERVICE`,
  ];

  SERVICES.forEach(svc => {
    const svcReports = monthReports.filter(r => r.service === svc);
    if (svcReports.length === 0) return;
    const st = svcReports.reduce((a, r) => ({
      servants: a.servants + (r.servants ?? 0),
      salvations: a.salvations + (r.salvations ?? 0),
      rededications: a.rededications + (r.family ?? 0),
      prayers: a.prayers + (r.prayers ?? 0),
    }), { servants: 0, salvations: 0, rededications: 0, prayers: 0 });
    lines.push(`\n${svc}`);
    lines.push(`  Workers: ${st.servants} | Salvations: ${st.salvations} | Reded.: ${st.rededications} | Prayer: ${st.prayers}`);
  });

  return lines.join("\n");
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AltarReportScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [servants, setServants] = useState("0");
  const [salvations, setSalvations] = useState("0");
  const [rededications, setRededications] = useState("0");
  const [prayers, setPrayers] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reportsQ = useListServiceReports();
  const upsert = useUpsertServiceReport();
  const allReports = reportsQ.data?.reports ?? [];

  // Group reports by date
  const byDate = useMemo(() => {
    const map: Record<string, DayTotals> = {};
    for (const r of allReports) {
      const d = r.serviceDate?.slice(0, 10);
      if (!d) continue;
      if (!map[d]) map[d] = { servants: 0, salvations: 0, rededications: 0, prayers: 0 };
      map[d].servants += r.servants ?? 0;
      map[d].salvations += r.salvations ?? 0;
      map[d].rededications += r.family ?? 0;
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

  function fillForm(dateStr: string, svc: string) {
    const existing = allReports.find(r => r.serviceDate?.slice(0, 10) === dateStr && r.service === svc);
    setServants(String(existing?.servants ?? 0));
    setSalvations(String(existing?.salvations ?? 0));
    setRededications(String(existing?.family ?? 0));
    setPrayers(String(existing?.prayers ?? 0));
    setNotes(existing?.notes ?? "");
  }

  function openDay(day: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dateStr = toDateStr(year, month, day);
    setSelectedDate(dateStr);
    setIsCustomTime(false);
    setCustomTime("");
    setSelectedService(SERVICES[0]);
    fillForm(dateStr, SERVICES[0]);
    setModalVisible(true);
  }

  function handleServiceChange(s: string) {
    setIsCustomTime(false);
    setSelectedService(s);
    fillForm(selectedDate, s);
  }

  function handleSelectCustom() {
    setIsCustomTime(true);
    setSelectedService("");
    setServants("0"); setSalvations("0"); setRededications("0"); setPrayers("0"); setNotes("");
  }

  // effective service value used when saving/exporting
  const effectiveService = isCustomTime ? customTime.trim() : selectedService;

  async function handleSave() {
    setSaving(true);
    try {
      const sv = parseInt(servants) || 0;
      const sa = parseInt(salvations) || 0;
      const re = parseInt(rededications) || 0;
      const pr = parseInt(prayers) || 0;
      await upsert.mutateAsync({
        data: {
          campus: "",
          service: effectiveService,
          serviceDate: selectedDate,
          servants: sv,
          salvations: sa,
          prayers: pr,
          family: re,
          totalEntries: sv + sa + re + pr,
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

  async function exportDay() {
    const text = buildDayExport(
      selectedDate, effectiveService,
      parseInt(servants) || 0, parseInt(salvations) || 0,
      parseInt(rededications) || 0, parseInt(prayers) || 0,
      notes,
    );
    await Share.share({ message: text, title: `Altar Report – ${selectedDate}` });
  }

  async function exportMonth() {
    const text = buildMonthExport(year, month, allReports);
    await Share.share({ message: text, title: `Altar Report – ${MONTH_NAMES[month]} ${year}` });
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: topPad }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>ALTAR REPORT</Text>
          <Pressable onPress={() => setExportVisible(true)} style={styles.exportBtn}>
            <Ionicons name="share-outline" size={22} color="rgba(167,139,250,0.8)" />
          </Pressable>
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
          {DAYS.map((d, i) => <Text key={i} style={styles.dow}>{d}</Text>)}
        </View>

        {reportsQ.isLoading && (
          <ActivityIndicator color="rgba(180,140,255,0.7)" style={{ marginTop: 20 }} />
        )}

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) return <View key={idx} style={styles.emptyCell} />;
              const dateStr = toDateStr(year, month, day);
              const data = byDate[dateStr];
              const isToday = dateStr === todayStr;
              const total = data ? data.servants + data.salvations + data.rededications + data.prayers : 0;
              return (
                <Pressable
                  key={idx}
                  onPress={() => openDay(day)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isToday && styles.todayCell,
                    data && styles.hasDataCell,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[
                    styles.dayNum,
                    isToday && { color: "#a78bfa" },
                    !data && !isToday && { color: "rgba(255,255,255,0.35)" },
                  ]}>
                    {day}
                  </Text>
                  {data && (
                    <View style={styles.dotsRow}>
                      {data.servants > 0 && <View style={[styles.dot, { backgroundColor: "#60a5fa" }]} />}
                      {data.salvations > 0 && <View style={[styles.dot, { backgroundColor: "#34d399" }]} />}
                      {data.rededications > 0 && <View style={[styles.dot, { backgroundColor: "#f472b6" }]} />}
                      {data.prayers > 0 && <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />}
                    </View>
                  )}
                  {data && total > 0 && <Text style={styles.dayTotal}>{total}</Text>}
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#60a5fa" }]} /><Text style={styles.legendText}>Workers</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#34d399" }]} /><Text style={styles.legendText}>Salvation</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#f472b6" }]} /><Text style={styles.legendText}>Reded.</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#f59e0b" }]} /><Text style={styles.legendText}>Prayer</Text></View>
          </View>
        </ScrollView>
      </View>

      {/* ── Day Edit Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={modal.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[modal.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={e => e.stopPropagation()}>
            <View style={modal.handle} />
            <View style={modal.dateRow}>
              <Text style={modal.dateLabel}>{selectedDate}</Text>
              <Pressable onPress={exportDay} style={modal.shareIcon}>
                <Ionicons name="share-outline" size={18} color="rgba(167,139,250,0.8)" />
                <Text style={modal.shareText}>Export Day</Text>
              </Pressable>
            </View>

            {/* Service time tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: isCustomTime ? 8 : 20 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 2 }}>
                {SERVICES.map(s => (
                  <Pressable key={s} onPress={() => handleServiceChange(s)}
                    style={[modal.serviceTab, {
                      backgroundColor: !isCustomTime && selectedService === s ? "#7c3aed" : "rgba(255,255,255,0.06)",
                      borderColor: !isCustomTime && selectedService === s ? "#7c3aed" : "rgba(255,255,255,0.1)",
                    }]}>
                    <Text style={[modal.serviceTabText, { color: !isCustomTime && selectedService === s ? "#fff" : "rgba(255,255,255,0.5)" }]}>{s}</Text>
                  </Pressable>
                ))}
                {/* Custom time tab */}
                <Pressable onPress={handleSelectCustom}
                  style={[modal.serviceTab, {
                    backgroundColor: isCustomTime ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)",
                    borderColor: isCustomTime ? "#34d399" : "rgba(255,255,255,0.1)",
                  }]}>
                  <Text style={[modal.serviceTabText, { color: isCustomTime ? "#34d399" : "rgba(255,255,255,0.4)" }]}>+ Custom</Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* Custom time input */}
            {isCustomTime && (
              <TextInput
                value={customTime}
                onChangeText={setCustomTime}
                placeholder="e.g. 6:00 PM, Friday 9am…"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoFocus
                style={[modal.notesInput, { minHeight: 0, marginBottom: 20, paddingVertical: 12 }]}
              />
            )}

            <Counter label="Altar Workers" value={servants} onChange={setServants} dotColor="#60a5fa" />
            <Counter label="Salvations" value={salvations} onChange={setSalvations} dotColor="#34d399" />
            <Counter label="Rededications" value={rededications} onChange={setRededications} dotColor="#f472b6" />
            <Counter label="Prayer Received" value={prayers} onChange={setPrayers} dotColor="#f59e0b" />

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
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={modal.saveBtnText}>SAVE REPORT</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Export Options Modal ── */}
      <Modal visible={exportVisible} transparent animationType="fade" onRequestClose={() => setExportVisible(false)}>
        <Pressable style={modal.overlay} onPress={() => setExportVisible(false)}>
          <View style={[modal.exportSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={modal.handle} />
            <Text style={modal.exportTitle}>EXPORT REPORT</Text>

            <Pressable onPress={async () => { setExportVisible(false); await exportMonth(); }}
              style={modal.exportOption}>
              <View style={[modal.exportIcon, { backgroundColor: "rgba(124,58,237,0.2)" }]}>
                <Ionicons name="calendar-outline" size={22} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.exportOptionLabel}>Export This Month</Text>
                <Text style={modal.exportOptionSub}>{MONTH_NAMES[month]} {year} — all services, totals breakdown</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
            </Pressable>

            <Pressable onPress={() => { setExportVisible(false); setModalVisible(true); setSelectedDate(todayStr); setSelectedService(SERVICES[0]); fillForm(todayStr, SERVICES[0]); }}
              style={modal.exportOption}>
              <View style={[modal.exportIcon, { backgroundColor: "rgba(52,211,153,0.15)" }]}>
                <Ionicons name="today-outline" size={22} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.exportOptionLabel}>Export a Specific Day</Text>
                <Text style={modal.exportOptionSub}>Open day editor → tap Export Day</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontFamily: "Georgia", fontSize: 16, letterSpacing: 4, color: "#fff" },
  exportBtn: { padding: 6 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8 },
  navBtn: { padding: 10 },
  monthLabel: { fontFamily: "Georgia", fontSize: 18, color: "#fff", letterSpacing: 1 },
  dowRow: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 8 },
  dow: { flex: 1, textAlign: "center", fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 4 },
  emptyCell: { width: `${100 / 7}%` as any, aspectRatio: 1 },
  dayCell: {
    width: `${100 / 7 - 1}%` as any, aspectRatio: 0.9, borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center", justifyContent: "center", paddingVertical: 4,
  },
  todayCell: { borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.28)", borderWidth: 2 },
  hasDataCell: { borderColor: "rgba(124,58,237,0.25)" },
  dayNum: { fontFamily: "Georgia", fontSize: 14, color: "#fff" },
  dotsRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayTotal: { fontFamily: "Georgia", fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 20, paddingHorizontal: 20, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.3)" },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0f0e1a", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24, paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  dateLabel: { fontFamily: "Georgia", fontSize: 16, color: "#fff", letterSpacing: 2 },
  shareIcon: { flexDirection: "row", alignItems: "center", gap: 5, padding: 6 },
  shareText: { fontFamily: "Georgia", fontSize: 11, color: "rgba(167,139,250,0.8)" },
  serviceTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  serviceTabText: { fontFamily: "Georgia", fontSize: 12 },
  notesInput: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: "Georgia",
    fontSize: 13, padding: 12, minHeight: 60, textAlignVertical: "top", marginBottom: 16,
  },
  saveBtn: { backgroundColor: "#7c3aed", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontFamily: "Georgia", fontSize: 13, letterSpacing: 3, color: "#fff" },

  // Export modal
  exportSheet: {
    backgroundColor: "#0f0e1a", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24, paddingTop: 12,
  },
  exportTitle: { fontFamily: "Georgia", fontSize: 12, letterSpacing: 4, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 24 },
  exportOption: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  exportIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  exportOptionLabel: { fontFamily: "Georgia", fontSize: 15, color: "#fff", marginBottom: 3 },
  exportOptionSub: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.35)" },
});
