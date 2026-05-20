import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useListPxpCallers,
  useDeletePxpCaller,
  useResetPxpCallerPassword,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  Alert, FlatList, Platform, Pressable, RefreshControl, Share,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE = DOMAIN ? `https://${DOMAIN}` : "";

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const str = await AsyncStorage.getItem("orgSession");
  const token: string | null = str ? (JSON.parse(str).token ?? null) : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...((init.headers as Record<string, string>) ?? {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export default function PxpCallersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [campus, setCampus] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());

  const callersQ = useListPxpCallers();
  const callers = callersQ.data?.callers ?? [];

  const deleteCaller = useDeletePxpCaller();
  const resetPassword = useResetPxpCallerPassword();

  async function handleAdd() {
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    setAddError("");
    try {
      const result = await apiFetch<{ id: number }>("/api/pxp/callers", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), campus: campus.trim(), phone: phone.trim(), code: code.trim() }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRevealedIds(prev => new Set(prev).add(result.id));
      setName(""); setPhone(""); setCampus(""); setCode(""); setAdding(false);
      callersQ.refetch();
    } catch (e: any) {
      setAddError(e.message ?? "Failed to add caller.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: number, callerName: string) {
    Alert.alert("Remove Caller", `Remove "${callerName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: () => deleteCaller.mutate({ id }, { onSuccess: () => callersQ.refetch() }),
      },
    ]);
  }

  function handleResetCode(id: number) {
    Alert.alert("Reset Code", "Generate a new code? Their current code will stop working.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", style: "destructive",
        onPress: () => resetPassword.mutate({ id }, {
          onSuccess: () => {
            setRevealedIds(prev => new Set(prev).add(id));
            callersQ.refetch();
          },
        }),
      },
    ]);
  }

  function toggleReveal(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function shareCode(callerName: string, password: string) {
    Share.share({ message: `${callerName}'s PXP code: ${password}` });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>PXP CALLERS</Text>
        <Pressable
          onPress={() => { setAdding(v => !v); setAddError(""); }}
          hitSlop={8}
        >
          <Ionicons name={adding ? "close" : "add"} size={26} color={colors.primary} />
        </Pressable>
      </View>

      {/* Add form */}
      {adding && (
        <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Full name *"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Campus (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={campus}
            onChangeText={setCampus}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Phone (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {/* Code row with Auto button */}
          <View style={styles.codeRow}>
            <TextInput
              style={[styles.input, styles.codeInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Assign a code *"
              placeholderTextColor={colors.mutedForeground}
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCode(generateCode()); }}
              style={[styles.autoBtn, { backgroundColor: colors.muted, borderColor: colors.primary }]}
            >
              <Text style={[styles.autoBtnText, { color: colors.primary }]}>Auto</Text>
            </Pressable>
          </View>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Type a code or tap Auto to generate one.
          </Text>

          {addError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{addError}</Text> : null}

          <Pressable
            onPress={handleAdd}
            disabled={saving || !name.trim() || !code.trim()}
            style={[
              styles.saveBtn,
              {
                backgroundColor: (name.trim() && code.trim()) ? colors.primary : colors.muted,
                opacity: saving ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.saveBtnText, { color: (name.trim() && code.trim()) ? colors.primaryForeground : colors.mutedForeground }]}>
              {saving ? "Saving…" : "Save Caller"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* List */}
      <FlatList
        data={callers}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={callersQ.isLoading} onRefresh={() => callersQ.refetch()} tintColor={colors.primary} />
        }
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No callers yet. Tap + to add one.</Text>
          </View>
        }
        renderItem={({ item: c }) => {
          const isRevealed = revealedIds.has(c.id);
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Top row: avatar + info + delete */}
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {c.name.trim()[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.callerName, { color: colors.foreground }]}>{c.name}</Text>
                  {(c.campus || c.phone) ? (
                    <Text style={[styles.callerMeta, { color: colors.mutedForeground }]}>
                      {[c.campus, c.phone].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => handleDelete(c.id, c.name)}
                  style={[styles.deleteBtn, { backgroundColor: "rgba(220,38,38,0.1)", borderColor: "rgba(220,38,38,0.25)" }]}
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                </Pressable>
              </View>

              {/* Code row */}
              <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>CODE</Text>
                <Text
                  style={[styles.codeValue, { color: isRevealed ? colors.primary : colors.mutedForeground, letterSpacing: isRevealed ? 4 : 2 }]}
                  selectable={isRevealed}
                >
                  {isRevealed ? c.password : "••••••"}
                </Text>
                <Pressable onPress={() => toggleReveal(c.id)} style={[styles.codeBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.codeBtnText, { color: colors.mutedForeground }]}>
                    {isRevealed ? "Hide" : "Show"}
                  </Text>
                </Pressable>
                {isRevealed && (
                  <Pressable onPress={() => shareCode(c.name, c.password)} style={[styles.codeBtn, { borderColor: colors.border }]}>
                    <Ionicons name="share-outline" size={13} color={colors.mutedForeground} />
                  </Pressable>
                )}
                <Pressable onPress={() => handleResetCode(c.id)} style={[styles.codeBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.codeBtnText, { color: colors.mutedForeground }]}>Reset</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },

  addForm: { marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  input: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 14, fontFamily: "Georgia" },
  codeRow: { flexDirection: "row", gap: 8 },
  codeInput: { flex: 1 },
  autoBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  autoBtnText: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 1, fontWeight: "600" },
  hint: { fontSize: 11, fontFamily: "Georgia" },
  errorText: { fontSize: 12, fontFamily: "Georgia" },
  saveBtn: { paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  saveBtnText: { fontSize: 13, fontFamily: "Georgia", letterSpacing: 1 },

  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Georgia", fontSize: 16, fontWeight: "600" },
  callerName: { fontFamily: "Georgia", fontSize: 15, fontWeight: "600" },
  callerMeta: { fontFamily: "Georgia", fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 8, borderRadius: 8, borderWidth: 1 },

  codeBox: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, gap: 6 },
  codeLabel: { fontSize: 9, fontFamily: "Georgia", letterSpacing: 2, textTransform: "uppercase" },
  codeValue: { flex: 1, fontFamily: "Georgia", fontSize: 14 },
  codeBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1 },
  codeBtnText: { fontFamily: "Georgia", fontSize: 10 },

  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontFamily: "Georgia", fontSize: 13, textAlign: "center" },
});
