import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { toast } from 'sonner-native'; // Standard for Expo if added, otherwise use Alert

import { GlassCard } from '@/components/ui/GlassCard';
import { ModernInput } from '@/components/ui/ModernInput';
import { AIButton } from '@/components/ui/AIButton';
import { AnimatedOrb } from '@/components/ui/AnimatedOrb';
import { loginSchema, LoginFormValues } from '@/lib/auth-schemas';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/contexts/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      await login(result.access_token, result.user);
      
      // The _layout will handle redirect to (tabs) automatically via useAuth state change
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Background decorative elements */}
        <AnimatedOrb className="bg-blue-600/10 top-1/4 -left-1/4" delay={0} />
        <AnimatedOrb className="bg-blue-500/5 bottom-1/4 -right-1/4" delay={1500} />

        <GlassCard delay={200}>
          <View className="text-center space-y-2 mb-8 items-center">
            <Text className="text-3xl font-bold tracking-tight text-white mb-2">Sign In</Text>
            <Text className="text-slate-400 text-center">Welcome back to the future of editing.</Text>
          </View>

          <View className="space-y-6">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <ModernInput
                  label="Email Address"
                  placeholder="john@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon={<Mail size={18} color="#94a3b8" />}
                  error={errors.email?.message}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />

            <View className="space-y-1">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ModernInput
                    label="Password"
                    placeholder="••••••••"
                    secureTextEntry
                    icon={<Lock size={18} color="#94a3b8" />}
                    error={errors.password?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              <View className="flex-row justify-end mt-2">
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable>
                    <Text className="text-xs text-blue-400 font-medium">Forgot your password?</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View className="space-y-4 pt-4">
              <AIButton 
                onPress={handleSubmit(onSubmit)} 
                isLoading={isLoading}
              >
                <View className="flex-row items-center justify-center space-x-2">
                  <Text className="text-white font-bold mr-2">Sign In</Text>
                  <ArrowRight size={18} color="white" />
                </View>
              </AIButton>
              
              <View className="relative py-2 items-center">
                <View className="absolute w-full h-[1px] bg-white/5 top-1/2" />
                <View className="bg-slate-900 px-3">
                  <Text className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Or</Text>
                </View>
              </View>

              <View className="flex-row justify-center items-center">
                <Text className="text-sm text-slate-400">Don't have an account? </Text>
                <Link href="/(auth)/signup" asChild>
                  <Pressable>
                    <Text className="text-sm text-blue-400 font-bold">Create Account</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
