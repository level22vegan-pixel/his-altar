import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Typed response shapes ───────────────────────────────────────────────────

interface CodeRow {
  id: number;
  code: number[];
  isAdmin: boolean;
  label: string;
  updatedAt: string;
}

// ── Auth-aware fetch helper ─────────────────────────────────────────────────

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE = DOMAIN ? `https://${DOMAIN}` : "";

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const str = await AsyncStorage.getItem("orgSession");
  const token: string | null = str ? (JSON.parse(str).token ?? null) : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> ?? {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── PIN display ─────────────────────────────────────────────────────────────

function PinDots({ code, size = 38 }: { code: number[]; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {code.map((n, i) => (
        <View key={i} style={[pinStyles.dot, { width: size, height: size, borderRadius: size / 4 }]}>
          <Text style={[pinStyles.digit, { fontSize: size * 0.42 }]}>{n}</Text>
        </View>
      ))}
    </View>
  );
}
const pinStyles = StyleSheet.create({
  dot: { borderWidth: 1, borderColor: "rgba(180,140,255,0.3)", backgroundColor: "rgba(180,140,255,0.1)", alignItems: "center", justifyContent: "center" },
  digit: { fontFamily: "Georgia", color: "rgba(180,140,255,0.9)" },
});

// ── Add-Code Modal ──────────────────────────────────────────────────────────

function AddCodeModal({
  visible, onClose, onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (code: number[], isAdmin: boolean, label: string) => Promise<void>;
}) {
  const [digits, setDigits] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() { setDigits([]); setIsAdmin(false); }
  function close() { reset(); onClose(); }

  function pressDigit(n: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDigits(d => [...d, n]);
  }
  function backspace() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDigits(d => d.slice(0, -1));
  }

  async function save() {
    if (digits.length === 0) return;
    setSaving(true);
    try {
      await onSave(digits, isAdmin, isAdmin ? "Admin" : "Staff");
      reset();
    } finally {
      setSaving(false);
    }
  }

  const keys = [1,2,3,4,5,6,7,8,9,null,0,"⌫"] as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={modal.overlay}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <View style={modal.sheet}>
          <Text style={modal.title}>New Access Code</Text>

          {/* Type toggle */}
          <View style={modal.typeRow}>
            {(["Staff", "Admin"] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setIsAdmin(t === "Admin")}
                style={[modal.typeBtn, (isAdmin ? t === "Admin" : t === "Staff") && modal.typeBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[modal.typeText, (isAdmin ? t === "Admin" : t === "Staff") && modal.typeTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PIN display */}
          <View style={modal.pinDisplay}>
            {digits.length === 0
              ? <Text style={modal.pinPlaceholder}>Enter a PIN sequence</Text>
              : <PinDots code={digits} size={40} />}
          </View>

          {/* Number pad */}
          <View style={modal.pad}>
            {keys.map((k, i) => {
              if (k === null) return <View key={i} style={modal.padKey} />;
              const isBack = k === "⌫";
              return (
                <TouchableOpacity
                  key={i}
                  style={[modal.padKey, isBack && modal.padBackKey]}
                  onPress={() => isBack ? backspace() : pressDigit(k as number)}
                  activeOpacity={0.6}
                >
                  <Text style={[modal.padKeyText, isBack && { color: "rgba(255,100,100,0.8)" }]}>
                    {k}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[modal.saveBtn, digits.length === 0 && { opacity: 0.35 }]}
            onPress={save}
            disabled={digits.length === 0 || saving}
            activeOpacity={0.7}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={modal.saveBtnText}>Save Code</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0f0e1a", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", padding: 24, paddingBottom: 36, gap: 16 },
  title: { fontFamily: "Georgia", fontSize: 16, color: "#fff", textAlign: "center" },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center" },
  typeBtnActive: { borderColor: "rgba(180,140,255,0.5)", backgroundColor: "rgba(180,140,255,0.12)" },
  typeText: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.35)" },
  typeTextActive: { color: "rgba(180,140,255,0.9)" },
  pinDisplay: { minHeight: 52, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 12 },
  pinPlaceholder: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.18)", textAlign: "center" },
  pad: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  padKey: { width: "30%", aspectRatio: 1.6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center", justifyContent: "center" },
  padBackKey: { backgroundColor: "rgba(255,80,80,0.06)", borderColor: "rgba(255,80,80,0.15)" },
  padKeyText: { fontFamily: "Georgia", fontSize: 20, color: "rgba(255,255,255,0.8)" },
  saveBtn: { backgroundColor: "rgba(180,140,255,0.25)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(180,140,255,0.4)", paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: "Georgia", fontSize: 15, color: "#fff" },
});

// ── Main screen ─────────────────────────────────────────────────────────────

export default function AccessCodesScreen() {
  const insets = useSafeAreaInsets();
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function loadCodes() {
    setLoading(true);
    try {
      const data = await apiFetch<{ codes: CodeRow[] }>("/api/config/login-codes");
      setCodes(data.codes);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to load codes");
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { loadCodes(); }, []));

  async function addCode(code: number[], isAdmin: boolean, label: string) {
    try {
      await apiFetch("/api/config/login-codes", {
        method: "POST",
        body: JSON.stringify({ code, isAdmin, label }),
      });
      await loadCodes();
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to add code");
      throw e;
    }
  }

  function confirmDelete(row: CodeRow) {
    Alert.alert(
      "Delete Code",
      `Remove the ${row.label} code [${row.code.join(", ")}]?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/config/login-codes/${row.id}`, { method: "DELETE" });
              await loadCodes();
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to delete");
            }
          },
        },
      ],
    );
  }

  const adminCodes = codes.filter(c => c.isAdmin);
  const staffCodes = codes.filter(c => !c.isAdmin);

  function Section({ title, rows, accent }: { title: string; rows: CodeRow[]; accent: string }) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: accent }]}>{title}</Text>
        {rows.length === 0 && (
          <Text style={styles.emptyHint}>No codes yet</Text>
        )}
        {rows.map(row => (
          <View key={row.id} style={styles.codeRow}>
            <View style={{ flex: 1, gap: 8 }}>
              <PinDots code={row.code} size={36} />
              <Text style={styles.codeLabel}>{row.label}</Text>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(row)} style={styles.deleteBtn} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={17} color="rgba(255,80,80,0.55)" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>Access Codes</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color="rgba(180,140,255,0.9)" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="rgba(180,140,255,0.7)" style={{ marginTop: 60 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <Section title="ADMIN CODES" rows={adminCodes} accent="rgba(251,191,36,0.7)" />
            <Section title="STAFF CODES" rows={staffCodes} accent="rgba(180,140,255,0.7)" />

            {/* PXP Callers link */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: "rgba(74,222,128,0.6)" }]}>PXP CALLERS</Text>
              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.7}
                onPress={() => router.push("/admin/pxp/callers")}
              >
                <Ionicons name="people-outline" size={18} color="rgba(74,222,128,0.7)" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkTitle}>Manage PXP Caller Codes</Text>
                  <Text style={styles.linkSub}>Set names &amp; PIN codes for follow-up callers</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      <AddCodeModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={addCode}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "rgba(180,140,255,0.3)", backgroundColor: "rgba(180,140,255,0.1)", alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 24, paddingBottom: 40 },
  section: { gap: 10 },
  sectionLabel: { fontFamily: "Georgia", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  emptyHint: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.18)", paddingLeft: 4 },
  codeRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14, gap: 10 },
  codeLabel: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1 },
  deleteBtn: { padding: 8 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(22,163,74,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(74,222,128,0.15)", padding: 16 },
  linkTitle: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.8)" },
  linkSub: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 },
});
