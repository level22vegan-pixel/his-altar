import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useGetPxpConfig, useUpdatePxpConfig } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type ScriptNode = {
  id: string;
  text: string;
  isTerminal?: boolean;
  responses: Array<{
    id: string;
    label: string;
    text: string;
    isTerminal?: boolean;
    responses: ScriptNode["responses"];
  }>;
};

interface SimResponse { label: string; nextId: string; }
interface SimNode { id: string; title: string; text: string; responses: SimResponse[]; isTerminal?: boolean; }
interface SimTree { nodes: Record<string, SimNode>; startId: string; spine: string[]; }

function isSimTree(raw: unknown): raw is SimTree {
  return (
    !!raw &&
    typeof raw === "object" &&
    "nodes" in (raw as object) &&
    "startId" in (raw as object)
  );
}

function convertSimToLegacy(sim: SimTree): ScriptNode {
  function build(id: string, visited = new Set<string>()): ScriptNode {
    if (visited.has(id)) return { id, text: "", responses: [], isTerminal: true };
    visited.add(id);
    const n = sim.nodes[id];
    if (!n) return { id, text: "", responses: [], isTerminal: true };
    const children: ScriptNode["responses"] = n.responses.map((r) => {
      const child = build(r.nextId, new Set(visited));
      return { id: child.id, label: r.label, text: child.text, isTerminal: child.isTerminal, responses: child.responses };
    });
    return { id: n.id, text: n.text, isTerminal: n.isTerminal, responses: children };
  }
  return build(sim.startId);
}

const BORDER_COLORS = [
  "hsl(270, 55%, 38%)",
  "hsl(270, 45%, 28%)",
  "hsl(270, 30%, 22%)",
  "hsl(270, 20%, 17%)",
];

