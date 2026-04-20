"use client";

import React from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { LogOut, User, Settings, Shield } from "lucide-react";
import Link from "next/link";

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
              Vidit AI
            </h1>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/dashboard/user" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/dashboard/user/profile" className="text-slate-400 hover:text-white transition-colors">Profile</Link>
              <span className="text-slate-700">|</span>
              <span className="capitalize text-slate-500 font-bold tracking-tighter">{user?.role}</span>
            </div>
          </div>

            <div className="flex items-center gap-6">
              <Link href="/dashboard/user/profile" className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <User size={14} className="text-blue-400" />
                </div>
                <span className="text-sm font-medium">{user?.full_name || user?.email}</span>
              </Link>

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
