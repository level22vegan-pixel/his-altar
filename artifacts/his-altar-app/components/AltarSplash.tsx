import React, { useEffect } from "react";
import { Dimensions, Image, StyleSheet, Text } from "react-native";
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

export default function AltarSplash({ onDone }: Props) {
  const screenOpacity = useSharedValue(0);
  const imgScale = useSharedValue(0.94);
  const exitOpacity = useSharedValue(1);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 800 });
    imgScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) });
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
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imgScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, wrapStyle]}>
      {/* Centered altar image — smaller, with space around it */}
      <Animated.View style={[styles.imgWrap, imgStyle]}>
        <Image
          source={require("@/assets/images/altar-splash.png")}
          style={styles.img}
          resizeMode="contain"
        />
        {/* Smoke wisps overlaid on top of image */}
        <Animated.View style={styles.smokeLayer}>
          <SmokeWisp x={0}   delay={0}    duration={2400} amplitude={14} />
          <SmokeWisp x={-14} delay={550}  duration={2800} amplitude={-18} />
          <SmokeWisp x={14}  delay={950}  duration={2100} amplitude={11} />
          <SmokeWisp x={-6}  delay={1450} duration={2600} amplitude={-9} />
          <SmokeWisp x={8}   delay={320}  duration={2900} amplitude={15} />
        </Animated.View>
      </Animated.View>

      {/* Title */}
      <Animated.Text style={[styles.title, titleStyle]}>His Altar</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  imgWrap: {
    width: width * 0.72,
    height: width * 0.72 * (4 / 3),
    alignItems: "center",
    justifyContent: "center",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  smokeLayer: {
    position: "absolute",
    bottom: "32%",
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
    marginTop: 32,
    fontFamily: "Georgia",
    fontSize: 30,
    color: "#fff",
    letterSpacing: 3,
    textShadowColor: "rgba(200,150,40,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
});
