import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const BIOMETRIC_KEY = "callerBiometricBinding";

interface Caller { id: number; name: string; campus: string; }
interface BiometricBinding { callerId: number; callerName: string; campus: string; }

export default function CallerLoginScreen() {
  const insets = useSafeAreaInsets();
  const { callerSession, loginCaller, logoutCaller } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricBinding, setBiometricBinding] = useState<BiometricBinding | null>(null);

  // Face ID setup modal (shown after first successful code login)
  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [pendingCaller, setPendingCaller] = useState<BiometricBinding | null>(null);

  // Name picker after biometric success (legacy fallback — no binding exists yet)
  const [showNamePicker, setShowNamePicker] = useState(false);
  const [callers, setCallers] = useState<Caller[]>([]);

  useEffect(() => {
    (async () => {
      const has = await LocalAuthentication.hasHardwareAsync();
      if (has) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(enrolled);
      }
      const bindingStr = await AsyncStorage.getItem(BIOMETRIC_KEY);
      if (bindingStr) {
        try { setBiometricBinding(JSON.parse(bindingStr)); } catch {}
      }
    })();
  }, []);

  async function fetchCallers() {
    try {
      const res = await fetch(`${BASE_URL}/api/pxp/callers`);
      if (res.ok) {
        const data = await res.json();
        setCallers(data.callers ?? []);
      }
    } catch {}
  }

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/pxp/callers/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const caller: BiometricBinding = {
          callerId: data.caller.id,
          callerName: data.caller.name,
          campus: data.caller.campus ?? "",
        };
        // Offer Face ID setup if available and no binding yet
        if (biometricAvailable && !biometricBinding) {
          setPendingCaller(caller);
          setShowFaceSetup(true);
          setLoading(false);
          return;
        }
        loginCaller(caller.callerId, caller.callerName, caller.campus);
        router.replace("/admin/pxp/logs" as any);
        return;
      }
      setError("Invalid code. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCode("");
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptFaceSetup() {
    if (!pendingCaller) return;
    await AsyncStorage.setItem(BIOMETRIC_KEY, JSON.stringify(pendingCaller));
    setBiometricBinding(pendingCaller);
    setShowFaceSetup(false);
    loginCaller(pendingCaller.callerId, pendingCaller.callerName, pendingCaller.campus);
    router.replace("/admin/pxp/logs" as any);
  }

  async function skipFaceSetup() {
    if (!pendingCaller) return;
    setShowFaceSetup(false);
    loginCaller(pendingCaller.callerId, pendingCaller.callerName, pendingCaller.campus);
    router.replace("/admin/pxp/logs" as any);
  }

  async function tryFaceId() {
    setError("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: biometricBinding
          ? `Sign in as ${biometricBinding.callerName}`
          : "Authenticate as Caller",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (biometricBinding) {
          // Auto-login with stored binding
          loginCaller(biometricBinding.callerId, biometricBinding.callerName, biometricBinding.campus);
          router.replace("/admin/pxp/logs" as any);
        } else {
          // No binding — show name picker
          await fetchCallers();
          setShowNamePicker(true);
        }
      } else {
        setError("Biometric not confirmed.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError("Face ID not available.");
    }
  }

  async function clearBiometricBinding() {
    await AsyncStorage.removeItem(BIOMETRIC_KEY);
    setBiometricBinding(null);
  }

  function selectCaller(c: Caller) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loginCaller(c.id, c.name, c.campus ?? "");
    router.replace("/admin/pxp" as any);
  }

  async function switchUser() {
    await logoutCaller();
    setCode("");
    setError("");
  }

  // ── Already logged in as someone ──
  if (callerSession) {
    return (
      <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
        <View style={[styles.root, { paddingTop: topPad }]}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <View style={styles.center}>
            <View style={styles.signedInAvatar}>
              <Text style={styles.signedInInitial}>
                {callerSession.callerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.signedInLabel}>SIGNED IN AS</Text>
            <Text style={styles.signedInName}>{callerSession.callerName}</Text>
            {callerSession.campus ? (
              <Text style={styles.signedInCampus}>{callerSession.campus}</Text>
            ) : null}

            <Pressable
              onPress={() => router.replace("/admin/pxp/logs" as any)}
              style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.continueBtnText}>CONTINUE</Text>
            </Pressable>

            <Pressable
              onPress={switchUser}
              style={({ pressed }) => [styles.switchBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.switchBtnText}>Switch User</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ── Name picker (biometric fallback — no stored binding) ──
  if (showNamePicker) {
    return (
      <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
        <View style={[styles.root, { paddingTop: topPad }]}>
          <Pressable onPress={() => setShowNamePicker(false)} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>SELECT YOUR NAME</Text>
          <ScrollView style={{ width: "100%", flex: 1 }} contentContainerStyle={{ gap: 8, paddingTop: 24, paddingBottom: 40 }}>
            {callers.length === 0 ? (
              <Text style={styles.hint}>No callers found. Ask admin to add you.</Text>
            ) : null}
            {callers.map((c) => (
              <Pressable key={c.id} onPress={() => selectCaller(c)}
                style={({ pressed }) => [styles.callerRow, { opacity: pressed ? 0.75 : 1 }]}>
                <View style={styles.callerAvatar}>
                  <Text style={styles.callerInitial}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.callerName}>{c.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    );
  }

  // ── Main sign-in screen ──
  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={[styles.root, { paddingTop: topPad }]}>

        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
        </Pressable>

        {/* Centered content */}
        <View style={styles.center}>
          <Text style={styles.title}>CALLER ACCESS</Text>

          {/* If biometric binding exists — show quick sign-in card */}
          {biometricAvailable && biometricBinding && (
            <View style={styles.bindingCard}>
              <View style={styles.bindingLeft}>
                <View style={styles.bindingAvatar}>
                  <Text style={styles.bindingInitial}>
                    {biometricBinding.callerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.bindingName}>{biometricBinding.callerName}</Text>
                  {biometricBinding.campus ? (
                    <Text style={styles.bindingCampus}>{biometricBinding.campus}</Text>
                  ) : null}
                </View>
              </View>
              <Pressable onPress={tryFaceId} style={({ pressed }) => [styles.faceQuickBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name="scan-outline" size={22} color="#a78bfa" />
              </Pressable>
            </View>
          )}

          {/* Code input + Face ID row */}
          <View style={styles.inputRow}>
            <Pressable style={styles.inputWrap} onPress={() => inputRef.current?.focus()}>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(v) => { setCode(v); setError(""); }}
                onSubmitEditing={submit}
                placeholder={biometricBinding ? "Different code?" : "Enter code"}
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="number-pad"
                secureTextEntry
                returnKeyType="go"
                style={styles.input}
                autoFocus={!biometricBinding}
              />
            </Pressable>

            {biometricAvailable && !biometricBinding && (
              <Pressable onPress={tryFaceId} style={({ pressed }) => [styles.faceBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <LinearGradient
                  colors={["rgba(124,58,237,0.3)", "rgba(124,58,237,0.15)"]}
                  style={styles.faceBtnInner}
                >
                  <Ionicons name="scan-outline" size={26} color="#a78bfa" />
                </LinearGradient>
              </Pressable>
            )}
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Sign In button */}
          <Pressable
            onPress={submit}
            disabled={loading || !code.trim()}
            style={({ pressed }) => [styles.signInBtn, { opacity: pressed || loading || !code.trim() ? 0.5 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.signInText}>SIGN IN</Text>}
          </Pressable>

          {/* Clear biometric binding if one exists */}
          {biometricBinding && (
            <Pressable onPress={clearBiometricBinding} style={{ marginTop: 20 }}>
              <Text style={styles.clearBioText}>Remove saved Face ID for {biometricBinding.callerName}</Text>
            </Pressable>
          )}
        </View>

        {/* Face ID setup modal */}
        <Modal visible={showFaceSetup} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Ionicons name="scan-outline" size={40} color="#a78bfa" style={{ marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Set up Face ID?</Text>
              <Text style={styles.modalBody}>
                Sign in as{" "}
                <Text style={{ color: "#a78bfa" }}>{pendingCaller?.callerName}</Text>
                {" "}instantly next time using Face ID or Touch ID.
              </Text>
              <Pressable
                onPress={acceptFaceSetup}
                style={({ pressed }) => [styles.modalAccept, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.modalAcceptText}>Set Up Face ID</Text>
              </Pressable>
              <Pressable onPress={skipFaceSetup} style={{ marginTop: 12 }}>
                <Text style={styles.modalSkipText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", paddingHorizontal: 32 },
  back: { alignSelf: "flex-start", padding: 8 },

  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    width: "100%", gap: 0, marginTop: -60,
  },
  title: {
    fontSize: 20, fontFamily: "Georgia", letterSpacing: 6, color: "#fff",
    marginBottom: 40,
    textShadowColor: "rgba(167,139,250,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  // Already signed in
  signedInAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(124,58,237,0.3)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(124,58,237,0.5)",
    marginBottom: 16,
  },
  signedInInitial: { fontFamily: "Georgia", fontSize: 28, color: "#a78bfa" },
  signedInLabel: { fontFamily: "Georgia", fontSize: 9, letterSpacing: 4, color: "rgba(255,255,255,0.3)", marginBottom: 8 },
  signedInName: { fontFamily: "Georgia", fontSize: 24, color: "#fff", letterSpacing: 1 },
  signedInCampus: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, marginBottom: 32 },
  continueBtn: {
    width: "100%", backgroundColor: "#7c3aed",
    borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 12,
  },
  continueBtnText: { fontFamily: "Georgia", fontSize: 13, color: "#fff", letterSpacing: 4 },
  switchBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  switchBtnText: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: 1 },

  // Biometric binding quick-sign-in card
  bindingCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", padding: 14, borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.35)",
    marginBottom: 20,
  },
  bindingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  bindingAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  bindingInitial: { fontFamily: "Georgia", fontSize: 16, color: "#a78bfa" },
  bindingName: { fontFamily: "Georgia", fontSize: 15, color: "#fff" },
  bindingCampus: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  faceQuickBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(124,58,237,0.2)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.4)",
  },

  // Input row
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%", marginBottom: 16 },
  inputWrap: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(124,58,237,0.4)",
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  input: {
    fontFamily: "Georgia", fontSize: 18, color: "#fff",
    paddingHorizontal: 18, paddingVertical: 16, letterSpacing: 4,
  },
  faceBtn: { borderRadius: 14 },
  faceBtnInner: {
    width: 58, height: 58, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.35)",
  },

  error: {
    fontFamily: "Georgia", fontSize: 12, color: "#f87171",
    textAlign: "center", marginBottom: 12,
  },

  signInBtn: {
    marginTop: 8, width: "100%",
    backgroundColor: "#7c3aed", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  signInText: { fontFamily: "Georgia", fontSize: 13, color: "#fff", letterSpacing: 4 },

  clearBioText: {
    fontFamily: "Georgia", fontSize: 11,
    color: "rgba(255,255,255,0.25)", textDecorationLine: "underline",
  },

  // Name picker
  hint: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 20 },
  callerRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  callerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  callerInitial: { fontFamily: "Georgia", fontSize: 16, color: "#a78bfa" },
  callerName: { flex: 1, fontFamily: "Georgia", fontSize: 15, color: "#fff" },

  // Face ID setup modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center", padding: 32,
  },
  modalCard: {
    backgroundColor: "#12101e", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
    padding: 28, width: "100%", alignItems: "center",
  },
  modalTitle: { fontFamily: "Georgia", fontSize: 18, color: "#fff", letterSpacing: 2, marginBottom: 12 },
  modalBody: {
    fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.55)",
    textAlign: "center", lineHeight: 22, marginBottom: 24,
  },
  modalAccept: {
    width: "100%", backgroundColor: "#7c3aed",
    borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  modalAcceptText: { fontFamily: "Georgia", fontSize: 13, color: "#fff", letterSpacing: 3 },
  modalSkipText: { fontFamily: "Georgia", fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 1 },
});
