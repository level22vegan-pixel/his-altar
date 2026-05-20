import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useGetPxpConfig, useCreatePxpCallLog } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

function fillPlaceholders(text: string, contactName: string, callerName: string) {
  return text.replace(/\{contact_name\}/g, contactName || "them").replace(/\{caller_name\}/g, callerName || "you");
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

  const config = useGetPxpConfig();
  const logCall = useCreatePxpCallLog();

  useEffect(() => {
    if (!config.data) return;
    const raw = config.data.scriptTree as any;
    if (raw?.nodes && raw?.startId) {
      setTree(raw as SimTree);
      setHistory([raw.startId]);
    }
  }, [config.data]);

  const currentId = history[history.length - 1];
  const node = tree?.nodes[currentId];

  function next(nextId: string, responseLabel: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOutcome(prev => prev ? `${prev} → ${responseLabel}` : responseLabel);
    if (nextId === "__terminal__" || !tree?.nodes[nextId]) {
      setDone(true);
    } else {
      setHistory(h => [...h, nextId]);
    }
  }

  function goBack() {
    if (history.length <= 1) return;
    setHistory(h => h.slice(0, -1));
  }

  async function finishCall() {
    if (!params.contactId) { router.back(); return; }
    try {
      await logCall.mutateAsync({
        data: {
          contactId: parseInt(params.contactId),
          callerName: callerSession?.callerName ?? "Unknown",
          campus: callerSession?.campus ?? "",
          outcome: outcome || "Completed",
          notes: "",
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { }
    router.back();
  }

  if (config.isLoading || !tree) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>;
  }

  const contactName = params.contactName ?? "them";
  const callerName = callerSession?.callerName ?? "you";

  if (done || node?.isTerminal) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad + 20 }]}>
        <View style={[styles.terminalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
          <Text style={[styles.terminalTitle, { color: colors.foreground }]}>Call Complete</Text>
          {node?.text ? (
            <Text style={[styles.terminalText, { color: colors.mutedForeground }]}>
              {fillPlaceholders(node.text, contactName, callerName)}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={finishCall}
          disabled={logCall.isPending}
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>
            {logCall.isPending ? "Saving…" : params.contactId ? "Save & Finish" : "Finish"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!node) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{params.contactName ?? "CALL SCRIPT"}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {node.isSpine ? `Step ${(node.spineIndex ?? 0) + 1}` : "Branch"} · {node.title}
          </Text>
        </View>
        {history.length > 1 ? (
          <Pressable onPress={goBack}><Ionicons name="arrow-undo-outline" size={22} color={colors.mutedForeground} /></Pressable>
        ) : <View style={{ width: 32 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.scriptCard, { backgroundColor: colors.card, borderColor: node.isSpine ? colors.primary : colors.border }]}>
          <Text style={[styles.scriptText, { color: colors.foreground }]}>
            {fillPlaceholders(node.text, contactName, callerName)}
          </Text>
        </View>

        <View style={styles.responses}>
          {node.responses.map((r, i) => (
            <Pressable
              key={i}
              onPress={() => next(r.nextId, r.label)}
              style={({ pressed }) => [styles.responseBtn, { backgroundColor: colors.muted, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.responseBtnText, { color: colors.foreground }]}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 14, fontFamily: "Georgia", letterSpacing: 2 },
  headerSub: { fontSize: 11, fontFamily: "Georgia", marginTop: 2 },
  content: { padding: 16, gap: 14 },
  scriptCard: { padding: 20, borderRadius: 14, borderWidth: 1 },
  scriptText: { fontSize: 16, fontFamily: "Georgia", lineHeight: 26 },
  responses: { gap: 10 },
  responseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12, borderWidth: 1 },
  responseBtnText: { flex: 1, fontSize: 14, fontFamily: "Georgia" },
  terminalCard: { margin: 24, padding: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 12 },
  terminalTitle: { fontSize: 20, fontFamily: "Georgia", letterSpacing: 2 },
  terminalText: { fontSize: 14, fontFamily: "Georgia", textAlign: "center", lineHeight: 22 },
  doneBtn: { marginHorizontal: 24, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  doneBtnText: { fontSize: 14, fontFamily: "Georgia", letterSpacing: 3 },
});
