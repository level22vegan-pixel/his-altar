import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
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
  const scaleX = useSharedValue(0.5);

  useEffect(() => {
    const loop = () => {
      translateY.value = 0;
      opacity.value = 0;
      translateX.value = 0;
      scaleX.value = 0.5;
      opacity.value = withDelay(delay, withSequence(
        withTiming(0.5, { duration: duration * 0.25 }),
        withTiming(0.28, { duration: duration * 0.45 }),
        withTiming(0, { duration: duration * 0.3 }),
      ));
      translateY.value = withDelay(delay, withTiming(-260, { duration, easing: Easing.out(Easing.quad) }));
      translateX.value = withDelay(delay, withSequence(
        withTiming(amplitude, { duration: duration * 0.3, easing: Easing.inOut(Easing.sin) }),
        withTiming(-amplitude * 0.6, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
        withTiming(amplitude * 0.3, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
      ));
      scaleX.value = withDelay(delay, withTiming(2.2, { duration, easing: Easing.out(Easing.quad) }));
    };
    loop();
    const id = setInterval(loop, duration + delay + 300);
    return () => clearInterval(id);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x + translateX.value },
      { translateY: translateY.value },
      { scaleX: scaleX.value },
    ],
  }));

  return <Animated.View style={[styles.wisp, style]} />;
}

function StonePile() {
  return (
    <View style={styles.pileWrap}>
      {/* Bottom row — widest stones */}
      <View style={styles.row}>
        <View style={[styles.stone, { width: 38, height: 16, borderRadius: 7, backgroundColor: "#2e2e2e", marginTop: 2 }]} />
        <View style={[styles.stone, { width: 30, height: 18, borderRadius: 8, backgroundColor: "#5a1824", marginTop: 0 }]} />
        <View style={[styles.stone, { width: 34, height: 15, borderRadius: 6, backgroundColor: "#242424", marginTop: 3 }]} />
        <View style={[styles.stone, { width: 26, height: 17, borderRadius: 7, backgroundColor: "#4a1220", marginTop: 1 }]} />
      </View>

      {/* Middle row */}
      <View style={[styles.row, { marginTop: -4 }]}>
        <View style={[styles.stone, { width: 28, height: 14, borderRadius: 6, backgroundColor: "#4d1522", marginTop: 0 }]} />
        <View style={[styles.stone, { width: 36, height: 16, borderRadius: 7, backgroundColor: "#303030", marginTop: -1 }]} />
        <View style={[styles.stone, { width: 24, height: 13, borderRadius: 6, backgroundColor: "#5c1928", marginTop: 2 }]} />
      </View>

      {/* Top row — narrow peak */}
      <View style={[styles.row, { marginTop: -4 }]}>
        <View style={[styles.stone, { width: 20, height: 12, borderRadius: 5, backgroundColor: "#3a3a3a", marginTop: 1 }]} />
        <View style={[styles.stone, { width: 24, height: 13, borderRadius: 6, backgroundColor: "#4a1220", marginTop: 0 }]} />
        <View style={[styles.stone, { width: 16, height: 11, borderRadius: 5, backgroundColor: "#282828", marginTop: 2 }]} />
      </View>

      {/* Cap stone */}
      <View style={[styles.row, { marginTop: -4 }]}>
        <View style={[styles.stone, { width: 18, height: 10, borderRadius: 5, backgroundColor: "#551626", marginTop: 0 }]} />
      </View>

      {/* Ember glow under smoke */}
      <View style={styles.ember} />
    </View>
  );
}

export default function AltarSplash({ onDone }: Props) {
  const screenOpacity = useSharedValue(0);
  const pileScale = useSharedValue(0.92);
  const exitOpacity = useSharedValue(1);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 800 });
    pileScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) });
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 900 }));

    const timer = setTimeout(() => {
      exitOpacity.value = withTiming(0, { duration: 700 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value * exitOpacity.value,
  }));
  const pileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pileScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, wrapStyle]}>
      {/* Stone pile altar */}
      <Animated.View style={pileStyle}>
        <StonePile />
      </Animated.View>

      {/* Smoke wisps rising from the pile */}
      <Animated.View style={styles.smokeLayer}>
        <SmokeWisp x={0}   delay={0}    duration={2400} amplitude={14} />
        <SmokeWisp x={-14} delay={550}  duration={2800} amplitude={-18} />
        <SmokeWisp x={14}  delay={950}  duration={2100} amplitude={11} />
        <SmokeWisp x={-6}  delay={1450} duration={2600} amplitude={-9} />
        <SmokeWisp x={8}   delay={320}  duration={2900} amplitude={15} />
      </Animated.View>

      {/* Title */}
      <Animated.Text style={[styles.title, titleStyle]}>His Altar</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#0c0a1a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  pileWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  stone: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  ember: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(180, 60, 20, 0.55)",
    alignSelf: "center",
    marginTop: 1,
    shadowColor: "#cc4411",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  smokeLayer: {
    position: "absolute",
    bottom: "50%",
    marginBottom: -10,
    left: 0,
    right: 0,
    height: 200,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  wisp: {
    position: "absolute",
    bottom: 0,
    width: 16,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(230,215,200,0.35)",
  },
  title: {
    position: "absolute",
    bottom: height * 0.1,
    fontFamily: "Georgia",
    fontSize: 30,
    color: "#fff",
    letterSpacing: 3,
    textShadowColor: "rgba(200,150,40,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
});
