"use client";

import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [monthlyPremium, setMonthlyPremium] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data && data.monthlyPremium !== undefined) {
          setMonthlyPremium(data.monthlyPremium.toString());
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyPremium: parseFloat(monthlyPremium) || 0 })
    });

    if (res.ok) {
      alert("Settings updated successfully!");
    } else {
      alert("Failed to update settings.");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Application Settings</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            Global Defaults
          </h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading settings...</div>
        ) : (
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Default Monthly Premium Amount (₹)
                </label>
                <p className="text-xs text-slate-500">
                  This amount will automatically pre-fill for all members when logging monthly collections.
                </p>
                <input 
                  required
                  type="number" 
                  step="0.01" 
                  min="0"
                  className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  value={monthlyPremium} 
                  onChange={e => setMonthlyPremium(e.target.value)} 
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
