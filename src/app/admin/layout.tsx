"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, CreditCard, Banknote, History, LogOut, TrendingUp, Settings, Search, Receipt } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session || session.user.role !== "ADMIN") return <div className="p-8">Access Denied</div>;

  const links = [
    { href: "/admin/dashboard", label: "Dashboard", icon: TrendingUp },
    { href: "/admin/summary", label: "Summary", icon: Search },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/collections", label: "Collections", icon: History },
    { href: "/admin/loans", label: "Loans Manager", icon: Banknote },
    { href: "/admin/all-loans", label: "Group Loans", icon: Banknote },
    { href: "/admin/expenditures", label: "Expenditures", icon: Receipt },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-white min-h-screen p-6 flex flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white">M</div>
          <h1 className="text-xl font-bold tracking-tight">Master Minds Syndicate</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-800 pt-6">
          <div className="mb-4 px-4 text-sm text-slate-400">
            Logged in as <span className="text-white font-medium">{session.user.name}</span>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
