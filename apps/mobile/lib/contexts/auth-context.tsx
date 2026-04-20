import React, { createContext, useContext, useEffect, useState } from 'react';
import { saveToken, deleteToken, saveUser, getUser, deleteUser, apiRequest } from '@/lib/api';
import { toast } from 'sonner-native';

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  plan?: string;
  monthly_exports_used?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncAuth = async () => {
    try {
      const savedUser = await getUser();
      if (savedUser) {
        const role = (savedUser.role || '').toLowerCase();
        if (role !== 'user') {
          // Safety check: if an admin managed to log in, clear it
          await logout();
        } else {
          setUser(savedUser);
        }
      }
    } catch (error) {
      console.error('Error syncing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncAuth();
  }, []);

  const login = async (token: string, userData: User) => {
    const role = (userData.role || '').toLowerCase();
    if (role !== 'user') {
      toast.error('Mobile access is restricted to standard users only.');
      return;
    }

    await saveToken(token);
    await saveUser(userData);
    setUser(userData);
  };

  const logout = async () => {
    setUser(null);
    await deleteToken();
    await deleteUser();
  };

  const refreshUser = async () => {
    try {
      const userData = await apiRequest('/auth/me');
      const role = (userData.role || '').toLowerCase();
      if (role !== 'user') {
        await logout();
        return;
      }
      await saveUser(userData);
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
