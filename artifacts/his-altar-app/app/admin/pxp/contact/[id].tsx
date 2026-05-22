import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  useGetDbancContact,
  useListPxpCallLogs,
  useUpdateDbancContact,
} from "@workspace/api-client-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/context/AppContext";

function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

function phoneSegments(p: string): [string, string, string] | null {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return [d.slice(0, 3), d.slice(3, 6), d.slice(6)];
  if (d.length === 11 && d[0] === "1") return [d.slice(1, 4), d.slice(4, 7), d.slice(7)];
  return null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

type Section = "contact" | "flags" | "notes" | "history";

export default function ContactProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { callerSession } = useAppContext();
  const params = useLocalSearchParams<{ id: string }>();
  const contactId = parseInt(params.id ?? "0");

  const { data: contact, isLoading } = useGetDbancContact(contactId, {
    query: { enabled: !!contactId, queryKey: [`/api/dbanc/contacts/${contactId}`] },
  });
  const { data: logsData } = useListPxpCallLogs(contactId ? { contactId } : undefined);
  const updateContact = useUpdateDbancContact();

  const logs = logsData?.logs ?? [];

  const [crisisFlag, setCrisisFlag] = useState(false);
  const [doNotContact, setDoNotContact] = useState(false);
  const [servicesNotes, setServicesNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set());
  const autoAssigned = useRef(false);

  const toggleSection = useCallback((s: Section) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!contact) return;
    setCrisisFlag(contact.crisisFlag ?? false);
    setDoNotContact(contact.doNotContact ?? false);
    setServicesNotes(contact.servicesNotes ?? "");

    // auto-assign this caller to the contact
    if (callerSession && !autoAssigned.current) {
      autoAssigned.current = true;
      if (contact.assignedCallerId !== callerSession.callerId) {
        updateContact.mutate({
          id: contactId,
          data: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            serviceTime: contact.serviceTime ?? "",
            assignedCallerId: callerSession.callerId,
          },
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact]);

  async function handleSave(field: "flags" | "notes") {
    if (saving || !contactId || !contact) return;
    setSaving(true);
    setSaved(false);
    await updateContact.mutateAsync({
      id: contactId,
      data: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        serviceTime: contact.serviceTime ?? "",
        crisisFlag,
        doNotContact,
        servicesNotes,
      },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleStartCall() {
    if (!contact) return;
    router.push({
      pathname: "/admin/pxp/call" as any,
      params: {
        contactId,
        contactName: `${contact.firstName} ${contact.lastName}`,
      },
    });
  }

  if (isLoading || !contact) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`;
  const hue = (contactId * 47) % 360;

  const SectionBtn = ({
    id, icon, badge,
  }: { id: Section; icon: string; badge?: number | boolean }) => {
    const active = openSections.has(id);
    return (
      <Pressable
        onPress={() => toggleSection(id)}
        style={[
          styles.sectionBtn,
          {
            backgroundColor: active ? `hsl(${270} 45% 14%)` : colors.card,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
      >
        <Ionicons name={icon as any} size={26} color={active ? colors.primary : colors.mutedForeground} />
        {!!badge && (
          <View style={[styles.sectionBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.sectionBadgeText, { color: colors.primaryForeground }]}>
              {typeof badge === "number" ? badge : "!"}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const SaveBtn = ({ field }: { field: "flags" | "notes" }) => (
    <Pressable
      onPress={() => handleSave(field)}
      disabled={saving}
      style={[
        styles.saveBtn,
        {
          backgroundColor: saved ? "rgba(74,222,128,0.1)" : colors.muted,
          borderColor: saved ? "rgba(74,222,128,0.4)" : colors.border,
        },
      ]}
    >
      <Text style={[styles.saveBtnText, { color: saved ? "#4ade80" : colors.primary }]}>
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>CONTACT</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity */}
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: `hsl(${hue} 30% 18%)`, borderColor: colors.border }]}>
            <Text style={[styles.avatarText, { color: colors.foreground }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {contact.firstName} {contact.lastName}
            </Text>
            <Text style={[styles.subInfo, { color: colors.mutedForeground }]}>
              {formatPhone(contact.phone)}{contact.campus ? ` · ${contact.campus}` : ""}
            </Text>
            {contact.serviceTime && (
              <View style={[styles.serviceBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.serviceBadgeText, { color: colors.primary }]}>
                  🕐 {contact.serviceTime}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Flags alert */}
        {(crisisFlag || doNotContact) && (
          <View style={styles.flagAlerts}>
            {crisisFlag && (
              <View style={styles.crisisChip}>
                <Text style={styles.crisisText}>⚠ Crisis</Text>
              </View>
            )}
            {doNotContact && (
              <View style={styles.dncChip}>
                <Text style={styles.dncText}>✕ Do Not Contact</Text>
              </View>
            )}
          </View>
        )}

        {/* Section icon row */}
        <View style={styles.sectionRow}>
          <SectionBtn id="contact" icon="person-outline" />
          <SectionBtn id="flags" icon="flag-outline" badge={crisisFlag || doNotContact} />
          <SectionBtn id="notes" icon="chatbubble-outline" />
          <SectionBtn id="history" icon="time-outline" badge={logs.length || undefined} />
        </View>

        {/* Contact info */}
        {openSections.has("contact") && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoGrid}>
              {[
                ["Gender", contact.gender || "—"],
                ["Carrier", contact.carrier || "—"],
                ["Campus", contact.campus || "—"],
                ["Service", contact.serviceTime || "—"],
              ].map(([label, val]) => (
                <View key={label} style={[styles.infoCell, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.infoVal, { color: colors.foreground }]}>{val}</Text>
                </View>
              ))}
            </View>
            {contact.notes && (
              <View style={[styles.notesBox, { backgroundColor: colors.muted }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Prayer Notes</Text>
                <Text style={[styles.infoVal, { color: colors.foreground, lineHeight: 20 }]}>{contact.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Flags section */}
        {openSections.has("flags") && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Toggle
              label="Crisis Flag"
              desc="Mark contact as in crisis"
              value={crisisFlag}
              onToggle={() => setCrisisFlag((f) => !f)}
              activeColor="#ef4444"
              colors={colors}
            />
            <Toggle
              label="Do Not Contact"
              desc="Prevent callers from calling this contact"
              value={doNotContact}
              onToggle={() => setDoNotContact((f) => !f)}
              activeColor="#f59e0b"
              colors={colors}
            />
            <SaveBtn field="flags" />
          </View>
        )}

        {/* Services notes */}
        {openSections.has("notes") && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Notes on services offered, follow-up feedback, prayer outcomes…"
              placeholderTextColor={colors.mutedForeground}
              value={servicesNotes}
              onChangeText={setServicesNotes}
              multiline
            />
            <SaveBtn field="notes" />
          </View>
        )}

        {/* Call history */}
        {openSections.has("history") && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {logs.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No calls logged yet</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {logs.map((log) => (
                  <View key={log.id} style={[styles.logEntry, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <View style={styles.logHeader}>
                      <Text style={[styles.logCaller, { color: colors.primary }]}>{log.callerName}</Text>
                      <Text style={[styles.logDate, { color: colors.mutedForeground }]}>{formatDate(log.calledAt)}</Text>
                    </View>
                    {log.outcome && (
                      <Text style={[styles.logField, { color: colors.foreground }]}>
                        <Text style={{ color: colors.mutedForeground }}>Outcome: </Text>{log.outcome}
                      </Text>
                    )}
                    {log.servicesOffered && (
                      <Text style={[styles.logField, { color: colors.foreground }]}>
                        <Text style={{ color: colors.mutedForeground }}>Services: </Text>{log.servicesOffered}
                      </Text>
                    )}
                    {log.feedback && (
                      <Text style={[styles.logField, { color: colors.foreground }]}>
                        <Text style={{ color: colors.mutedForeground }}>Feedback: </Text>{log.feedback}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Call button */}
        <View style={{ marginTop: 8, gap: 0 }}>
          {doNotContact ? (
            <View style={[styles.dncBlock, { backgroundColor: colors.card, borderColor: "rgba(245,158,11,0.4)" }]}>
              <Text style={[styles.dncBlockText, { color: "#f59e0b" }]}>
                Do Not Contact is active — calls disabled
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleStartCall}
              style={({ pressed }) => [styles.callBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="call" size={20} color={colors.primaryForeground} />
              <Text style={[styles.callBtnText, { color: colors.primaryForeground }]}>
                Call {contact.firstName}
              </Text>
            </Pressable>
          )}

          {/* Big keypad phone display */}
          {contact.phone ? (() => {
            const segs = phoneSegments(contact.phone);
            return (
              <View style={[styles.keypadBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {segs ? (
                  <>
                    <Text style={[styles.keypadSeg, { color: colors.mutedForeground }]}>({segs[0]})</Text>
                    <Text style={[styles.keypadSeg, { color: colors.foreground }]}>{segs[1]}</Text>
                    <Text style={[styles.keypadSeg, { color: colors.foreground }]}>{segs[2]}</Text>
                  </>
                ) : (
                  <Text style={[styles.keypadSeg, { color: colors.foreground }]}>{contact.phone}</Text>
                )}
              </View>
            );
          })() : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Toggle({
  label, desc, value, onToggle, activeColor, colors,
}: {
  label: string; desc: string; value: boolean;
  onToggle: () => void; activeColor: string; colors: any;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.toggle,
        {
          backgroundColor: value ? `${activeColor}18` : colors.muted,
          borderColor: value ? `${activeColor}55` : colors.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: value ? activeColor : colors.foreground }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <View style={[styles.toggleTrack, { backgroundColor: value ? activeColor : colors.muted }]}>
        <View style={[styles.toggleThumb, { left: value ? 20 : 3 }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 16, fontFamily: "Georgia", letterSpacing: 4 },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarText: { fontFamily: "Georgia", fontSize: 20, fontWeight: "bold" },
  name: { fontFamily: "Georgia", fontSize: 20, letterSpacing: 0.5 },
  subInfo: { fontFamily: "Georgia", fontSize: 12, marginTop: 3 },
  serviceBadge: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  serviceBadgeText: { fontFamily: "Georgia", fontSize: 10, letterSpacing: 1 },
  flagAlerts: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  crisisChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.35)" },
  crisisText: { fontFamily: "Georgia", fontSize: 10, color: "#f87171", letterSpacing: 1, textTransform: "uppercase" },
  dncChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.35)" },
  dncText: { fontFamily: "Georgia", fontSize: 10, color: "#fbbf24", letterSpacing: 1, textTransform: "uppercase" },
  sectionRow: { flexDirection: "row", gap: 10 },
  sectionBtn: { flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 16, borderWidth: 2, position: "relative" },
  sectionBadge: { position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionBadgeText: { fontFamily: "Georgia", fontSize: 9 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoCell: { width: "47%", borderRadius: 8, padding: 10 },
  infoLabel: { fontFamily: "Georgia", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 },
  infoVal: { fontFamily: "Georgia", fontSize: 13 },
  notesBox: { borderRadius: 8, padding: 10 },
  toggle: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  toggleLabel: { fontFamily: "Georgia", fontSize: 14 },
  toggleDesc: { fontFamily: "Georgia", fontSize: 10, marginTop: 2 },
  toggleTrack: { width: 40, height: 22, borderRadius: 11, position: "relative" },
  toggleThumb: { position: "absolute", top: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },
  saveBtn: { padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  saveBtnText: { fontFamily: "Georgia", fontSize: 13, letterSpacing: 1 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 12, fontFamily: "Georgia", fontSize: 13, minHeight: 100, textAlignVertical: "top" },
  logEntry: { borderRadius: 10, padding: 12, borderWidth: 1, gap: 5 },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logCaller: { fontFamily: "Georgia", fontSize: 13, fontWeight: "bold" },
  logDate: { fontFamily: "Georgia", fontSize: 10 },
  logField: { fontFamily: "Georgia", fontSize: 12, lineHeight: 18 },
  emptyText: { fontFamily: "Georgia", fontSize: 13, textAlign: "center", padding: 12 },
  dncBlock: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  dncBlockText: { fontFamily: "Georgia", fontSize: 13, letterSpacing: 0.5 },
  callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 17, borderRadius: 14 },
  callBtnText: { fontFamily: "Georgia", fontSize: 15, letterSpacing: 2 },
  keypadBox: { alignItems: "center", justifyContent: "center", paddingVertical: 28, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, marginTop: 10, gap: 4 },
  keypadSeg: { fontFamily: "Georgia", fontSize: 52, letterSpacing: 8, lineHeight: 62, textAlign: "center" },
});
