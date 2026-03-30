"use client";

import { useState, useEffect } from "react";
import { HandCoins, CheckCircle2, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Loan, Installment, UserInfo } from "@/types/models";

export default function LoansManagerPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ userId: "", principalAmount: "", interestRate: "1", durationMonths: "6", startDate: "" });
  const [filter, setFilter] = useState<"ACTIVE" | "SETTLED">("ACTIVE");

  const filteredLoans = loans.filter((l: Loan) => l.status === filter);

  const fetchData = async () => {
    setLoading(true);
    const [loanRes, userRes] = await Promise.all([
      fetch("/api/admin/loans"),
      fetch("/api/admin/users")
    ]);
    if (loanRes.ok) setLoans(await loanRes.json());
    if (userRes.ok) setUsers((await userRes.json()).filter((u: UserInfo) => u.role === "MEMBER"));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setFormData({ ...formData, userId: "", principalAmount: "", interestRate: "1" });
      fetchData();
    } else {
      alert("Failed to disburse loan");
    }
  };

  const togglePaidStatus = async (installmentId: string, currentStatus: string) => {
    const action = currentStatus === 'PAID' ? 'mark_unpaid' : 'mark_paid';
    const res = await fetch(`/api/admin/installments/${installmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (res.ok) {
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to update status: ${data.error || 'Unknown error'}`);
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (confirm("Are you sure you want to completely delete this loan? This will wipe its entire installment history. This action cannot be undone.")) {
      const res = await fetch(`/api/admin/loans/${loanId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        const { error } = await res.json();
        alert(`Failed to delete loan: ${error}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Loans & Repayments</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-indigo-500" />
              Disburse New Loan
            </h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleDisburse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Member</label>
                <select required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}>
                  <option value="" disabled>Choose a member...</option>
                  {users.map((u: UserInfo) => (
                    <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Principal Amount (₹)</label>
                <input required type="number" step="0.01" min="1" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.principalAmount} onChange={e => setFormData({...formData, principalAmount: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})}>
                  <option value="1">1% Fixed</option>
                  <option value="1.5">1.5% Fixed</option>
                  <option value="2">2% Fixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Months)</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: e.target.value})}>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="10">10 Months</option>
                  <option value="12">12 Months</option>
                  <option value="24">24 Months</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors">
                Disburse Funds
              </button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="flex gap-4 border-b border-slate-200">
            <button 
              onClick={() => setFilter('ACTIVE')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${filter === 'ACTIVE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Active Loans
            </button>
            <button 
              onClick={() => setFilter('SETTLED')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${filter === 'SETTLED' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Closed Loans
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading loans data...</div>
          ) : filteredLoans.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No loans found in this category.</div>
          ) : filteredLoans.map(loan => (
            <div key={loan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    {loan.user.name}
                    {loan.customId && (
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
                        {loan.customId}
                      </span>
                    )}
                    {loan.status === "FORECLOSED" && (
                      <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold uppercase">Foreclosed ({loan.foreclosureMonth})</span>
                    )}
                    {loan.status === "ACTIVE" && (
                      <button 
                        onClick={() => handleDeleteLoan(loan.id)}
                        className="ml-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        title="Delete Loan & Installments"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </h3>
                  <div className="text-sm text-slate-500">
                    Started {formatDate(loan.startDate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-900">₹{loan.principalAmount.toFixed(2)}</div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${loan.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {loan.status}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-100">
                      <th className="p-3 pl-4 font-medium">Month/Year</th>
                      <th className="p-3 font-medium">Opening Bal</th>
                      <th className="p-3 font-medium">Principal</th>
                      <th className="p-3 font-medium">Interest</th>
                      <th className="p-3 font-medium">Total EMI</th>
                      <th className="p-3 font-medium">Closing Bal</th>
                      <th className="p-3 pr-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let currentBalance = loan.principalAmount;
                      return loan.installments.map((inst: Installment) => {
                        const opening = currentBalance;
                        const closing = opening - inst.principalDue;
                        currentBalance = closing;
                        return (
                          <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 pl-4 font-medium text-slate-900">{inst.monthYear || formatDate(inst.dueDate)}</td>
                            <td className="p-3 text-slate-500">₹{opening.toFixed(2)}</td>
                            <td className="p-3 text-emerald-600">₹{inst.principalDue.toFixed(2)}</td>
                            <td className="p-3 text-rose-500">₹{inst.interestDue.toFixed(2)}</td>
                            <td className="p-3 font-bold text-slate-900">₹{inst.amountDue.toFixed(2)}</td>
                            <td className="p-3 text-slate-500">₹{Math.max(0, closing).toFixed(2)}</td>
                            <td className="p-3 pr-4 text-right">
                              <button 
                                onClick={() => togglePaidStatus(inst.id, inst.status)}
                                className={`text-xs px-3 py-1.5 rounded transition-colors inline-flex items-center justify-center gap-1 w-full max-w-[140px] ml-auto ${
                                  inst.status === 'PAID' 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium border border-emerald-200' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                                }`}
                              >
                                {inst.status === 'PAID' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3"/> Paid (Undo)
                                  </>
                                ) : (
                                  'Mark Paid'
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
