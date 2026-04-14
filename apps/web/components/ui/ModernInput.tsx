"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        <label className="text-sm font-medium text-muted-foreground ml-1">
          {label}
        </label>
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 focus:bg-white/10 transition-all duration-300 placeholder:text-muted-foreground/30",
              icon && "pl-11",
              error && "border-destructive/50 focus:border-destructive",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1 ml-1">{error}</p>
        )}
      </div>
    );
  }
);

ModernInput.displayName = "ModernInput";
