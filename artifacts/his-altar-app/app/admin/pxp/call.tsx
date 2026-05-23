import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useGetPxpConfig, useCreatePxpCallLog } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

interface SimResponse { label: string; nextId: string; }
interface SimNode {
  id: string; title: string; text: string;
  responses: SimResponse[]; isTerminal?: boolean;
  isSpine?: boolean; spineIndex?: number;
}
interface SimTree { nodes: Record<string, SimNode>; startId: string; spine: string[]; }

function convertLegacyTree(legacy: any): SimTree {
  const nodes: Record<string, SimNode> = {};
  function flatten(node: any) {
    if (!node?.id || nodes[node.id]) return;
    const responses: SimResponse[] = (node.responses || []).map((child: any) => ({
      label: child.label || "Continue",
      nextId: child.id,
    }));
    nodes[node.id] = {
      id: node.id,
      title: node.label || (node.id === "root" ? "Opening" : node.id),
      text: node.text || "",
      responses,
      isTerminal: node.isTerminal ?? responses.length === 0,
    };
    for (const child of (node.responses || [])) flatten(child);
  }
  flatten(legacy);
  const spine: string[] = [];
  let cur = legacy.id;
  const seen = new Set<string>();
  while (cur && nodes[cur] && !seen.has(cur)) {
    seen.add(cur); spine.push(cur);
    const first = nodes[cur].responses[0];
    if (!first || nodes[cur].isTerminal) break;
    cur = first.nextId;
  }
  spine.forEach((id, idx) => {
    if (nodes[id]) { nodes[id].isSpine = true; nodes[id].spineIndex = idx; }
  });
  return { nodes, startId: legacy.id, spine };
}

