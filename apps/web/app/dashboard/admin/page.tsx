"use client";

import React from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { GlassCard } from "@/components/ui/GlassCard";
import { Users, BarChart3, Settings, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Admin Console</h2>
          <p className="text-slate-400 mt-1">Platform overview and management.</p>
        </div>
        
        {user?.role === "super_admin" && (
          <div className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest">
            <ShieldAlert size={14} />
            Super Admin Access
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Users className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">Total Users</h3>
            <p className="text-3xl font-bold mt-1">0</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <BarChart3 className="text-emerald-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">Total Revenue</h3>
            <p className="text-3xl font-bold mt-1">$0</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4 col-span-1 md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Settings size={120} />
          </div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-xl font-bold">User Management</h3>
            <p className="text-slate-400 text-sm max-w-xs">
              Review platform users, manage subscription plans, and update roles.
            </p>
            <Link 
              href="/dashboard/admin/users"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-all group/link"
            >
              Manage Users
              <ArrowRight size={18} className="group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Recent Signups</h3>
        <GlassCard className="py-12 flex items-center justify-center text-slate-500">
           Analytics data loading...
        </GlassCard>
      </div>
    </div>
  );
}
