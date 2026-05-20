import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert, FlatList, Pressable, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

const STORAGE_KEY = "pxp_callers_list";

export default function PxpCallersScreen() {
  const insets = useSafeAreaInsets();
  const [callers, setCallers] = useState<string[]>([]);
  const [newName, setNewName] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then(raw => {
        if (raw) setCallers(JSON.parse(raw));
      });
    }, []),
  );

  async function save(list: string[]) {
    setCallers(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  async function add() {
    const name = newName.trim();
    if (!name || callers.includes(name)) return;
    await save([...callers, name]);
    setNewName("");
  }

  function remove(name: string) {
    Alert.alert("Remove Caller", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => save(callers.filter(c => c !== name)) },
    ]);
  }

  return (
    <LinearGradient colors={["#0a0a0f", "#0f0a1a", "#0a0a0f"]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Text style={styles.title}>PXP Callers</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add caller name…"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={add}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={add} style={styles.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={callers}
          keyExtractor={item => item}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No callers yet. Add names above.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.callerRow}>
              <Ionicons name="person-outline" size={16} color="rgba(180,140,255,0.6)" />
              <Text style={styles.callerName}>{item}</Text>
              <TouchableOpacity onPress={() => remove(item)} style={styles.deleteBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color="rgba(255,80,80,0.6)" />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: "Georgia", fontSize: 15, color: "#fff", letterSpacing: 1 },
  inputRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 8 },
  input: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 11, fontFamily: "Georgia", fontSize: 14, color: "#fff" },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(180,140,255,0.2)", borderWidth: 1, borderColor: "rgba(180,140,255,0.3)", alignItems: "center", justifyContent: "center" },
  callerRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", paddingHorizontal: 14, paddingVertical: 14 },
  callerName: { flex: 1, fontFamily: "Georgia", fontSize: 14, color: "rgba(255,255,255,0.8)" },
  deleteBtn: { padding: 4 },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontFamily: "Georgia", fontSize: 13, color: "rgba(255,255,255,0.2)" },
});
