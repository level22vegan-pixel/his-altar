import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useGetPxpConfig, useUpdatePxpConfig } from "@workspace/api-client-react";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

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

export default function SimulationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const config = useGetPxpConfig();
  const updateConfig = useUpdatePxpConfig();
  const [tree, setTree] = useState<SimTree | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editResponses, setEditResponses] = useState<SimResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
  const spineLabels = tree?.spine.map(id => tree.nodes[id]?.title ?? id) ?? [];
  const activeSpineIndex = node?.isSpine ? (node.spineIndex ?? 0) : -1;

  function navigate_to(nextId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHistory(h => [...h, nextId]);
    setEditingId(null);
  }

  function goBack() {
    if (history.length <= 1) return;
    setHistory(h => h.slice(0, -1));
    setEditingId(null);
  }

  function restart() {
    if (!tree) return;
    setHistory([tree.startId]);
    setEditingId(null);
  }

  function jumpToSpine(idx: number) {
    if (!tree) return;
    const id = tree.spine[idx];
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHistory([id]);
    setEditingId(null);
  }

  function stepSpine(dir: 1 | -1) {
    if (!tree) return;
    const cur = activeSpineIndex >= 0 ? activeSpineIndex : 0;
    const next = cur + dir;
    if (next < 0 || next >= tree.spine.length) return;
    jumpToSpine(next);
  }

  const stepSpineRef = useRef(stepSpine);
  useEffect(() => { stepSpineRef.current = stepSpine; });

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) stepSpineRef.current(1);
        else if (g.dx > 40) stepSpineRef.current(-1);
      },
    })
  ).current;

  function startEdit(n: SimNode) {
    setEditingId(n.id);
    setEditTitle(n.title);
    setEditText(n.text);
    setEditResponses(n.responses.map(r => ({ ...r })));
    setSaved(false);
  }

  async function saveEdit() {
    if (!tree || !editingId) return;
    setSaving(true);
    const updated: SimTree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        [editingId]: { ...tree.nodes[editingId], title: editTitle.trim() || tree.nodes[editingId].title, text: editText, responses: editResponses },
      },
    };
    setTree(updated);
    await updateConfig.mutateAsync({ data: { scriptTree: updated as unknown as Record<string, unknown> } });
    setSaving(false);
    setSaved(true);
    setEditingId(null);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!tree || !node) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>SIMULATION</Text>
        <Pressable onPress={restart}>
          <Ionicons name="refresh-outline" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressBar}>
        {spineLabels.map((label, idx) => (
          <Pressable
            key={idx}
            onPress={() => jumpToSpine(idx)}
            style={({ pressed }) => [styles.stepWrap, { opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={[
              styles.stepDot,
              { backgroundColor: idx <= activeSpineIndex ? colors.primary : colors.muted },
              idx === activeSpineIndex && styles.stepDotActive,
            ]} />
            <Text style={[styles.stepLabel, { color: idx === activeSpineIndex ? colors.primary : colors.mutedForeground }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Branch/terminal indicators */}
      {!node.isSpine && !node.isTerminal && (
        <View style={[styles.indicator, { backgroundColor: "#3a2a10" }]}>
          <Text style={[styles.indicatorText, { color: "#c8a050" }]}>BRANCH · {node.title}</Text>
        </View>
      )}
      {node.isTerminal && (
        <View style={[styles.indicator, { backgroundColor: "#0f2e1a" }]}>
          <Text style={[styles.indicatorText, { color: "#4a9a6a" }]}>END OF PATH</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        {...swipeResponder.panHandlers}
      >
        {/* Script card */}
        <View style={[styles.scriptCard, { backgroundColor: colors.card, borderColor: node.isSpine ? colors.primary : node.isTerminal ? "#3a7a5a" : colors.border }]}>
          <View style={styles.nodeHeader}>
            <Text style={[styles.nodeTitle, { color: node.isSpine ? colors.primary : node.isTerminal ? "#4a9a6a" : "#c8a050" }]}>
              {node.isSpine ? `Step ${(node.spineIndex ?? 0) + 1} · ${node.title}` : node.title}
            </Text>
            {!editingId && (
              <Pressable onPress={() => startEdit(node)} style={[styles.editBtn, { borderColor: colors.border }]}>
                <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {editingId === node.id ? (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>TITLE</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  autoFocus
                  style={[styles.editInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>
              <View>
                <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>SCRIPT TEXT</Text>
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  style={[styles.editTextArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>
              {editResponses.length > 0 && (
                <View>
                  <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>RESPONSE BUTTONS</Text>
                  {editResponses.map((r, i) => (
                    <TextInput
                      key={i}
                      value={r.label}
                      onChangeText={v => setEditResponses(prev => prev.map((x, j) => j === i ? { ...x, label: v } : x))}
                      style={[styles.editInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, marginBottom: 6 }]}
                      placeholder={`Response ${i + 1}`}
                      placeholderTextColor={colors.mutedForeground}
                    />
                  ))}
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={saveEdit} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1, flex: 1 }]}>
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{saving ? "Saving…" : "Save"}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingId(null)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={[styles.scriptText, { color: colors.foreground }]}>{node.text}</Text>
          )}
        </View>

        {saved && <Text style={[styles.savedMsg, { color: "#4a9a6a" }]}>✓ Saved</Text>}

        {!editingId && (
          <>
            {/* Responses */}
            <View style={styles.responses}>
              {node.responses.map((r, i) => (
                <Pressable
                  key={i}
                  onPress={() => navigate_to(r.nextId)}
                  style={({ pressed }) => [styles.responseBtn, { backgroundColor: colors.muted, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.responseBtnText, { color: colors.foreground }]}>{r.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>

            {history.length > 1 && (
              <Pressable onPress={goBack} style={[styles.backBtn, { borderColor: colors.border }]}>
                <Ionicons name="arrow-undo-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>Back</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Georgia", letterSpacing: 4 },
  progressBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 4, alignItems: "center" },
  stepWrap: { alignItems: "center", width: 60 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  stepDotActive: { width: 13, height: 13, borderRadius: 7 },
  stepLabel: { fontSize: 9, fontFamily: "Georgia", letterSpacing: 0.5, textAlign: "center" },
  indicator: { paddingVertical: 6, paddingHorizontal: 16, alignItems: "center" },
  indicatorText: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia" },
  content: { padding: 16, gap: 12 },
  scriptCard: { padding: 18, borderRadius: 14, borderWidth: 1 },
  nodeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  nodeTitle: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia", flex: 1 },
  editBtn: { padding: 6, borderRadius: 6, borderWidth: 1 },
  scriptText: { fontSize: 15, fontFamily: "Georgia", lineHeight: 24 },
  editLabel: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia", marginBottom: 6 },
  editInput: { padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 14, fontFamily: "Georgia" },
  editTextArea: { padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 14, fontFamily: "Georgia", minHeight: 100, textAlignVertical: "top" },
  saveBtn: { paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  saveBtnText: { fontSize: 12, fontFamily: "Georgia", letterSpacing: 2 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontSize: 12, fontFamily: "Georgia" },
  savedMsg: { textAlign: "center", fontFamily: "Georgia", fontSize: 13 },
  responses: { gap: 8 },
  responseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  responseBtnText: { flex: 1, fontSize: 14, fontFamily: "Georgia" },
  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  backBtnText: { fontSize: 13, fontFamily: "Georgia" },
});
