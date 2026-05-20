import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetLoginCode } from "@workspace/api-client-react";

export default function AccessCodesScreen() {
  const insets = useSafeAreaInsets();
  const codeQ = useGetLoginCode();
  const code: number[] = codeQ.data?.code ?? [];

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>Access Codes</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>CURRENT PIN</Text>
          {codeQ.isLoading ? (
            <ActivityIndicator color="rgba(180,140,255,0.7)" style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.pinRow}>
              {code.map((digit, i) => (
                <View key={i} style={styles.pinDot}>
                  <Text style={styles.pinDigit}>{digit}</Text>
                </View>
              ))}
              {code.length === 0 && (
                <Text style={styles.emptyText}>No code set</Text>
              )}
            </View>
          )}
          <Text style={styles.hint}>
            To change the access code, use the Admin Panel on the web portal.
          </Text>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },
  body: { padding: 24, gap: 16 },
  sectionLabel: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 2 },
  pinRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  pinDot: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: "rgba(180,140,255,0.3)", backgroundColor: "rgba(180,140,255,0.1)", alignItems: "center", justifyContent: "center" },
  pinDigit: { fontFamily: "Georgia", fontSize: 22, color: "rgba(180,140,255,0.9)" },
  emptyText: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.25)" },
  hint: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.2)", lineHeight: 18, marginTop: 8 },
});
