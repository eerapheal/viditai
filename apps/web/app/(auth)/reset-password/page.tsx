"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, ShieldCheck } from "lucide-react";
import { API_V1 } from "@/lib/config";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/GlassCard";
import { ModernInput } from "@/components/ui/ModernInput";
import { AIButton } from "@/components/ui/AIButton";

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Valid reset token is required.");
      router.push("/login");
    }
  }, [token, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_V1}/auth/password-reset-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: data.password,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || "Reset failed");
      }

      toast.success("Password updated successfully!");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
      
      <GlassCard className="max-w-md w-full">
        <div className="text-center space-y-2 mb-8">
          <div className="flex justify-center mb-4">
            <ShieldCheck size={48} className="text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-glow">New Password</h1>
          <p className="text-muted-foreground">Secure your account with a strong password.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <ModernInput
            label="New Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            error={errors.password?.message}
            {...register("password")}
          />

          <ModernInput
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />

          <div className="pt-2">
            <AIButton type="submit" isLoading={isLoading}>
              Update Password
            </AIButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
        <div className="animate-pulse flex items-center gap-2">
          <ShieldCheck size={24} className="text-primary" />
          <span className="text-primary font-medium tracking-tight">Loading secure context...</span>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
