import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Types ────────────────────────────────────────────────────────────────────

interface BillingStatus {
  trialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  subscription: {
    id: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
}

interface Price {
  price_id: string;
  unit_amount: number;
  currency: string;
  product_name: string;
  product_description: string | null;
}

// ── Auth-aware fetch helper ───────────────────────────────────────────────────

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE = DOMAIN ? `https://${DOMAIN}` : "";

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const str = await AsyncStorage.getItem("orgSession");
  const token: string | null = str ? (JSON.parse(str).token ?? null) : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? (body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  active:   { bg: "rgba(22,163,74,0.15)",  border: "rgba(74,222,128,0.3)",  text: "#4ade80" },
  trialing: { bg: "rgba(22,163,74,0.15)",  border: "rgba(74,222,128,0.3)",  text: "#4ade80" },
  past_due: { bg: "rgba(234,179,8,0.15)",  border: "rgba(234,179,8,0.3)",   text: "#fbbf24" },
  canceled: { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",   text: "#f87171" },
};
const STATUS_LABELS: Record<string, string> = {
  active: "Active", trialing: "Trial via Stripe", past_due: "Past Due",
  canceled: "Cancelled", incomplete: "Incomplete", unpaid: "Unpaid", paused: "Paused",
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", text: "rgba(255,255,255,0.45)" };
  return (
    <View style={[badge.wrap, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[badge.text, { color: c.text }]}>{STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontFamily: "Georgia", fontSize: 11, letterSpacing: 0.5 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useFocusEffect(useCallback(() => {
    async function load() {
      setLoading(true);
      try {
        const [statusData, pricesData] = await Promise.all([
          apiFetch<BillingStatus>("/api/stripe/billing-status").catch(() => null),
          apiFetch<{ data: Price[] }>("/api/stripe/prices").catch(() => ({ data: [] })),
        ]);
        if (statusData) setBilling(statusData);
        setPrices(pricesData.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []));

  async function handleSubscribe(priceId: string) {
    setCheckoutLoading(true);
    try {
      const data = await apiFetch<{ url?: string; error?: string }>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
      } else {
        Alert.alert("Error", data.error ?? "Could not start checkout.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Network error. Try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const data = await apiFetch<{ url?: string; error?: string }>("/api/stripe/portal", {
        method: "POST",
      });
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
      } else {
        Alert.alert("Error", data.error ?? "Could not open billing portal.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Network error. Try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await apiFetch<{ success?: boolean; days?: number; newTrialEndsAt?: string; message?: string }>("/api/orgs/apply-coupon", {
        method: "POST",
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      if (res.success) {
        const ends = res.newTrialEndsAt
          ? new Date(res.newTrialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : "";
        setCouponMsg({ ok: true, text: `✓ ${res.days} days added — trial now ends ${ends}` });
        setCouponCode("");
        const updated = await apiFetch<BillingStatus>("/api/stripe/billing-status").catch(() => null);
        if (updated) setBilling(updated);
      } else {
        setCouponMsg({ ok: false, text: res.message ?? "Invalid code." });
      }
    } catch (e: any) {
      setCouponMsg({ ok: false, text: e.message ?? "Network error. Try again." });
    } finally {
      setCouponLoading(false);
    }
  }

  const hasActiveSub = billing?.subscription?.status === "active" || billing?.subscription?.status === "trialing";

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>Billing & Subscription</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <ActivityIndicator color="rgba(180,140,255,0.7)" style={{ marginTop: 60 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.body}>

            {/* ── Trial Status ─────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>FREE TRIAL</Text>
              {billing?.trialActive ? (
                <View style={styles.row}>
                  <View style={{ gap: 4 }}>
                    <Text style={styles.bigNum}>
                      {billing.trialDaysLeft}{" "}
                      <Text style={styles.bigNumSub}>day{billing.trialDaysLeft !== 1 ? "s" : ""} remaining</Text>
                    </Text>
                    {billing.trialEndsAt && (
                      <Text style={styles.dimText}>
                        Ends {new Date(billing.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </Text>
                    )}
                  </View>
                  <StatusBadge status="active" />
                </View>
              ) : (
                <View style={styles.row}>
                  <Text style={styles.dimText}>Your free trial has ended.</Text>
                  <StatusBadge status="canceled" />
                </View>
              )}
            </View>

            {/* ── Coupon Code (only when no active sub) ───────────────── */}
            {!billing?.subscription && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>HAVE A CODE?</Text>
                <View style={styles.couponRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="e.g. FOREVER22"
                    placeholderTextColor="rgba(255,255,255,0.18)"
                    value={couponCode}
                    onChangeText={t => { setCouponCode(t.toUpperCase()); setCouponMsg(null); }}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={handleApplyCoupon}
                  />
                  <TouchableOpacity
                    style={[styles.couponBtn, (!couponCode.trim() || couponLoading) && { opacity: 0.4 }]}
                    onPress={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponLoading}
                    activeOpacity={0.7}
                  >
                    {couponLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.couponBtnText}>Apply</Text>}
                  </TouchableOpacity>
                </View>
                {couponMsg && (
                  <Text style={[styles.couponMsg, { color: couponMsg.ok ? "#4ade80" : "#f87171" }]}>
                    {couponMsg.text}
                  </Text>
                )}
              </View>
            )}

            {/* ── Subscription ────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>SUBSCRIPTION</Text>

              {billing?.subscription ? (
                <View style={{ gap: 14 }}>
                  <View style={styles.row}>
                    <View style={{ gap: 3 }}>
                      <Text style={styles.planName}>His Altar Monthly</Text>
                      <Text style={styles.planPrice}>$9.99 / month</Text>
                      {billing.subscription.current_period_end && (
                        <Text style={styles.dimText}>
                          {billing.subscription.cancel_at_period_end ? "Cancels on " : "Renews on "}
                          {new Date(billing.subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </Text>
                      )}
                    </View>
                    <StatusBadge status={billing.subscription.status} />
                  </View>

                  <TouchableOpacity
                    style={[styles.manageBtn, portalLoading && { opacity: 0.5 }]}
                    onPress={handlePortal}
                    disabled={portalLoading}
                    activeOpacity={0.7}
                  >
                    {portalLoading
                      ? <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                      : <Text style={styles.manageBtnText}>Manage Billing →</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <Text style={styles.dimText}>
                    {billing?.trialActive
                      ? "Subscribe now — your card won't be charged until your trial ends."
                      : "Subscribe to continue using the platform."}
                  </Text>

                  {(prices.length > 0 ? prices : [{ price_id: "", unit_amount: 999, currency: "usd", product_name: "His Altar Monthly", product_description: "Full access — Dbanc, PXP, Altar Reports, Roster, Check-in, and more." }]).map(p => (
                    <View key={p.price_id || "default"} style={styles.priceCard}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.planName}>{p.product_name}</Text>
                        <Text style={styles.planPrice}>
                          ${(p.unit_amount / 100).toFixed(2)} <Text style={styles.dimText}>/ month</Text>
                        </Text>
                        {billing?.trialActive && (
                          <Text style={styles.trialNote}>First {billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? "s" : ""} free</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.subscribeBtn, checkoutLoading && { opacity: 0.5 }]}
                        onPress={() => handleSubscribe(p.price_id)}
                        disabled={checkoutLoading}
                        activeOpacity={0.7}
                      >
                        {checkoutLoading
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.subscribeBtnText}>Subscribe</Text>}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <Text style={styles.footer}>
              Full access — Dbanc, PXP, Altar Reports, Roster, Check-in, and more.{"\n"}
              Cancel anytime. Questions? Email support@hisaltar.app
            </Text>

          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },

  body: { padding: 16, gap: 16, paddingBottom: 48 },

  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 18, gap: 14 },
  cardLabel: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase" },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  bigNum: { fontFamily: "Georgia", fontSize: 26, color: "#fff" },
  bigNumSub: { fontFamily: "Georgia", fontSize: 15, color: "rgba(255,255,255,0.4)", fontWeight: "400" },
  dimText: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.3)" },

  couponRow: { flexDirection: "row", gap: 10 },
  couponInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 11, fontFamily: "Georgia", fontSize: 14, color: "#fff", letterSpacing: 1 },
  couponBtn: { backgroundColor: "rgba(180,140,255,0.25)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(180,140,255,0.4)", paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  couponBtnText: { fontFamily: "Georgia", fontSize: 14, color: "#fff" },
  couponMsg: { fontFamily: "Georgia", fontSize: 12, marginTop: -4 },

  planName: { fontFamily: "Georgia", fontSize: 15, color: "#fff" },
  planPrice: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.45)" },
  trialNote: { fontFamily: "Georgia", fontSize: 11, color: "rgba(180,140,255,0.8)" },

  priceCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(180,140,255,0.06)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(180,140,255,0.2)", padding: 14 },

  subscribeBtn: { backgroundColor: "rgba(124,58,237,0.8)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  subscribeBtnText: { fontFamily: "Georgia", fontSize: 13, color: "#fff" },

  manageBtn: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 13, alignItems: "center" },
  manageBtnText: { fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.75)" },

  footer: { fontFamily: "Georgia", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 18, marginTop: 4 },
});
