"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowLeft, User as UserIcon, Mail, Trash2, LogOut, Check, Shield, Globe } from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/config";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (res.ok) {
        await refreshUser();
        alert("Profile updated successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        logout();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/user">
          <button className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h2 className="text-3xl font-bold font-glow">Account Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
               <UserIcon size={20} className="text-blue-400" />
               Personal Information
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <div className="flex items-center gap-3 w-full bg-slate-900/20 border border-slate-800/50 rounded-xl px-4 py-3 text-slate-500">
                   <Mail size={16} />
                   <span>{user?.email}</span>
                   <span className="ml-auto text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">VERIFIED</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
               <button 
                onClick={handleUpdate}
                disabled={isUpdating}
                className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 font-bold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
               >
                 {isUpdating ? "Saving..." : "Save Changes"}
               </button>
            </div>
          </GlassCard>

          <GlassCard className="p-8 border-red-500/20 bg-red-500/[0.02]">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
               <Trash2 size={20} />
               Danger Zone
            </h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Permanently delete your account and all associated data, including your video library and active subscriptions. This action cannot be undone.
            </p>
            
            <div className="mt-6">
               {!showDeleteConfirm ? (
                 <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-6 py-2.5 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-sm transition-all"
                 >
                   Delete Account
                 </button>
               ) : (
                 <div className="flex flex-col gap-4 p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
                    <p className="text-sm font-bold text-red-400">Are you absolutely sure?</p>
                    <div className="flex gap-3">
                       <button 
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                       >
                         {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
                       </button>
                       <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                       >
                         Cancel
                       </button>
                    </div>
                 </div>
               )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
           <GlassCard className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                 <span className="text-3xl font-black text-blue-400">
                    {user?.full_name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase() || "?"}
                 </span>
              </div>
              <h4 className="font-bold text-white text-lg">{user?.full_name || "Creator"}</h4>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              
              <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                 <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-800 text-red-400 hover:bg-red-500/5 hover:border-red-500/30 transition-all font-bold text-sm"
                 >
                   <LogOut size={16} />
                   <span>Sign Out</span>
                 </button>
              </div>
           </GlassCard>

           <GlassCard className="p-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Subscription</h4>
              <div className="flex items-center justify-between mb-6">
                 <span className="text-sm font-medium text-white">{user?.plan?.toUpperCase()} Plan</span>
                 <Check size={16} className="text-green-500" />
              </div>
              {user?.plan === "FREE" && (
                <Link href="/dashboard/user/upgrade">
                  <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-500/20">
                    UPGRADE NOW
                  </button>
                </Link>
              )}
              <div className="flex items-center justify-center gap-4 mt-6 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                <div className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure</div>
                <div className="flex items-center gap-1"><Globe className="h-3 w-3" /> Global</div>
              </div>
           </GlassCard>
        </div>
      </div>
    </div>
  );
}
