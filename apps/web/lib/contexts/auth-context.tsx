"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export type UserRole = "user" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  plan: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const syncUser = async () => {
    const token = Cookies.get(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    syncUser();
  }, []);

  const login = (token: string, userData: User) => {
    // Set cookie for middleware (7 days)
    Cookies.set(TOKEN_KEY, token, { expires: 7, secure: true, sameSite: "strict" });
    
    // Set localStorage for client-side state
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    
    setUser(userData);
    
    // Dynamic redirect based on role
    if (userData.role === "admin" || userData.role === "super_admin") {
      router.push("/dashboard/admin");
    } else {
      router.push("/dashboard/user");
    }
  };

  const logout = () => {
    Cookies.remove(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push("/login");
  };

  const refreshUser = async () => {
    const token = Cookies.get(TOKEN_KEY);
    if (!token) return;

    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
