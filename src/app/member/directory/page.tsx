"use client";

import { useState, useEffect } from "react";
import { Users, TrendingUp } from "lucide-react";

interface MemberNAV {
  id: string;
  name: string;
  username: string;
  totalPremiumPaid: number;
  dividendEarned: number;
  chitShare?: number;
  nav: number;
}

export default function MemberDirectoryPage() {
  const [data, setData] = useState<{
    totalGroupInterest: number;
    totalMembers: number;
    dividendPerMember: number;
    chitShare?: number;
    members: MemberNAV[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member/directory")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch directory", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Member Directory & NAV</h1>
      </div>

      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total Group Interest</h3>
            <div className="text-2xl font-bold text-slate-900">₹{data.totalGroupInterest.toFixed(2)}</div>
            <p className="text-xs text-slate-400 mt-1">Earned from all loans combined</p>
          </div>
          <div className="bg-indigo-600 border border-indigo-700 rounded-xl p-6 shadow-sm text-white">
            <h3 className="text-sm font-medium text-indigo-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 
              Dividend Per Member
            </h3>
            <div className="text-3xl font-bold">₹{data.dividendPerMember.toFixed(2)}</div>
            <p className="text-xs text-indigo-200 mt-1">Equally distributed among {data.totalMembers} members</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total Members</h3>
            <div className="text-2xl font-bold text-slate-900">{data.totalMembers}</div>
            <p className="text-xs text-slate-400 mt-1">Active contributing accounts</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Group Member Roster
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading directory...</div>
        ) : !data || data.members.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No members found.</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-xs">
                  <th className="p-4 pl-6 font-bold">Member Name</th>
                  <th className="p-4 font-bold">Base Premium Paid</th>
                  <th className="p-4 font-bold text-emerald-600">+ Dividend Share</th>
                  <th className="p-4 font-bold text-amber-600">+ Chit Savings</th>
                  <th className="p-4 pr-6 font-bold text-right text-indigo-700">Net Asset Value (NAV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{member.name}</span>
                        <span className="text-xs text-slate-500">@{member.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">₹{member.totalPremiumPaid.toFixed(2)}</td>
                    <td className="p-4 text-emerald-600 font-medium">+ ₹{member.dividendEarned.toFixed(2)}</td>
                    <td className="p-4 text-amber-600 font-medium">+ ₹{member.chitShare?.toFixed(2) || '0.00'}</td>
                    <td className="p-4 pr-6 text-right font-bold text-indigo-700 text-base">₹{member.nav.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
