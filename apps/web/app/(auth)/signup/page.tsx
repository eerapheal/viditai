"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/GlassCard";
import { ModernInput } from "@/components/ui/ModernInput";
import { AIButton } from "@/components/ui/AIButton";

const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Signup failed");
      }

      toast.success("Account created successfully!");
      localStorage.setItem("token", result.access_token);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />

      <GlassCard className="max-w-md w-full">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-glow">Create Account</h1>
          <p className="text-muted-foreground">Join AutoCut AI and start editing smarter.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <ModernInput
            label="Full Name"
            placeholder="John Doe"
            icon={<User size={18} />}
            error={errors.full_name?.message}
            {...register("full_name")}
          />

          <ModernInput
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            icon={<Mail size={18} />}
            error={errors.email?.message}
            {...register("email")}
          />

          <ModernInput
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="space-y-4 pt-2">
            <AIButton type="submit" isLoading={isLoading}>
              Get Started Free
            </AIButton>
            
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline transition-all">
                Sign In
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-start gap-3 text-xs text-muted-foreground">
            <CheckCircle2 size={14} className="text-primary mt-0.5" />
            <span>Generate ultra-cut videos in seconds using AI scene detection.</span>
          </div>
          <div className="flex items-start gap-3 text-xs text-muted-foreground">
            <CheckCircle2 size={14} className="text-primary mt-0.5" />
            <span>Export directly to TikTok, Reels, and Shorts formats.</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
