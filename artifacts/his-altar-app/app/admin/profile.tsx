import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const LOCAL_KEY = "adminProfileLocal";

interface RemoteProfile {
  name: string;
  email: string;
  contactName: string | null;
  createdAt: string;
}

interface LocalProfile {
  title: string;
  phone: string;
  city: string;
}

interface Draft {
  contactName: string;
  title: string;
  email: string;
  phone: string;
  orgName: string;
  city: string;
}

function Field({
  label,
  value,
  editing,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  last,
  readOnly,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "sentences";
  last?: boolean;
  readOnly?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.fieldRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing && !readOnly ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor="rgba(255,255,255,0.2)"
          style={styles.fieldInput}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "words"}
          autoCorrect={false}
        />
      ) : (
        <Text style={[styles.fieldValue, !value && { color: "rgba(255,255,255,0.2)", fontStyle: "italic" }]}>
          {value || "—"}
        </Text>
      )}
    </View>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={14} color="rgba(180,140,255,0.6)" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { orgSession } = useAppContext();

  const [remote, setRemote] = useState<RemoteProfile | null>(null);
  const [local, setLocal] = useState<LocalProfile>({ title: "", phone: "", city: "" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({ contactName: "", title: "", email: "", phone: "", orgName: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const token = orgSession?.token ?? null;

  const loadProfile = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [res, localStr] = await Promise.all([
        fetch(`${BASE}/api/orgs/me`, { headers: { Authorization: `Bearer ${token}` } }),
        AsyncStorage.getItem(LOCAL_KEY),
      ]);
      if (res.ok) {
        const data: RemoteProfile = await res.json();
        setRemote(data);
      }
      if (localStr) {
        setLocal(JSON.parse(localStr));
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  function startEdit() {
    setDraft({
      contactName: remote?.contactName ?? "",
      title: local.title,
      email: remote?.email ?? "",
      phone: local.phone,
      orgName: remote?.name ?? orgSession?.orgName ?? "",
      city: local.city,
    });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveProfile() {
    if (!token) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/orgs/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: draft.orgName,
          email: draft.email,
          contactName: draft.contactName,
        }),
      });
      const newLocal: LocalProfile = { title: draft.title, phone: draft.phone, city: draft.city };
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(newLocal));
      setLocal(newLocal);
      await loadProfile();
      setEditing(false);
    } catch {
      Alert.alert("Error", "Could not save profile. Please try again.");
    }
    setSaving(false);
  }

  async function changePassword() {
    if (!newPw || !confirmPw || !currentPw) {
      Alert.alert("Missing fields", "Please fill in all password fields.");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }
    if (newPw.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch(`${BASE}/api/orgs/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.message ?? "Could not change password.");
      } else {
        Alert.alert("Done", "Password updated successfully.");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
        setShowPwForm(false);
      }
    } catch {
      Alert.alert("Error", "Could not change password. Please try again.");
    }
    setSavingPw(false);
  }

  const memberSince = remote?.createdAt
    ? new Date(remote.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  const avatarLetter = (remote?.name ?? orgSession?.orgName ?? "?")[0].toUpperCase();

  const d = (k: keyof Draft) => draft[k];
  const set = (k: keyof Draft) => (v: string) => setDraft(prev => ({ ...prev, [k]: v }));

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.headerTitle}>PROFILE</Text>
          {editing ? (
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Pressable onPress={cancelEdit} hitSlop={10}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveProfile} disabled={saving} style={styles.saveBtn}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startEdit} hitSlop={10} style={styles.editBtn}>
              <Ionicons name="pencil-outline" size={16} color="rgba(180,140,255,0.8)" />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="rgba(180,140,255,0.6)" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
              <Text style={styles.heroName}>{remote?.name ?? orgSession?.orgName ?? "Church Admin"}</Text>
              <Text style={styles.heroSub}>
                {local.title ? local.title.toUpperCase() : "CHURCH ADMIN"}
              </Text>
            </View>

            {/* Identity */}
            <SectionCard title="Identity" icon="person-outline">
              <Field label="Contact Name" value={editing ? d("contactName") : (remote?.contactName ?? "")} editing={editing} onChangeText={set("contactName")} placeholder="Your full name" />
              <Field label="Title / Role" value={editing ? d("title") : local.title} editing={editing} onChangeText={set("title")} placeholder="e.g. Ministry Director" />
              <Field label="Email" value={editing ? d("email") : (remote?.email ?? "")} editing={editing} onChangeText={set("email")} placeholder="admin@church.org" keyboardType="email-address" autoCapitalize="none" />
              <Field label="Phone" value={editing ? d("phone") : local.phone} editing={editing} onChangeText={set("phone")} placeholder="(000) 000-0000" keyboardType="phone-pad" last />
            </SectionCard>

            {/* Church / Organization */}
            <SectionCard title="Church / Organization" icon="business-outline">
              <Field label="Church Name" value={editing ? d("orgName") : (remote?.name ?? orgSession?.orgName ?? "")} editing={editing} onChangeText={set("orgName")} placeholder="Church name" />
              <Field label="City / Location" value={editing ? d("city") : local.city} editing={editing} onChangeText={set("city")} placeholder="City, State" last />
            </SectionCard>

            {/* Account */}
            <SectionCard title="Account" icon="shield-checkmark-outline">
              <View style={[styles.fieldRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" }]}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue}>{remote?.email ?? "—"}</Text>
              </View>
              <View style={[styles.fieldRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" }]}>
                <Text style={styles.fieldLabel}>Member Since</Text>
                <Text style={styles.fieldValue}>{memberSince}</Text>
              </View>
              <Pressable
                onPress={() => setShowPwForm(!showPwForm)}
                style={[styles.fieldRow, { justifyContent: "space-between" }]}
              >
                <Text style={styles.fieldLabel}>Change Password</Text>
                <Ionicons
                  name={showPwForm ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="rgba(180,140,255,0.5)"
                />
              </Pressable>
              {showPwForm && (
                <View style={styles.pwForm}>
                  <TextInput
                    value={currentPw}
                    onChangeText={setCurrentPw}
                    placeholder="Current password"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    secureTextEntry
                    style={styles.pwInput}
                  />
                  <TextInput
                    value={newPw}
                    onChangeText={setNewPw}
                    placeholder="New password"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    secureTextEntry
                    style={styles.pwInput}
                  />
                  <TextInput
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    placeholder="Confirm new password"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    secureTextEntry
                    style={styles.pwInput}
                  />
                  <Pressable
                    onPress={changePassword}
                    disabled={savingPw}
                    style={[styles.pwSaveBtn, savingPw && { opacity: 0.6 }]}
                  >
                    {savingPw
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.pwSaveBtnText}>Update Password</Text>}
                  </Pressable>
                </View>
              )}
            </SectionCard>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    fontFamily: "Georgia",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 4,
  },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  editBtnText: { fontFamily: "Georgia", fontSize: 13, color: "rgba(180,140,255,0.8)" },
  cancelBtn: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.4)" },
  saveBtn: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnText: { fontFamily: "Georgia", fontSize: 13, color: "#fff" },
  body: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  avatarWrap: { alignItems: "center", gap: 6, marginBottom: 4 },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(180,140,255,0.35)",
    backgroundColor: "rgba(180,140,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { fontFamily: "Georgia", fontSize: 30, color: "rgba(180,140,255,0.85)" },
  heroName: { fontFamily: "Georgia", fontSize: 18, color: "#fff", textAlign: "center" },
  heroSub: { fontFamily: "Georgia", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 3 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 4 },
  sectionTitle: { fontFamily: "Georgia", fontSize: 10, color: "rgba(180,140,255,0.55)", letterSpacing: 3, textTransform: "uppercase" },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  fieldLabel: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.38)", flexShrink: 0 },
  fieldValue: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.82)", textAlign: "right", flex: 1 },
  fieldInput: {
    fontFamily: "Georgia",
    fontSize: 13,
    color: "#fff",
    textAlign: "right",
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(180,140,255,0.4)",
    paddingBottom: 2,
  },
  pwForm: { paddingHorizontal: 18, paddingBottom: 16, gap: 10 },
  pwInput: {
    fontFamily: "Georgia",
    fontSize: 13,
    color: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pwSaveBtn: {
    backgroundColor: "rgba(124,58,237,0.7)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  pwSaveBtnText: { fontFamily: "Georgia", fontSize: 13, color: "#fff", letterSpacing: 1 },
});
