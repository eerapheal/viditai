import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ModernInput } from '@/components/ui/ModernInput';
import { AIButton } from '@/components/ui/AIButton';
import { AnimatedOrb } from '@/components/ui/AnimatedOrb';
import { resetPasswordSchema, ResetFormValues } from '@/lib/auth-schemas';
import { apiRequest } from '@/lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Valid reset token is required.');
      router.replace('/(auth)/login');
    }
  }, [token, router]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true);
    try {
      await apiRequest('/auth/password-reset-confirm', {
        method: 'POST',
        body: JSON.stringify({
          token: token,
          new_password: data.password,
        }),
      });

      toast.success('Password updated successfully!');
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

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
            <View className="mb-4">
              <ShieldCheck size={48} color="#3b82f6" />
            </View>
            <Text className="text-3xl font-bold tracking-tight text-white mb-2 text-center">New Password</Text>
            <Text className="text-slate-400 text-center px-4">Secure your account with a strong password.</Text>
          </View>

          <View className="space-y-6">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <ModernInput
                  label="New Password"
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

            <Controller
              control={control}
              name="confirm_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <ModernInput
                  label="Confirm New Password"
                  placeholder="••••••••"
                  secureTextEntry
                  icon={<Lock size={18} color="#94a3b8" />}
                  error={errors.confirm_password?.message}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />

            <View className="pt-4">
              <AIButton 
                onPress={handleSubmit(onSubmit)} 
                isLoading={isLoading}
              >
                Update Password
              </AIButton>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
