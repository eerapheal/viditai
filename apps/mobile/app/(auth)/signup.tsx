import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ModernInput } from '@/components/ui/ModernInput';
import { AIButton } from '@/components/ui/AIButton';
import { AnimatedOrb } from '@/components/ui/AnimatedOrb';
import { signupSchema, SignupFormValues } from '@/lib/auth-schemas';
import { apiRequest, saveToken } from '@/lib/api';

export default function SignupScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      await saveToken(result.access_token);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Signup failed');
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
        <AnimatedOrb className="bg-blue-600/10 top-1/4 -right-1/4" delay={0} />
        <AnimatedOrb className="bg-blue-500/5 bottom-1/4 -left-1/4" delay={1500} />

        <GlassCard delay={200}>
          <View className="text-center space-y-2 mb-8 items-center">
            <Text className="text-3xl font-bold tracking-tight text-white mb-2">Create Account</Text>
            <Text className="text-slate-400 text-center">Join AutoCut AI and start editing smarter.</Text>
          </View>

          <View className="space-y-6">
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <ModernInput
                  label="Full Name"
                  placeholder="John Doe"
                  icon={<User size={18} color="#94a3b8" />}
                  error={errors.full_name?.message}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />

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

            <View className="space-y-4 pt-4">
              <AIButton 
                onPress={handleSubmit(onSubmit)} 
                isLoading={isLoading}
              >
                <Text className="text-white font-bold mr-2">Get Started Free</Text>
              </AIButton>
              
              <View className="flex-row justify-center items-center">
                <Text className="text-sm text-slate-400">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text className="text-sm text-blue-400 font-bold">Sign In</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>

          <View className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <View className="flex-row items-start space-x-3">
              <CheckCircle2 size={14} color="#3b82f6" />
              <Text className="text-[11px] text-slate-500 flex-1 ml-2">Generate ultra-cut videos in seconds using AI scene detection.</Text>
            </View>
            <View className="flex-row items-start space-x-3">
              <CheckCircle2 size={14} color="#3b82f6" />
              <Text className="text-[11px] text-slate-500 flex-1 ml-2">Export directly to TikTok, Reels, and Shorts formats.</Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
