import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { orgSession } = useAppContext();

  const rows = [
    { label: "Church / Org Name", value: orgSession?.orgName ?? "—" },
    { label: "Account Type", value: orgSession ? "Church Admin" : "Staff" },
    { label: "Org ID", value: orgSession ? String(orgSession.orgId) : "—" },
  ];

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>
              {(orgSession?.orgName ?? "?")[0].toUpperCase()}
            </Text>
          </View>

          <Text style={styles.orgName}>{orgSession?.orgName ?? "Staff Account"}</Text>
          <Text style={styles.orgSub}>Church Admin</Text>

          <View style={styles.card}>
            {rows.map((r, i) => (
              <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },
  body: { padding: 24, alignItems: "center", gap: 8 },
  avatarRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: "rgba(180,140,255,0.4)", backgroundColor: "rgba(180,140,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { fontFamily: "Georgia", fontSize: 32, color: "rgba(180,140,255,0.9)" },
  orgName: { fontFamily: "Georgia", fontSize: 18, color: "#fff", textAlign: "center" },
  orgSub: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 },
  card: { width: "100%", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  rowLabel: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.4)" },
  rowValue: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.85)" },
});
