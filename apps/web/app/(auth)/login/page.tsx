"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/GlassCard";
import { ModernInput } from "@/components/ui/ModernInput";
import { AIButton } from "@/components/ui/AIButton";
import { useAuth } from "@/lib/contexts/auth-context";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Login failed");
      }

      toast.success("Welcome back!");
      login(result.access_token, result.user);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] animate-pulse-slow" />

      <GlassCard className="max-w-md w-full">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-glow">Sign In</h1>
          <p className="text-muted-foreground">Welcome back to the future of editing.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <ModernInput
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            icon={<Mail size={18} />}
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="space-y-1">
            <ModernInput
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              error={errors.password?.message}
              {...register("password")}
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline transition-all"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <AIButton type="submit" isLoading={isLoading}>
              <div className="flex items-center justify-center gap-2">
                <span>Sign In</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </AIButton>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline transition-all">
                Create Account
              </Link>
            </p>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
