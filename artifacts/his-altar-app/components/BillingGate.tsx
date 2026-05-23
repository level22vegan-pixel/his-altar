import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, StyleSheet, Text, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";

interface BillingStatus {
  trialActive: boolean;
  trialDaysLeft: number;
  subscription: { status: string } | null;
  noOrg?: boolean;
}

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchBillingStatus(token: string): Promise<BillingStatus | null> {
  try {
    const res = await fetch(`${BASE}/api/stripe/billing-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function startCheckout(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/stripe/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

function isAccessAllowed(billing: BillingStatus): boolean {
  if (billing.noOrg) return true;
  if (billing.trialActive) return true;
  const s = billing.subscription?.status;
  return s === "active" || s === "trialing";
}

interface Props { children: React.ReactNode }

export default function BillingGate({ children }: Props) {
  const { orgSession, logout } = useAppContext();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"loading" | "allowed" | "blocked">("loading");
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!orgSession) {
      setStatus("allowed");
      return;
    }
    let cancelled = false;
    fetchBillingStatus(orgSession.token).then(b => {
      if (cancelled) return;
      if (!b) {
        // Network error — fail open so users aren't locked out
        setStatus("allowed");
        return;
      }
      setBilling(b);
      setStatus(isAccessAllowed(b) ? "allowed" : "blocked");
    });
    return () => { cancelled = true; };
  }, [orgSession]);

  if (status === "loading") {
    return (
      <View style={s.loader}>
        <ActivityIndicator color="rgba(180,140,255,0.7)" />
      </View>
    );
  }

  if (status === "blocked") {
    return (
      <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
        <View style={[s.wrap, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>

          <View style={s.iconWrap}>
            <Ionicons name="lock-closed" size={40} color="#7c3aed" />
          </View>

          <Text style={s.heading}>Subscription Required</Text>
          <Text style={s.sub}>
            Your free trial has ended.{"\n"}Subscribe to continue using His Altar.
          </Text>

          <View style={s.featureList}>
            {[
              "Altar intake & contact form",
              "PXP follow-up call system",
              "Check-in roster & reporting",
              "Push notifications for staff",
            ].map(f => (
              <View key={f} style={s.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <Pressable
            disabled={subscribing}
            onPress={async () => {
              if (!orgSession) return;
              setSubscribing(true);
              const url = await startCheckout(orgSession.token);
              setSubscribing(false);
              if (url) {
                await WebBrowser.openBrowserAsync(url);
                const updated = await fetchBillingStatus(orgSession.token);
                if (updated && isAccessAllowed(updated)) {
                  setBilling(updated);
                  setStatus("allowed");
                }
              } else {
                Alert.alert("Error", "Could not start checkout. Please try again.");
              }
            }}
            style={({ pressed }) => [s.btn, { opacity: pressed || subscribing ? 0.75 : 1 }]}
          >
            {subscribing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.btnText}>Subscribe — $9.99 / month</Text>}
          </Pressable>

          <Pressable
            onPress={() => router.push("/org/billing" as any)}
            style={s.secondaryBtn}
          >
            <Text style={s.secondaryText}>View billing details →</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await logout();
              router.replace("/");
            }}
            style={s.logoutBtn}
          >
            <Text style={s.logoutText}>Sign out</Text>
          </Pressable>

        </View>
      </LinearGradient>
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0c0a1a" },
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 20 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  heading: { fontFamily: "Georgia", fontSize: 24, color: "#fff", textAlign: "center", letterSpacing: 1 },
  sub: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 22 },
  featureList: {
    gap: 10, width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.7)" },
  btn: {
    backgroundColor: "#7c3aed", borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 32,
    alignItems: "center", width: "100%", minHeight: 50,
  },
  btnText: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 0.5 },
  secondaryBtn: { paddingVertical: 10 },
  secondaryText: { fontFamily: "Georgia", fontSize: 13, color: "rgba(180,140,255,0.7)" },
  logoutBtn: { paddingVertical: 8 },
  logoutText: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.25)" },
});
