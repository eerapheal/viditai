import "../global.css";
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toaster } from 'sonner-native';
import { AuthProvider, useAuth } from '@/lib/contexts/auth-context';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated) {
      if (user?.role !== 'user') {
        // Restricted access for non-user roles on mobile
        // This shouldn't normally happen due to login checks, but added for safety
        router.replace('/(auth)/login');
      } else if (inAuthGroup) {
        // Redirect to home if already authenticated as user
        router.replace('/(tabs)');
      }
    }
  }, [user, segments, isLoading, isAuthenticated]);

  if (isLoading) {
    return null; // Or a splash screen
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: '#0f172a',
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <Toaster />
      </AuthGuard>
    </AuthProvider>
  );
}
