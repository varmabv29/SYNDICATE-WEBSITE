"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Banknote, Users } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session || !session.user) return <div className="p-8">Access Denied</div>;

  const links = [
    { href: "/member/dashboard", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/member/loans", label: "Group Loans", icon: Banknote },
    { href: "/member/directory", label: "Member Directory", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-indigo-950 text-white min-h-screen p-6 flex flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white">M</div>
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
                  active ? "bg-indigo-600 text-white" : "text-indigo-200 hover:bg-indigo-900/50 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-indigo-900 pt-6">
          <div className="mb-4 px-4 text-sm text-indigo-300">
            Logged in as <span className="text-white font-medium">{session.user.name}</span>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
