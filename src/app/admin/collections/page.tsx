"use client";

import { useState, useEffect } from "react";
import { HandCoins, Save, CalendarDays, CheckCircle2 } from "lucide-react";
import type { UserInfo } from "@/types/models";

interface MemberEntry {
  userId: string;
  name: string;
  username: string;
  premiumAmount: string;
}

export default function BulkCollectionsPage() {
  const [entries, setEntries] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalPremium, setGlobalPremium] = useState<string>("0");
  
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Fetch global premium setting first
    fetch("/api/admin/settings", { cache: "no-store", headers: { 'Cache-Control': 'no-cache' } })
      .then(res => res.json())
      .then(settingData => {
        const defaultPremium = (settingData && settingData.monthlyPremium) 
          ? settingData.monthlyPremium.toString() 
          : "0";
        setGlobalPremium(defaultPremium);

        // Then fetch active members
        return fetch("/api/admin/users")
          .then(res => res.json())
          .then(users => {
            const members = users.filter((u: UserInfo) => u.role === "MEMBER");
            const initialEntries = members.map((m: UserInfo) => ({
              userId: m.id,
              name: m.name || "",
              username: m.username,
              premiumAmount: defaultPremium, // Pre-fill with global setting
            }));
            setEntries(initialEntries);
            setLoading(false);
          });
      })
      .catch(err => {
        console.error("Failed to load initial data", err);
        setLoading(false);
      });
  }, []);

  const handleInputChange = (index: number, field: keyof MemberEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Filter out rows where nothing is being collected
    const activeSubmissions = entries.filter(entry => {
      const p = parseFloat(entry.premiumAmount) || 0;
      return p > 0;
    });

    if (activeSubmissions.length === 0) {
      alert("No collections entered. Please enter at least one value greater than zero.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionDate,
          entries: activeSubmissions
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully processed ${data.processedCount} collections!`);
        
        // Reset inputs, preserving the global premium default
        setEntries(entries.map(e => ({
          ...e,
          premiumAmount: globalPremium,
        })));
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "Failed to process bulk collection"}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Network error: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bulk Monthly Collections</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-indigo-500" />
            Monthly Ledger Entry
          </h2>
          
          <div className="flex items-center gap-3">
             <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <CalendarDays className="w-4 h-4 text-slate-400" /> 
                Collection Date
              </label>
              <input 
                required 
                type="date" 
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" 
                value={collectionDate} 
                onChange={e => setCollectionDate(e.target.value)} 
              />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading ledger...</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Premium (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr>
                       <td colSpan={2} className="px-6 py-8 text-center text-slate-500 font-medium">
                          No active members found.
                       </td>
                    </tr>
                  ) : entries.map((entry, idx) => (
                    <tr key={entry.userId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{entry.name}</span>
                          <span className="text-xs text-slate-500">@{entry.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00"
                          className="w-full max-w-[140px] px-3 py-2 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                          value={entry.premiumAmount}
                          onChange={e => handleInputChange(idx, "premiumAmount", e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                type="submit" 
                disabled={submitting || entries.length === 0}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {submitting ? "Processing Ledger..." : "Submit All Collections"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
