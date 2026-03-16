"use client";

import { useState, useEffect } from "react";
import { Settings, Save, KeyRound, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [monthlyPremium, setMonthlyPremium] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setPwMessage({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwMessage({ type: "error", text: data.error || "Failed to change password." });
      }
    } catch {
      setPwMessage({ type: "error", text: "Network error. Please try again." });
    }
    setChangingPassword(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Application Settings</h1>
      </div>

      {/* Global Defaults */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full max-w-2xl">
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

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full max-w-2xl">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            Change Admin Password
          </h2>
        </div>
        <div className="p-6">
          {pwMessage && (
            <div className={`p-3 rounded-lg text-sm mb-4 font-medium text-center border ${
              pwMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-600 border-rose-200"
            }`}>
              {pwMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Current Password</label>
              <div className="relative max-w-xs">
                <input 
                  required
                  type={showCurrent ? "text" : "password"}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <div className="relative max-w-xs">
                <input 
                  required
                  type={showNew ? "text" : "password"}
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
              <div className="max-w-xs">
                <input 
                  required
                  type="password"
                  minLength={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                    confirmPassword && confirmPassword !== newPassword 
                      ? "border-rose-400 bg-rose-50" 
                      : "border-slate-300"
                  }`}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-rose-500 mt-1">Passwords do not match.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button 
                type="submit" 
                disabled={changingPassword}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {changingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
