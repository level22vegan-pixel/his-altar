import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

interface Props {
  onDone: () => void;
}

function SmokeWisp({ x, delay, duration, amplitude }: {
  x: number; delay: number; duration: number; amplitude: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scaleX = useSharedValue(0.4);

  useEffect(() => {
    const loop = () => {
      translateY.value = 0;
      opacity.value = 0;
      translateX.value = 0;
      scaleX.value = 0.4;
      opacity.value = withDelay(delay, withSequence(
        withTiming(0.55, { duration: duration * 0.3 }),
        withTiming(0.3, { duration: duration * 0.4 }),
        withTiming(0, { duration: duration * 0.3 }),
      ));
      translateY.value = withDelay(delay, withTiming(-220, { duration, easing: Easing.out(Easing.quad) }));
      translateX.value = withDelay(delay, withSequence(
        withTiming(amplitude, { duration: duration * 0.3, easing: Easing.inOut(Easing.sin) }),
        withTiming(-amplitude * 0.6, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
        withTiming(amplitude * 0.3, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
      ));
      scaleX.value = withDelay(delay, withTiming(1.8, { duration, easing: Easing.out(Easing.quad) }));
    };
    loop();
    const interval = setInterval(loop, duration + delay + 200);
    return () => clearInterval(interval);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x + translateX.value },
      { translateY: translateY.value },
      { scaleX: scaleX.value },
    ],
  }));

  return (
    <Animated.View style={[styles.wisp, style]} />
  );
}

function Ember({ x, y, delay }: { x: number; y: number; delay: number }) {
  const glow = useSharedValue(0.5);
  useEffect(() => {
    glow.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 600 + Math.random() * 400 }),
        withTiming(0.45, { duration: 700 + Math.random() * 400 }),
      ), -1, true,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View style={[styles.ember, { left: x, top: y }, style]} />
  );
}

export default function AltarSplash({ onDone }: Props) {
  const screenOpacity = useSharedValue(0);
  const contentY = useSharedValue(30);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 700 });
    contentY.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.quad) });
    const timer = setTimeout(() => {
      exitOpacity.value = withTiming(0, { duration: 600 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value * exitOpacity.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, wrapStyle]}>
      <LinearGradient
        colors={["#050508", "#0a0818", "#07050e"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient floor glow */}
      <View style={styles.floorGlow} />

      <Animated.View style={[styles.scene, contentStyle]}>

        {/* Smoke wisps — rise from top of altar */}
        <View style={styles.smokeContainer}>
          <SmokeWisp x={0}   delay={0}    duration={2200} amplitude={12} />
          <SmokeWisp x={-16} delay={500}  duration={2600} amplitude={-18} />
          <SmokeWisp x={16}  delay={900}  duration={2000} amplitude={10} />
          <SmokeWisp x={-6}  delay={1400} duration={2400} amplitude={-8} />
          <SmokeWisp x={8}   delay={300}  duration={2800} amplitude={14} />
        </View>

        {/* Altar body */}
        <View style={styles.altarWrap}>

          {/* Golden horns at corners */}
          <View style={[styles.horn, styles.hornTL]} />
          <View style={[styles.horn, styles.hornTR]} />

          {/* Ember bed on top */}
          <View style={styles.emberBed}>
            <View style={styles.emberGlow} />
            <Ember x={14}  y={4}  delay={0} />
            <Ember x={28}  y={6}  delay={200} />
            <Ember x={44}  y={3}  delay={400} />
            <Ember x={58}  y={7}  delay={150} />
            <Ember x={72}  y={4}  delay={350} />
            <Ember x={86}  y={5}  delay={600} />
            <Ember x={20}  y={12} delay={500} />
            <Ember x={36}  y={11} delay={100} />
            <Ember x={54}  y={13} delay={700} />
            <Ember x={68}  y={10} delay={250} />
            <Ember x={80}  y={12} delay={450} />
          </View>

          {/* Altar body */}
          <LinearGradient
            colors={["#1a1208", "#2a1e08", "#1a1208"]}
            style={styles.altarBody}
          >
            {/* Decorative centre panel */}
            <View style={styles.altarPanel}>
              <View style={styles.altarPanelInner} />
            </View>
          </LinearGradient>

          {/* Base moulding */}
          <LinearGradient
            colors={["#c8930a", "#f0b840", "#c8930a"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.baseMoulding}
          />

          {/* Base */}
          <LinearGradient
            colors={["#181008", "#251a08", "#181008"]}
            style={styles.altarBase}
          />

          {/* Foot moulding */}
          <LinearGradient
            colors={["#c8930a", "#f0b840", "#c8930a"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.footMoulding}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>His Altar</Text>
        <Text style={styles.sub}>A place of prayer</Text>
      </Animated.View>
    </Animated.View>
  );
}

const ALTAR_W = 160;

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", zIndex: 999 },
  floorGlow: {
    position: "absolute",
    bottom: height * 0.28,
    width: 300, height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(200,100,10,0.07)",
    alignSelf: "center",
  },
  scene: { alignItems: "center" },

  smokeContainer: {
    height: 230,
    width: ALTAR_W,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  wisp: {
    position: "absolute",
    bottom: 0,
    width: 18,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(220,200,180,0.45)",
  },

  altarWrap: { alignItems: "center", width: ALTAR_W + 24 },

  horn: {
    position: "absolute",
    top: -10,
    width: 10, height: 20,
    borderRadius: 5,
    backgroundColor: "#f0b840",
    shadowColor: "#f0b840",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  hornTL: { left: 14 },
  hornTR: { right: 14 },

  emberBed: {
    width: ALTAR_W,
    height: 22,
    backgroundColor: "#1a0800",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    overflow: "hidden",
  },
  emberGlow: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(255,80,10,0.18)",
  },
  ember: {
    position: "absolute",
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: "#ff6010",
    shadowColor: "#ff8020",
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },

  altarBody: {
    width: ALTAR_W,
    height: 90,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#7a5c10",
    alignItems: "center",
    justifyContent: "center",
  },
  altarPanel: {
    width: ALTAR_W * 0.55,
    height: 54,
    borderWidth: 1,
    borderColor: "rgba(200,147,10,0.3)",
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  altarPanelInner: {
    width: "70%", height: "60%",
    borderWidth: 1,
    borderColor: "rgba(200,147,10,0.15)",
    borderRadius: 1,
  },

  baseMoulding: {
    width: ALTAR_W + 16,
    height: 6,
    borderRadius: 1,
  },
  altarBase: {
    width: ALTAR_W + 16,
    height: 18,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#7a5c10",
  },
  footMoulding: {
    width: ALTAR_W + 28,
    height: 8,
    borderRadius: 2,
  },

  title: {
    marginTop: 36,
    fontFamily: "Georgia",
    fontSize: 30,
    color: "#fff",
    letterSpacing: 2,
    textShadowColor: "rgba(200,147,10,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  sub: {
    marginTop: 8,
    fontFamily: "Georgia",
    fontSize: 11,
    color: "rgba(200,147,10,0.55)",
    letterSpacing: 5,
    textTransform: "uppercase",
  },
});
