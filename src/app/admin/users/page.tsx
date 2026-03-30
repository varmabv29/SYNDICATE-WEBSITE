"use client";

import { useState, useEffect } from "react";
import { UserPlus, Shield, Pencil, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/format";
import type { UserInfo } from "@/types/models";

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ id: "", name: "", username: "", password: "", role: "MEMBER" });
  const [isEditing, setIsEditing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = "/api/admin/users";
    const method = isEditing ? "PUT" : "POST";
    
    // For editing, we don't strictly require password if it's empty (keep old)
    const payload: Record<string, string> = { ...formData };
    if (isEditing && !payload.password) delete payload.password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      resetForm();
      fetchUsers();
    } else {
      const { error } = await res.json();
      alert(`Failed to ${isEditing ? 'update' : 'create'} user: ${error}`);
    }
  };

  const handleEdit = (user: UserInfo) => {
    setIsEditing(true);
    setFormData({
      id: user.id,
      name: user.name || "",
      username: user.username,
      password: "", // intentionally blank, only fill if changing
      role: user.role
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (user: UserInfo) => {
    if (user.id === session?.user?.id) {
      alert("You cannot delete your own admin account.");
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${user.name || user.username}? This will also remove all their associated premiums and loans.`)) {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
        if (isEditing && formData.id === user.id) resetForm();
      } else {
        const { error } = await res.json();
        alert(`Failed to delete user: ${error}`);
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setFormData({ id: "", name: "", username: "", password: "", role: "MEMBER" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors ${isEditing ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'}`}>
            <div className={`border-b p-4 flex justify-between items-center ${isEditing ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                {isEditing ? (
                  <><Pencil className="w-5 h-5 text-indigo-500" /> Edit User</>
                ) : (
                  <><UserPlus className="w-5 h-5 text-indigo-500" /> Add New User</>
                )}
              </h2>
              {isEditing && (
                <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Jane Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input required disabled={isEditing} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500" placeholder="janedoe" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  {isEditing && <p className="text-xs mt-1 text-slate-500">Username cannot be changed.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input required={!isEditing} type="password" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder={isEditing ? "(Leave blank to keep current)" : "••••••••"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors">
                  {isEditing ? "Save Changes" : "Create User"}
                </button>
                {isEditing && (
                  <button type="button" onClick={resetForm} className="w-full mt-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg transition-colors">
                    Cancel
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <h2 className="font-semibold text-slate-900">System Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-sm font-medium text-slate-500 bg-slate-50/50">
                    <th className="p-4">Name</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Role</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500">Loading users...</td></tr>
                  ) : users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">
                        {user.name || "-"}
                        <div className="text-xs text-slate-400 mt-0.5">Joined {formatDate(user.createdAt)}</div>
                      </td>
                      <td className="p-4 text-slate-600">@{user.username}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {user.id !== session?.user?.id && (
                          <button 
                            onClick={() => handleDelete(user)}
                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
