import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function GlassCard({ children, className, delay = 0 }: GlassCardProps) {
  return (
    <Animated.View 
      entering={FadeInUp.duration(500).delay(delay)}
      className={`relative overflow-hidden rounded-3xl border border-white/5 shadow-2xl ${className}`}
    >
      <BlurView 
        intensity={Platform.OS === 'ios' ? 40 : 80} 
        tint="dark" 
        className="p-8 w-full"
      >
        {/* Subtle glowing orb in background (simulated) */}
        <View 
          className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full" 
          style={{ transform: [{ scale: 1.5 }], filter: 'blur(40px)' } as any}
        />
        
        <View className="relative z-10">
          {children}
        </View>
      </BlurView>
    </Animated.View>
  );
}
