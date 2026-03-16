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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-white/10 animate-fade-in-up">
        <div className="text-center pt-10 pb-2 px-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-emerald-400 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
            <span className="text-3xl font-bold text-white transform rotate-6">M</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Master Minds Syndicate</h1>
          <p className="text-indigo-200/70 mt-2 text-sm">Sign in to your account</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-rose-500/15 text-rose-300 p-3 rounded-lg text-sm mb-6 border border-rose-500/20 font-medium text-center backdrop-blur-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-indigo-100/80 mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-indigo-300/50" />
                </div>
                <input 
                  type="text" 
                  required
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50 outline-none transition-all text-white placeholder-indigo-200/30" 
                  placeholder="Enter your username" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-indigo-100/80 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-indigo-300/50" />
                </div>
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50 outline-none transition-all text-white placeholder-indigo-200/30" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-indigo-200/40">
              Note: Contact the group administrator if you have lost your login credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
