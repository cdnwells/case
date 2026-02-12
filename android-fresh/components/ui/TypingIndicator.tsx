import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

export function TypingIndicator() {
  const dot1 = useSharedValue(0.5);
  const dot2 = useSharedValue(0.5);
  const dot3 = useSharedValue(0.5);
  const caseColor = '#4A5568';

  useEffect(() => {
    const pulse = (sharedValue: SharedValue<number>, delay: number) => {
      sharedValue.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.5, { duration: 300 })
          ),
          -1,
          true
        )
      );
    };

    pulse(dot1, 0);
    pulse(dot2, 200);
    pulse(dot3, 400);
  }, [dot1, dot2, dot3]);

  const dotStyle = {
    backgroundColor: caseColor,
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  };

  const animatedStyle1 = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ scale: dot1.value }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ scale: dot2.value }],
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    opacity: dot3.value,
    transform: [{ scale: dot3.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[dotStyle, animatedStyle1]} />
      <Animated.View style={[dotStyle, animatedStyle2]} />
      <Animated.View style={[dotStyle, animatedStyle3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    // backgroundColor: '#f0f0f0', // Adjust based on your theme or MessageBubble style
    // borderRadius: 16,
    alignSelf: 'flex-start',
    marginLeft: 12, // Align with left-side messages
    marginBottom: 8,
    borderBottomLeftRadius: 4,
  },
});
