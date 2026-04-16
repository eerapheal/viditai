"use client";

import React from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { LogOut, User, Settings, Shield } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Shared Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              AutoCut AI
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
              <span className="capitalize">{user?.role} Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User size={14} className="text-blue-400" />
              </div>
              <span className="text-sm font-medium">{user?.full_name || user?.email}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
