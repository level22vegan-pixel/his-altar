import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function DarkInput({ label, error, style, ...props }: Props) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.border,
            color: colors.foreground,
            borderRadius: colors.radius,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", marginBottom: 14 },
  label: { fontSize: 11, letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase", fontFamily: "Georgia" },
  input: { padding: 14, fontSize: 15, borderWidth: 1, fontFamily: "Georgia" },
  error: { fontSize: 11, marginTop: 4 },
});
