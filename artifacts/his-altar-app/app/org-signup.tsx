import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";
import { GoldButton } from "@/components/GoldButton";
import { DarkInput } from "@/components/DarkInput";

export default function OrgSignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signupOrg } = useAppContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!orgName.trim() || !contactName.trim() || !email.trim() || !password) {
      setError("Please fill in all fields."); return;
    }
    setLoading(true); setError("");
    try {
      await signupOrg(orgName.trim(), contactName.trim(), email.trim(), password);
      router.replace("/team");
    } catch (e: any) {
      setError(e.message ?? "Signup failed");
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: topPad + 20 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>REGISTER CHURCH</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Start your ministry portal</Text>
        <View style={styles.form}>
          <DarkInput label="Church / Organization Name" value={orgName} onChangeText={setOrgName} autoCapitalize="words" />
          <DarkInput label="Your Name" value={contactName} onChangeText={setContactName} autoCapitalize="words" />
          <DarkInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <DarkInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          <GoldButton label="Create Account" onPress={handleSignup} loading={loading} />
          <Pressable onPress={() => router.back()} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 28, paddingBottom: 40 },
  back: { alignSelf: "flex-start", padding: 8, marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Georgia", letterSpacing: 5, marginBottom: 8 },
  sub: { fontSize: 13, fontFamily: "Georgia", letterSpacing: 1, marginBottom: 40 },
  form: { gap: 4 },
  error: { fontSize: 12, marginBottom: 12, fontFamily: "Georgia" },
  link: { alignItems: "center", marginTop: 20 },
  linkText: { fontSize: 14, fontFamily: "Georgia" },
});
