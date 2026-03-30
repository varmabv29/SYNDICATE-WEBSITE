"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Search } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { PremiumRecord, UserInfo } from "@/types/models";

export default function PremiumsManagerPage() {
  const [premiums, setPremiums] = useState<PremiumRecord[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ userId: "", amount: "", datePaid: "" });
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [premRes, userRes] = await Promise.all([
      fetch("/api/admin/premiums"),
      fetch("/api/admin/users")
    ]);
    if (premRes.ok) setPremiums(await premRes.json());
    if (userRes.ok) setUsers((await userRes.json()).filter((u: UserInfo) => u.role === "MEMBER"));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/premiums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setFormData({ userId: "", amount: "", datePaid: "" });
      fetchData();
    } else {
      alert("Failed to log premium");
    }
  };

  const filtered = premiums.filter((p: PremiumRecord) => 
    p.user.name.toLowerCase().includes(search.toLowerCase()) || 
    p.user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contributions Manager</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                Log Monthly Premium
              </h2>
            </div>
            <div className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Member</label>
                  <select required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}>
                    <option value="" disabled>Choose a member...</option>
                    {users.map((u: UserInfo) => (
                      <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                  <input required type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="100.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Paid (Optional)</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={formData.datePaid} onChange={e => setFormData({...formData, datePaid: e.target.value})} />
                  <p className="text-xs text-slate-500 mt-1">Leaves empty to use today's date.</p>
                </div>
                
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors">
                  Record Payment
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="border-b border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-semibold text-slate-900">Recent Contributions</h2>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search members..." 
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-sm font-medium text-slate-500 bg-slate-50/50">
                    <th className="p-4">Member</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Date Logged</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500">Loading premiums...</td></tr>
                  ) : filtered.map((p: PremiumRecord) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{p.user.name}</div>
                        <div className="text-sm text-slate-500">@{p.user.username}</div>
                      </td>
                      <td className="p-4 font-bold text-slate-900">₹{p.amount.toFixed(2)}</td>
                      <td className="p-4 text-slate-500 text-sm">{formatDate(p.datePaid)}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          Clear
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500">No contributions found.</td></tr>
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
