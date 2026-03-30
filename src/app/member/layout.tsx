"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Banknote, Users, Menu, X, TrendingUp, FileBarChart } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session || !session.user) return <div className="p-8">Access Denied</div>;

  const links = [
    { href: "/member/dashboard", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/member/summary", label: "Syndicate Summary", icon: TrendingUp },
    { href: "/member/loans", label: "Group Loans", icon: Banknote },
    { href: "/member/reports", label: "Reports", icon: FileBarChart },
    { href: "/member/directory", label: "Member Directory", icon: Users },
  ];

  const sidebarContent = (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white shrink-0">M</div>
        <h1 className="text-lg font-bold tracking-tight">Master Minds Syndicate</h1>
      </div>
      
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-indigo-200 hover:bg-indigo-900/50 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-indigo-900 pt-4">
        <div className="mb-3 px-4 text-sm text-indigo-300">
          Logged in as <span className="text-white font-medium">{session.user.name}</span>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-indigo-950 text-white flex items-center justify-between px-4 py-3 shadow-lg">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-indigo-900 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">M</div>
          <span className="font-semibold text-sm">Master Minds</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="sidebar-drawer absolute left-0 top-0 bottom-0 w-72 bg-indigo-950 text-white p-5 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Navigation</span>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-indigo-900 transition-colors text-indigo-300"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-indigo-950 text-white p-5">
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
