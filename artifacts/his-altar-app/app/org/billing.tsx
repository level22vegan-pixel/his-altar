import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Linking } from "react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const { orgSession } = useAppContext();

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>Billing & Subscription</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.planCard}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>ACTIVE</Text>
            </View>
            <Text style={styles.planName}>His Altar Pro</Text>
            <Text style={styles.planOrg}>{orgSession?.orgName ?? "Church Account"}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NEED HELP?</Text>
            <TouchableOpacity
              style={styles.linkRow}
              activeOpacity={0.7}
              onPress={() => Linking.openURL("mailto:support@hisaltar.com")}
            >
              <Ionicons name="mail-outline" size={18} color="rgba(180,140,255,0.7)" />
              <Text style={styles.linkText}>Contact billing support</Text>
              <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.2)" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },
  body: { padding: 20, gap: 20 },
  planCard: { borderRadius: 20, borderWidth: 1, borderColor: "rgba(180,140,255,0.25)", backgroundColor: "rgba(180,140,255,0.07)", padding: 24, alignItems: "center", gap: 6 },
  planBadge: { backgroundColor: "rgba(74,222,128,0.15)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(74,222,128,0.3)", paddingHorizontal: 12, paddingVertical: 3, marginBottom: 6 },
  planBadgeText: { fontFamily: "Georgia", fontSize: 10, color: "#4ade80", letterSpacing: 2 },
  planName: { fontFamily: "Georgia", fontSize: 22, color: "#fff" },
  planOrg: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: 1 },
  section: { gap: 4 },
  sectionLabel: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginBottom: 8 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", paddingHorizontal: 16, paddingVertical: 14 },
  linkText: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.75)" },
});
