"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, Users, CreditCard, HandCoins, Calendar, Receipt } from "lucide-react";

export default function AdminSummaryPage() {
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [directoryData, setDirectoryData] = useState<any>(null);
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  useEffect(() => {
    fetch("/api/member/directory")
      .then(res => res.json())
      .then(d => {
        setDirectoryData(d);
        setLoadingDirectory(false);
      })
      .catch(() => setLoadingDirectory(false));
  }, []);

  useEffect(() => {
    if (startMonth && endMonth) {
      setLoadingSummary(true);
      fetch(`/api/admin/summary?start=${startMonth}&end=${endMonth}`)
        .then(res => res.json())
        .then(d => {
          setSummaryData(d);
          setLoadingSummary(false);
        });
    } else {
      setSummaryData(null);
    }
  }, [startMonth, endMonth]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Summary Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Aggregate view of premiums, loans, and interest collection.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-4">
        <h2 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Filter by Date Range
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-6 mb-8 bg-slate-50 p-6 rounded-lg border border-slate-100">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Start Month/Year</label>
            <input type="month" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={startMonth} onChange={e => setStartMonth(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">End Month/Year</label>
            <input type="month" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={endMonth} onChange={e => setEndMonth(e.target.value)} />
          </div>
        </div>

        {loadingSummary ? (
          <div className="text-center text-slate-500 py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            Calculating aggregated summary...
          </div>
        ) : summaryData ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-emerald-900">Total Premium Collected</div>
              </div>
              <div className="text-3xl font-bold text-emerald-700 mt-2">₹{summaryData.totalPremiums.toFixed(2)}</div>
              <p className="text-xs text-emerald-600/80 mt-1">{summaryData.countPremiums} premium records found.</p>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-indigo-900">Total Principal Repaid</div>
              </div>
              <div className="text-3xl font-bold text-indigo-700 mt-2">₹{summaryData.totalPrincipalRepaid.toFixed(2)}</div>
              <p className="text-xs text-indigo-600/80 mt-1">From {summaryData.countInstallments} paid installments.</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-amber-900">Total Interest Earned</div>
              </div>
              <div className="text-3xl font-bold text-amber-700 mt-2">₹{summaryData.totalInterestCollected.toFixed(2)}</div>
              <p className="text-xs text-amber-600/80 mt-1">Aggregated from loan returns.</p>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-rose-900">Other Expenditures</div>
              </div>
              <div className="text-3xl font-bold text-rose-700 mt-2">₹{summaryData.totalExpenditures.toFixed(2)}</div>
              <p className="text-xs text-rose-600/80 mt-1">{summaryData.countExpenditures} recorded expenditures.</p>
            </div>

          </div>
        ) : (
          <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-xl border border-slate-100">
            <Search className="w-8 h-8 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">No Date Range Selected</p>
            <p className="text-sm mt-1">Select a start and end month above to view aggregated financial metrics.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Global Member NAV Directory
          </h2>
        </div>

        {loadingDirectory ? (
          <div className="p-8 text-center text-slate-500">Loading directory...</div>
        ) : !directoryData || directoryData.members?.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No members found.</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-xs">
                  <th className="p-4 pl-6 font-bold">Member Name</th>
                  <th className="p-4 font-bold">Base Premium Paid</th>
                  <th className="p-4 font-bold text-emerald-600">Dividend Share (Total: ₹{directoryData.dividendPerMember.toFixed(2)})</th>
                  <th className="p-4 pr-6 font-bold text-right text-indigo-700">Net Asset Value (NAV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directoryData.members.map((member: any) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{member.name}</span>
                        <span className="text-xs text-slate-500">@{member.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">₹{member.totalPremiumPaid.toFixed(2)}</td>
                    <td className="p-4 text-emerald-600 font-medium">+ ₹{member.dividendEarned.toFixed(2)}</td>
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
