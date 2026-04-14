"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
}

export function AIButton({
  children,
  className,
  variant = "primary",
  isLoading,
  ...props
}: AIButtonProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95",
    secondary: "bg-secondary text-secondary-foreground border border-white/10 hover:bg-white/10 active:scale-95",
    ghost: "bg-transparent hover:bg-white/5",
  };

  return (
    <button
      className={cn(
        "relative w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group",
        variants[variant],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
      
      {/* Shine effect on hover */}
      <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/20 skew-x-[-20deg] group-hover:left-[150%] transition-all duration-700 ease-in-out" />
    </button>
  );
}
