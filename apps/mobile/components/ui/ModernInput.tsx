import React, { forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { cn } from '@/lib/utils'; // I should create this if it's missing or use standard logic

interface ModernInputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const ModernInput = forwardRef<TextInput, ModernInputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <View className="space-y-2 w-full">
        <Text className="text-sm font-medium text-slate-400 ml-1 mb-1">
          {label}
        </Text>
        <View className="relative">
          {icon && (
            <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10 opacity-60">
              {icon}
            </View>
          )}
          <TextInput
            ref={ref}
            placeholderTextColor="#64748b"
            className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white transition-all duration-300 ${
              icon ? 'pl-11' : ''
            } ${error ? 'border-red-500/50' : ''} ${className}`}
            {...props}
          />
        </View>
        {error && (
          <Text className="text-xs text-red-500 mt-1 ml-1">{error}</Text>
        )}
      </View>
    );
  }
);

ModernInput.displayName = 'ModernInput';
