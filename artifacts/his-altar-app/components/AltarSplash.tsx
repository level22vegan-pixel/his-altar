import React, { useEffect } from "react";
import { Dimensions, StyleSheet } from "react-native";
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

// A single animated flame tongue
function FlameTongue({
  x,
  baseWidth,
  baseHeight,
  color,
  delay,
  duration,
  swayAmp,
}: {
  x: number;
  baseWidth: number;
  baseHeight: number;
  color: string;
  delay: number;
  duration: number;
  swayAmp: number;
}) {
  const scaleY = useSharedValue(0.3);
  const scaleX = useSharedValue(1);
  const opacity = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    const loop = () => {
      scaleY.value = 0.3;
      scaleX.value = 1;
      opacity.value = 0;
      sway.value = 0;

      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(0.9, { duration: duration * 0.15 }),
          withTiming(0.75, { duration: duration * 0.5 }),
          withTiming(0, { duration: duration * 0.35 }),
        ),
      );
      scaleY.value = withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
      );
      scaleX.value = withDelay(
        delay,
        withSequence(
          withTiming(0.7, { duration: duration * 0.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.1, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.85, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
        ),
      );
      sway.value = withDelay(
        delay,
        withSequence(
          withTiming(swayAmp, { duration: duration * 0.4, easing: Easing.inOut(Easing.sin) }),
          withTiming(-swayAmp * 0.7, { duration: duration * 0.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(swayAmp * 0.3, { duration: duration * 0.3, easing: Easing.inOut(Easing.sin) }),
        ),
      );
    };
    loop();
    const id = setInterval(loop, duration + delay + 100);
    return () => clearInterval(id);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x + sway.value },
      { scaleY: scaleY.value },
      { scaleX: scaleX.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 0,
          width: baseWidth,
          height: baseHeight,
          borderRadius: baseWidth / 2,
          borderTopLeftRadius: baseWidth * 0.45,
          borderTopRightRadius: baseWidth * 0.45,
          backgroundColor: color,
          marginLeft: -baseWidth / 2,
        },
        style,
      ]}
    />
  );
}

// Floating ember particle
function Ember({ x, delay, duration }: { x: number; delay: number; duration: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(x);

  useEffect(() => {
    const loop = () => {
      translateY.value = 0;
      opacity.value = 0;
      translateX.value = x;

      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(0.9, { duration: 200 }),
          withTiming(0.6, { duration: duration * 0.5 }),
          withTiming(0, { duration: duration * 0.5 }),
        ),
      );
      translateY.value = withDelay(
        delay,
        withTiming(-(180 + Math.random() * 120), { duration, easing: Easing.out(Easing.quad) }),
      );
      translateX.value = withDelay(
        delay,
        withSequence(
          withTiming(x + (Math.random() > 0.5 ? 12 : -12), { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(x + (Math.random() > 0.5 ? -8 : 8), { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
        ),
      );
    };
    loop();
    const id = setInterval(loop, duration + delay + 200);
    return () => clearInterval(id);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.ember, style]} />;
}

export default function AltarSplash({ onDone }: Props) {
  const screenOpacity = useSharedValue(0);
  const exitOpacity = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0.6);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 700 });
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 900 }));
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.65, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    const timer = setTimeout(() => {
      exitOpacity.value = withTiming(0, { duration: 700 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, 3400);
    return () => clearTimeout(timer);
  }, []);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value * exitOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowPulse.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>

      {/* Fire container — centered, small */}
      <Animated.View style={styles.fireWrap}>
        {/* Base glow on the ground */}
        <Animated.View style={[styles.baseGlow, glowStyle]} />

        {/* Flame layers — back to front, tallest first */}
        {/* Deep red back flames */}
        <FlameTongue x={-30} baseWidth={84} baseHeight={210} color="#8B0000" delay={0}   duration={1200} swayAmp={18} />
        <FlameTongue x={24}  baseWidth={72} baseHeight={180} color="#9B1010" delay={300} duration={1100} swayAmp={-15} />

        {/* Orange mid flames */}
        <FlameTongue x={-18} baseWidth={66} baseHeight={168} color="#CC4400" delay={100} duration={1000} swayAmp={-21} />
        <FlameTongue x={30}  baseWidth={60} baseHeight={150} color="#DD5500" delay={500} duration={950}  swayAmp={15} />
        <FlameTongue x={0}   baseWidth={78} baseHeight={192} color="#E06000" delay={200} duration={1100} swayAmp={12} />

        {/* Bright orange-yellow inner flames */}
        <FlameTongue x={-12} baseWidth={54} baseHeight={138} color="#FF7700" delay={50}  duration={900}  swayAmp={-12} />
        <FlameTongue x={18}  baseWidth={48} baseHeight={120} color="#FF8800" delay={400} duration={850}  swayAmp={18} />

        {/* Yellow core */}
        <FlameTongue x={0}   baseWidth={42} baseHeight={102} color="#FFAA00" delay={150} duration={800}  swayAmp={9} />
        <FlameTongue x={-9}  baseWidth={30} baseHeight={78}  color="#FFD000" delay={250} duration={700}  swayAmp={-9} />

        {/* Hot white tip */}
        <FlameTongue x={3}   baseWidth={24} baseHeight={54}  color="#FFF5CC" delay={300} duration={600}  swayAmp={6} />

        {/* Floating embers */}
        <Ember x={-42} delay={0}    duration={1400} />
        <Ember x={36}  delay={350}  duration={1200} />
        <Ember x={-12} delay={700}  duration={1500} />
        <Ember x={54}  delay={200}  duration={1300} />
        <Ember x={-60} delay={900}  duration={1100} />
        <Ember x={15}  delay={550}  duration={1600} />
      </Animated.View>

      {/* Title below the fire */}
      <Animated.Text style={[styles.title, titleStyle]}>His Altar</Animated.Text>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#080410",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  fireWrap: {
    width: 240,
    height: 270,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 32,
  },
  baseGlow: {
    position: "absolute",
    bottom: -30,
    width: 240,
    height: 90,
    borderRadius: 120,
    backgroundColor: "rgba(220, 80, 0, 0.45)",
    shadowColor: "#ff4400",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
  },
  ember: {
    position: "absolute",
    bottom: 30,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FF9900",
    shadowColor: "#FF6600",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  title: {
    fontFamily: "Georgia",
    fontSize: 28,
    color: "rgba(255, 230, 180, 0.9)",
    letterSpacing: 4,
    textShadowColor: "rgba(220, 100, 20, 0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});
