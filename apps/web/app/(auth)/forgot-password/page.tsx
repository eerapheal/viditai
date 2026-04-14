"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { GlassCard } from "@/components/ui/GlassCard";
import { ModernInput } from "@/components/ui/ModernInput";
import { AIButton } from "@/components/ui/AIButton";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to request reset");
      }

      setIsSent(true);
      toast.success("Reset instructions sent!");
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
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />

      <GlassCard className="max-w-md w-full">
        <AnimatePresence mode="wait">
          {!isSent ? (
            <motion.div
              key="request"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-glow">Reset Password</h1>
                <p className="text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
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

                <div className="space-y-4">
                  <AIButton type="submit" isLoading={isLoading}>
                    Send Reset Link
                  </AIButton>
                  
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                  <MailCheck size={40} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Check your inbox</h2>
                <p className="text-muted-foreground">
                  If an account exists for that email, we&apos;ve sent reset instructions.
                </p>
              </div>

              <div className="pt-4">
                <Link href="/login">
                  <AIButton variant="secondary">Return to Login</AIButton>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
}
