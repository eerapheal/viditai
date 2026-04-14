import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface AIButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export function AIButton({
  children,
  onPress,
  isLoading,
  disabled,
  variant = 'primary',
  className,
}: AIButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const variants = {
    primary: 'bg-blue-600 shadow-blue-500/50 shadow-lg',
    secondary: 'bg-slate-800 border border-white/10',
    ghost: 'bg-transparent',
  };

  const onPressIn = () => {
    scale.value = withSpring(0.96);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={animatedStyle} className="w-full">
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isLoading || disabled}
        className={`relative w-full py-4 px-6 rounded-xl overflow-hidden flex-row items-center justify-center ${
          variants[variant]
        } ${disabled || isLoading ? 'opacity-50' : ''} ${className}`}
      >
        {isLoading ? (
          <View className="flex-row items-center justify-center space-x-2">
            <ActivityIndicator color="white" size="small" />
            <Text className="text-white font-semibold ml-2">Processing...</Text>
          </View>
        ) : (
          <Text className="text-white font-bold text-base text-center">
            {children}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