function NodeEditor({
  node,
  depth,
  path,
  onUpdate,
}: {
  node: ScriptNode;
  depth: number;
  path: string;
  onUpdate: (path: string, field: "text" | "label", value: string) => void;
}) {
  const colors = useColors();
  const [collapsed, setCollapsed] = useState(depth > 1);
  const borderColor = BORDER_COLORS[Math.min(depth, BORDER_COLORS.length - 1)];

  return (
    <View style={[
      depth > 0 && { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: borderColor, paddingLeft: 14, marginTop: 12 },
    ]}>
      <View style={[styles.nodeCard, { borderColor }]}>
        <View style={styles.nodeCardRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nodeLabel, { color: "hsl(270, 35%, 55%)" }]}>
              {depth === 0 ? "OPENING SCRIPT" : "SCRIPT TEXT"}
              {node.isTerminal ? <Text style={{ color: "hsl(270, 55%, 52%)" }}>  ·  CLOSES CALL</Text> : null}
            </Text>
            <TextInput
              value={node.text}
              onChangeText={(v) => onUpdate(path, "text", v)}
              multiline
              style={[styles.textArea, { color: colors.foreground, borderColor: "hsl(270, 25%, 20%)" }]}
              placeholderTextColor="hsl(270, 20%, 36%)"
              placeholder="Script text…"
              textAlignVertical="top"
            />
            <Text style={styles.hintText}>
              Use:{" "}
              <Text style={{ color: "hsl(270, 55%, 65%)" }}>{"{contact_name}"}</Text>
              {"  "}
              <Text style={{ color: "hsl(270, 55%, 65%)" }}>{"{caller_name}"}</Text>
              {"  "}
              <Text style={{ color: "hsl(270, 55%, 65%)" }}>{"{campus}"}</Text>
            </Text>
          </View>

          {node.responses.length > 0 && (
            <Pressable
              onPress={() => setCollapsed((c) => !c)}
              style={styles.collapseBtn}
            >
              <Text style={{ color: "hsl(270, 30%, 48%)", fontFamily: "Georgia", fontSize: 12 }}>
                {collapsed ? `▶ ${node.responses.length}` : "▲"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {!collapsed && node.responses.length > 0 && (
        <View style={{ marginTop: 4 }}>
          {node.responses.map((r, i) => (
            <View key={r.id}>
              <View style={styles.labelRow}>
                <Text style={styles.responseLabel}>BUTTON {i + 1}: RESPONSE LABEL</Text>
                <TextInput
                  value={r.label}
                  onChangeText={(v) => onUpdate(`${path}.responses.${i}`, "label", v)}
                  style={[styles.labelInput, { color: "hsl(270, 55%, 72%)", borderColor: "hsl(270, 20%, 18%)" }]}
                  placeholder="Label shown to caller…"
                  placeholderTextColor="hsl(270, 20%, 36%)"
                />
              </View>
              <NodeEditor
                node={r as ScriptNode}
                depth={depth + 1}
                path={`${path}.responses.${i}`}
                onUpdate={onUpdate}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ScriptEditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 0 : insets.bottom;

  const { data: configData, refetch } = useGetPxpConfig();
  const updateConfig = useUpdatePxpConfig();

  const [tree, setTree] = useState<ScriptNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!configData?.scriptTree || tree) return;
    const raw = configData.scriptTree as unknown;
    if (isSimTree(raw)) {
      setTree(convertSimToLegacy(raw));
    } else if (raw && typeof raw === "object" && "id" in raw) {
      setTree(raw as ScriptNode);
    }
  }, [configData, tree]);

  function handleUpdate(path: string, field: "text" | "label", value: string) {
    if (!tree) return;
    setSaved(false);
    const parts = path === "root" ? [] : path.replace(/^root\.?/, "").split(".");
    const clone: Record<string, unknown> = JSON.parse(JSON.stringify(tree));
    let cur: Record<string, unknown> = clone;
    for (const part of parts) {
      if (part === "") continue;
      cur = cur[part] as Record<string, unknown>;
    }
    cur[field] = value;
    setTree(clone as unknown as ScriptNode);
  }

  async function handleSave() {
    if (!tree) return;
    setSaving(true);
    await updateConfig.mutateAsync({ data: { scriptTree: tree as Record<string, unknown> } });
    setSaving(false);
    setSaved(true);
    refetch();
  }

  return (
    <View style={[styles.root, { backgroundColor: "hsl(270, 8%, 3%)", paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="hsl(270, 45%, 68%)" />
          <Text style={styles.backText}>PXP</Text>
        </Pressable>
        <Text style={styles.pageTitle}>SCRIPT EDITOR</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.subtitle}>
        Edit each step. Use {"{contact_name}"}, {"{caller_name}"}, {"{campus}"} as placeholders.
      </Text>

      {!tree ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="hsl(270, 55%, 60%)" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading script…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + bottomPad }]}
          keyboardShouldPersistTaps="handled"
        >
          <NodeEditor node={tree} depth={0} path="root" onUpdate={handleUpdate} />
        </ScrollView>
      )}

      {/* Fixed save bar */}
      <View style={[styles.saveBar, { paddingBottom: bottomPad + 16, borderTopColor: "hsl(270, 25%, 16%)" }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving || !tree}
          style={[
            styles.saveBtn,
            {
              backgroundColor: saved
                ? "hsl(140, 45%, 16%)"
                : "hsl(270, 58%, 38%)",
              borderColor: saved ? "hsl(140, 45%, 28%)" : "hsl(270, 55%, 46%)",
              opacity: saving || !tree ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving…" : saved ? "✓  Saved" : "Save Script"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, width: 60 },
  backText: { color: "hsl(270, 45%, 68%)", fontFamily: "Georgia", fontSize: 13, letterSpacing: 1 },
  pageTitle: { color: "hsl(270, 55%, 88%)", fontFamily: "Georgia", fontSize: 16, letterSpacing: 4 },
  divider: { height: 2, backgroundColor: "transparent", marginHorizontal: 80,
    borderBottomWidth: 1, borderBottomColor: "hsl(270, 25%, 18%)" },
  subtitle: {
    color: "hsl(270, 25%, 48%)", fontFamily: "Georgia", fontSize: 10,
    letterSpacing: 1, textAlign: "center", paddingHorizontal: 24, marginTop: 8, marginBottom: 4,
  },
  scrollContent: { padding: 16 },
  loadingText: { fontFamily: "Georgia", fontSize: 13, marginTop: 12 },

  nodeCard: {
    backgroundColor: "hsl(270, 12%, 6%)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  nodeCardRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nodeLabel: {
    fontFamily: "Georgia", fontSize: 9, letterSpacing: 3,
    textTransform: "uppercase", marginBottom: 6,
  },
  textArea: {
    borderWidth: 1, borderRadius: 6, padding: 10,
    backgroundColor: "hsl(270, 10%, 4%)",
    fontFamily: "Georgia", fontSize: 13, lineHeight: 20,
    minHeight: 88,
  },
  hintText: {
    color: "hsl(270, 20%, 36%)", fontFamily: "Georgia", fontSize: 10, marginTop: 5,
  },
  collapseBtn: {
    marginTop: 26, padding: 6,
    backgroundColor: "hsl(270, 8%, 3%)",
    borderWidth: 1, borderColor: "hsl(270, 20%, 18%)",
    borderRadius: 5, flexShrink: 0,
  },
  labelRow: { marginTop: 10, marginLeft: 20, marginBottom: 4 },
  responseLabel: {
    color: "hsl(270, 25%, 44%)", fontFamily: "Georgia", fontSize: 9,
    letterSpacing: 2, textTransform: "uppercase", marginBottom: 5,
  },
  labelInput: {
    borderWidth: 1, borderRadius: 5, padding: 8,
    backgroundColor: "hsl(270, 10%, 4%)",
    fontFamily: "Georgia", fontSize: 12,
    maxWidth: 280,
  },

  saveBar: {
    paddingTop: 14, paddingHorizontal: 24,
    backgroundColor: "hsl(270, 10%, 4%)",
    borderTopWidth: 1,
  },
  saveBtn: {
    paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, alignItems: "center",
  },
  saveBtnText: {
    color: "hsl(270, 20%, 95%)", fontFamily: "Georgia",
    fontSize: 13, letterSpacing: 3, textTransform: "uppercase",
  },
});
