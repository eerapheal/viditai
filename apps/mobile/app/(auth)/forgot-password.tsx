import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { toast } from 'sonner-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ModernInput } from '@/components/ui/ModernInput';
import { AIButton } from '@/components/ui/AIButton';
import { AnimatedOrb } from '@/components/ui/AnimatedOrb';
import { forgotPasswordSchema, ForgotFormValues } from '@/lib/auth-schemas';
import { apiRequest } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setIsLoading(true);
    try {
      await apiRequest('/auth/password-reset-request', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setIsSent(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.message || 'Request failed');
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
        <AnimatedOrb className="bg-blue-600/10 top-1/4 -left-1/4" delay={0} />
        <AnimatedOrb className="bg-blue-500/5 bottom-1/4 -right-1/4" delay={1500} />

        <GlassCard delay={200}>
          {!isSent ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} key="request" className="space-y-8">
              <View className="text-center space-y-2 mb-6 items-center">
                <Text className="text-3xl font-bold tracking-tight text-white mb-2 text-center">Reset Password</Text>
                <Text className="text-slate-400 text-center">
                  Enter your email and we'll send you a reset link.
                </Text>
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

                <View className="space-y-4 pt-4">
                  <AIButton 
                    onPress={handleSubmit(onSubmit)} 
                    isLoading={isLoading}
                  >
                    Send Reset Link
                  </AIButton>
                  
                  <Link href="/(auth)/login" asChild>
                    <Pressable className="flex-row justify-center items-center space-x-2">
                       <ArrowLeft size={16} color="#94a3b8" />
                       <Text className="text-sm text-slate-400 font-medium ml-2">Back to Login</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} key="sent" className="items-center space-y-6 py-4">
              <View className="w-20 h-20 bg-blue-500/20 rounded-full items-center justify-center border border-blue-500/30">
                <MailCheck size={40} color="#3b82f6" />
              </View>
              
              <View className="space-y-2 items-center">
                <Text className="text-2xl font-bold text-white text-center">Check your inbox</Text>
                <Text className="text-slate-400 text-center px-4">
                  If an account exists for that email, we've sent reset instructions.
                </Text>
              </View>

              <View className="pt-6 w-full">
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <AIButton variant="secondary" pointerEvents="none">
                      Return to Login
                    </AIButton>
                  </Pressable>
                </Link>
              </View>
            </Animated.View>
          )}
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
