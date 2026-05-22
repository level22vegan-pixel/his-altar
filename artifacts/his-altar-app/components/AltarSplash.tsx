import React, { useEffect } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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
        withTiming(0.45, { duration: duration * 0.25 }),
        withTiming(0.22, { duration: duration * 0.45 }),
        withTiming(0, { duration: duration * 0.3 }),
      ));
      translateY.value = withDelay(delay, withTiming(-300, { duration, easing: Easing.out(Easing.quad) }));
      translateX.value = withDelay(delay, withSequence(
        withTiming(amplitude, { duration: duration * 0.3, easing: Easing.inOut(Easing.sin) }),
        withTiming(-amplitude * 0.6, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
        withTiming(amplitude * 0.3, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
      ));
      scaleX.value = withDelay(delay, withTiming(2.8, { duration, easing: Easing.out(Easing.quad) }));
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

export default function AltarSplash({ onDone }: Props) {
  const screenOpacity = useSharedValue(0);
  const exitOpacity = useSharedValue(1);
  const textScale = useSharedValue(0.88);
  const textOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0.7);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 600 });
    textOpacity.value = withDelay(200, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }));
    textScale.value = withDelay(200, withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.2)) }));
    glowPulse.value = withDelay(800, withSequence(
      withTiming(1, { duration: 800 }),
      withTiming(0.7, { duration: 700 }),
      withTiming(1, { duration: 700 }),
      withTiming(0.82, { duration: 500 }),
    ));

    const timer = setTimeout(() => {
      exitOpacity.value = withTiming(0, { duration: 700 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value * exitOpacity.value,
  }));

  const textWrapStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>

      {/* Ambient deep blue background glow */}
      <Animated.View style={[styles.bgGlow, glowStyle]} />

      {/* Text block */}
      <Animated.View style={[styles.textWrap, textWrapStyle]}>
        {/* Outer red-ember glow layer (blurred halo) */}
        <Animated.Text style={[styles.textHaloRed, glowStyle]}>
          HIS ALTAR
        </Animated.Text>
        {/* Mid blue glow */}
        <Animated.Text style={[styles.textHaloBlue, glowStyle]}>
          HIS ALTAR
        </Animated.Text>
        {/* Crisp foreground text */}
        <Animated.Text style={styles.textMain}>
          HIS ALTAR
        </Animated.Text>
      </Animated.View>

      {/* Smoke wisps rising from behind the text */}
      <Animated.View style={styles.smokeLayer}>
        <SmokeWisp x={0}   delay={0}    duration={2400} amplitude={14} />
        <SmokeWisp x={-18} delay={550}  duration={2800} amplitude={-20} />
        <SmokeWisp x={18}  delay={950}  duration={2100} amplitude={12} />
        <SmokeWisp x={-8}  delay={1450} duration={2600} amplitude={-10} />
        <SmokeWisp x={10}  delay={320}  duration={2900} amplitude={16} />
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#03050f",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  bgGlow: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "rgba(10, 40, 130, 0.22)",
    shadowColor: "#0a4fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 120,
  },
  textWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  textHaloRed: {
    position: "absolute",
    fontFamily: "Georgia",
    fontSize: 46,
    letterSpacing: 10,
    color: "transparent",
    textShadowColor: "rgba(220, 60, 10, 0.75)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 38,
  },
  textHaloBlue: {
    position: "absolute",
    fontFamily: "Georgia",
    fontSize: 46,
    letterSpacing: 10,
    color: "transparent",
    textShadowColor: "rgba(30, 100, 255, 0.9)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  textMain: {
    fontFamily: "Georgia",
    fontSize: 46,
    letterSpacing: 10,
    color: "rgba(200, 225, 255, 0.95)",
    textShadowColor: "rgba(60, 140, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  smokeLayer: {
    position: "absolute",
    bottom: "46%",
    left: 0,
    right: 0,
    height: 200,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  wisp: {
    position: "absolute",
    bottom: 0,
    width: 14,
    height: 55,
    borderRadius: 10,
    backgroundColor: "rgba(180, 200, 255, 0.18)",
  },
});
