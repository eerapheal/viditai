"use client";

import React from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { GlassCard } from "@/components/ui/GlassCard";
import { Video, Star, Clock, Plus } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Hello, {user?.full_name || "User"}</h2>
          <p className="text-slate-400 mt-1">Ready to create something viral today?</p>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm uppercase tracking-wider">
          <Plus size={18} />
          New Video
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Video className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-glow">Total Videos</h3>
            <p className="text-3xl font-bold mt-1">0</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Star className="text-purple-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-glow">Current Plan</h3>
            <p className="text-3xl font-bold mt-1 uppercase">{user?.plan}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Clock className="text-green-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-glow">Exports Left</h3>
            <p className="text-3xl font-bold mt-1">10</p>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Recent Projects</h3>
        <GlassCard className="flex flex-col items-center justify-center py-20 text-slate-500 border-dashed">
          <p>No videos processed yet.</p>
          <button className="text-blue-400 hover:underline mt-2 text-sm">Upload your first footage</button>
        </GlassCard>
      </div>
    </div>
  );
}
