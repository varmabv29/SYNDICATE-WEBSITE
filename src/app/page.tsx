"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      username: formData.username,
      password: formData.password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid username or password");
      setLoading(false);
    } else {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      
      if (session?.user?.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/member/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg transform -rotate-6">
            <span className="text-3xl font-bold text-white transform rotate-6">M</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Master Minds Syndicate</h1>
          <p className="text-slate-500 mt-2">Sign in to your account</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm mb-6 border border-rose-100 font-medium text-center">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                  placeholder="Enter your username" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Note: Contact the group administrator if you have lost your login credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
