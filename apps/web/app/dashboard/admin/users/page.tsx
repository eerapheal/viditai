"use client";

import React, { useEffect, useState } from "react";
import { useAuth, User, UserRole } from "@/lib/contexts/auth-context";
import { GlassCard } from "@/components/ui/GlassCard";
import { Shield, ShieldAlert, User as UserIcon, Check, Loader2, Trash2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { API_V1 } from "@/lib/config";
import Cookies from "js-cookie";

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const token = Cookies.get("auth_token");
    try {
      const response = await fetch(`${API_V1}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.items);
      }
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (currentUser?.role !== "super_admin") {
      toast.error("Only Super Admins can manage account status");
      return;
    }

    setUpdatingId(userId);
    const token = Cookies.get("auth_token");
    const endpoint = currentStatus ? "suspend" : "activate";
    
    try {
      const response = await fetch(`${API_V1}/admin/users/${userId}/${endpoint}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success(`User ${currentStatus ? "suspended" : "activated"} successfuly`);
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Operation failed");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUser?.role !== "super_admin") {
      toast.error("Only Super Admins can delete users");
      return;
    }

    if (!confirm("Are you sure you want to PERMANENTLY delete this user? This cannot be undone.")) {
      return;
    }

    setUpdatingId(userId);
    const token = Cookies.get("auth_token");
    
    try {
      const response = await fetch(`${API_V1}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("User deleted successfully");
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Deletion failed");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  };
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (currentUser?.role !== "super_admin") {
      toast.error("Only Super Admins can change roles");
      return;
    }

    setUpdatingId(userId);
    const token = Cookies.get("auth_token");
    try {
      const response = await fetch(`${API_V1}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_role: newRole }),
      });

      if (response.ok) {
        toast.success("Role updated successfully");
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Update failed");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-blue-400" size={40} />
        <p className="text-slate-400 animate-pulse">Loading platform citizens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-3xl font-bold">User Management</h2>
        <p className="text-slate-400 mt-1">Manage permissions and access levels.</p>
      </div>

      <GlassCard className="overflow-hidden border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Current Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Modify Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors ${u.is_active === false ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                        u.is_active === false ? 'bg-slate-900 border-slate-800' : 'bg-slate-800 border-slate-700'
                      }`}>
                        <UserIcon size={20} className={u.is_active === false ? 'text-slate-600' : 'text-slate-400'} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-medium ${u.is_active === false ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                          {u.full_name || "N/A"}
                        </span>
                        <span className="text-xs text-slate-500">{u.email}</span>
                      </div>
                      {u.is_active === false && (
                        <span className="text-[10px] font-bold uppercase tracking-tighter bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Suspended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      u.role === 'super_admin' ? 'bg-red-500/10 text-red-500' :
                      u.role === 'admin' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {u.role === 'super_admin' ? <ShieldAlert size={12} /> : 
                       u.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {currentUser?.role === "super_admin" ? (
                      <div className="flex items-center gap-2">
                        {updatingId === u.id ? (
                          <Loader2 size={16} className="animate-spin text-slate-500" />
                        ) : (
                          <div className="flex items-center gap-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>

                            <button
                              onClick={() => handleToggleStatus(u.id, u.is_active !== false)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                u.is_active !== false
                                  ? "border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                                  : "border-green-500/20 text-green-500 hover:bg-green-500/10"
                              }`}
                              title={u.is_active !== false ? "Suspend User" : "Activate User"}
                            >
                              {u.is_active !== false ? <UserMinus size={16} /> : <UserPlus size={16} />}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">No permission</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