function fillPlaceholders(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export default function CallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { callerSession } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const params = useLocalSearchParams<{ contactId?: string; contactName?: string }>();

  const [tree, setTree] = useState<SimTree | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [outcome, setOutcome] = useState("");
  const [done, setDone] = useState(false);

  // completion fields
  const [servicesOffered, setServicesOffered] = useState("");
  const [feedback, setFeedback] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [logged, setLogged] = useState(false);

  const config = useGetPxpConfig();
  const logCall = useCreatePxpCallLog();

  useEffect(() => {
    if (!config.data) return;
    const raw = config.data.scriptTree as any;
    if (raw?.nodes && raw?.startId) {
      setTree(raw as SimTree);
      setHistory([raw.startId]);
    } else if (raw?.id && raw?.responses) {
      const converted = convertLegacyTree(raw);
      setTree(converted);
      setHistory([converted.startId]);
    }
  }, [config.data]);

  const currentId = history[history.length - 1];
  const node = tree?.nodes[currentId];
  const depth = history.length - 1;

  function next(nextId: string, responseLabel: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOutcome((prev) => (prev ? `${prev} → ${responseLabel}` : responseLabel));
    if (nextId === "__terminal__" || !tree?.nodes[nextId]) {
      setDone(true);
    } else {
      setHistory((h) => [...h, nextId]);
    }
  }

  function goBack() {
    if (history.length <= 1) return;
    setHistory((h) => h.slice(0, -1));
    setDone(false);
  }

  async function handleLogAndFinish() {
    if (logged || logCall.isPending) return;
    if (!params.contactId) { router.back(); return; }
    try {
      await logCall.mutateAsync({
        data: {
          contactId: parseInt(params.contactId),
          callerName: callerSession?.callerName ?? "Unknown",
          campus: callerSession?.campus ?? "",
          outcome: outcome || "Completed",
          notes: "",
          servicesOffered,
          feedback,
          flagged,
          flagNote,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogged(true);
    } catch { }
  }

  if (config.isLoading || !tree) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const contactName = params.contactName ?? "them";
  const callerName = callerSession?.callerName ?? "you";
  const campus = callerSession?.campus ?? "";
  const churchName = config.data?.churchName ?? "";
  const placeholderVars: Record<string, string> = {
    contact_name: contactName,
    caller_name: callerName,
    campus,
    church_name: churchName,
  };
  const stepLabel = done ? "Closing" : depth === 0 ? "Opening" : `Step ${depth + 1}`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {params.contactName ? `Calling ${params.contactName}` : "CALL SCRIPT"}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {callerName}
          </Text>
        </View>
        {/* Step dots */}
        <View style={styles.dots}>
          {[...Array(Math.max(1, depth + 1))].map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === depth ? colors.primary : colors.muted },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Script card */}
        {node && !done && (
          <>
            <View style={[styles.scriptCard, { backgroundColor: colors.card, borderColor: node.isSpine ? colors.primary : colors.border }]}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepBadgeText, { color: colors.primaryForeground }]}>{stepLabel}</Text>
              </View>
              <Text style={[styles.scriptText, { color: colors.foreground }]}>
                {fillPlaceholders(node.text, placeholderVars)}
              </Text>
            </View>

            <Text style={[styles.responseLabel, { color: colors.mutedForeground }]}>Their response:</Text>

            <View style={styles.responses}>
              {node.responses.map((r, i) => (
                <Pressable
                  key={i}
                  onPress={() => next(r.nextId, r.label)}
                  style={({ pressed }) => [
                    styles.responseBtn,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.responseBtnText, { color: colors.foreground }]}>{r.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>

            <View style={styles.bottomActions}>
              {depth > 0 && (
                <Pressable onPress={goBack} style={[styles.backBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>← Back</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => { setOutcome("Ended early"); setDone(true); }}
                style={[styles.endBtn, { borderColor: "rgba(239,68,68,0.4)" }]}
              >
                <Text style={styles.endBtnText}>End Call</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Completion screen */}
        {done && (
          <>
            <View style={[styles.completionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
              <Text style={[styles.completionTitle, { color: colors.foreground }]}>Call Complete</Text>
              <Text style={[styles.completionOutcome, { color: colors.mutedForeground }]}>
                Outcome: {outcome || "Completed"}
              </Text>
            </View>

            {!logged && (
              <>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Services offered (prayer, counseling, food, referral…)"
                  placeholderTextColor={colors.mutedForeground}
                  value={servicesOffered}
                  onChangeText={setServicesOffered}
                  multiline
                />
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Contact's feedback or response…"
                  placeholderTextColor={colors.mutedForeground}
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                />

                {/* Flag toggle */}
                <Pressable
                  onPress={() => setFlagged((f) => !f)}
                  style={[
                    styles.flagBtn,
                    {
                      backgroundColor: flagged ? "rgba(239,68,68,0.1)" : colors.card,
                      borderColor: flagged ? "rgba(239,68,68,0.5)" : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{flagged ? "🚩" : "⚑"}</Text>
                  <Text style={[styles.flagBtnText, { color: flagged ? "#f87171" : colors.mutedForeground }]}>
                    {flagged ? "Flagged for admin review" : "Flag for admin review"}
                  </Text>
                </Pressable>

                {flagged && (
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.card, borderColor: "rgba(239,68,68,0.4)", color: colors.foreground, minHeight: 72 }]}
                    placeholder="What should admin know about this contact? (optional)"
                    placeholderTextColor={colors.mutedForeground}
                    value={flagNote}
                    onChangeText={setFlagNote}
                    multiline
                  />
                )}

                <Pressable
                  onPress={handleLogAndFinish}
                  disabled={logCall.isPending}
                  style={[styles.logBtn, { backgroundColor: colors.primary, opacity: logCall.isPending ? 0.6 : 1 }]}
                >
                  <Text style={[styles.logBtnText, { color: colors.primaryForeground }]}>
                    {logCall.isPending ? "Logging…" : "Log Call & Return"}
                  </Text>
                </Pressable>

                {depth > 0 && (
                  <Pressable onPress={goBack} style={[styles.backBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>← Go Back</Text>
                  </Pressable>
                )}
              </>
            )}

            {logged && (
              <Pressable
                onPress={() => router.back()}
                style={[styles.logBtn, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={[styles.logBtnText, { color: colors.primary }]}>✓ Logged — Back</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 14, fontFamily: "Georgia", letterSpacing: 1.5 },
  headerSub: { fontSize: 11, fontFamily: "Georgia", marginTop: 2 },
  dots: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  scriptCard: { padding: 22, borderRadius: 14, borderWidth: 1, position: "relative", paddingTop: 30 },
  stepBadge: { position: "absolute", top: -11, left: 18, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 20 },
  stepBadgeText: { fontFamily: "Georgia", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" },
  scriptText: { fontSize: 16, fontFamily: "Georgia", lineHeight: 26 },
  responseLabel: { fontFamily: "Georgia", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
  responses: { gap: 10 },
  responseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12, borderWidth: 1 },
  responseBtnText: { flex: 1, fontSize: 14, fontFamily: "Georgia" },
  bottomActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  backBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  backBtnText: { fontFamily: "Georgia", fontSize: 12, letterSpacing: 1 },
  endBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  endBtnText: { fontFamily: "Georgia", fontSize: 12, color: "#f87171", letterSpacing: 1 },
  completionCard: { padding: 28, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 10 },
  completionTitle: { fontSize: 20, fontFamily: "Georgia", letterSpacing: 2 },
  completionOutcome: { fontSize: 13, fontFamily: "Georgia" },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontFamily: "Georgia", fontSize: 13, minHeight: 88, textAlignVertical: "top" },
  flagBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1 },
  flagBtnText: { fontFamily: "Georgia", fontSize: 13 },
  logBtn: { padding: 16, borderRadius: 12, alignItems: "center" },
  logBtnText: { fontFamily: "Georgia", fontSize: 14, letterSpacing: 2 },
});
