import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function GoldButton({ label, onPress, loading, disabled, variant = "primary", size = "md" }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bg =
    variant === "primary" ? colors.primary :
    variant === "secondary" ? colors.secondary :
    variant === "danger" ? colors.destructive :
    "transparent";

  const textColor =
    variant === "primary" ? colors.primaryForeground :
    variant === "secondary" ? colors.secondaryForeground :
    variant === "danger" ? colors.destructiveForeground :
    colors.primary;

  const borderColor =
    variant === "ghost" ? colors.border : "transparent";

  const paddingV = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSize = size === "sm" ? 11 : size === "lg" ? 15 : 13;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "ghost" ? 1 : 0,
          paddingVertical: paddingV,
          opacity: pressed ? 0.75 : disabled || loading ? 0.5 : 1,
          borderRadius: colors.radius,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize, fontFamily: "Georgia" }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center", width: "100%" },
  label: { fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
});
