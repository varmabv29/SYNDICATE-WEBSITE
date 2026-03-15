"use client";

import { useState, useEffect } from "react";
import { Banknote, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function GroupLoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/member/loans/group")
      .then(res => res.json())
      .then(data => {
        setLoans(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch group loans:", err);
        setLoading(false);
      });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLoanId(expandedLoanId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Group Loans Ledger</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-indigo-500" />
            Active & Closed Group Loans
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading ledger...</div>
        ) : loans.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No loans found in the system.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {loans.map(loan => {
              const paidMonths = loan.installments.filter((i: any) => i.status === "PAID").length;
              const totalMonths = loan.installments.length;
              const remainingBalance = loan.installments
                .filter((i: any) => i.status === "PENDING")
                .reduce((sum: number, i: any) => sum + i.amountDue, 0);

              const isExpanded = expandedLoanId === loan.id;

              return (
                <div key={loan.id} className="group">
                  {/* Summary Row */}
                  <div 
                    onClick={() => toggleExpand(loan.id)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
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
                        </h3>
                        <div className="text-sm text-slate-500">
                          Borrowed: {formatDate(loan.startDate)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 flex-1 md:px-8">
                       <div>
                         <span className="block text-xs uppercase text-slate-400 font-bold mb-0.5">Loan Amount</span>
                         <span className="font-medium text-slate-900">₹{loan.principalAmount.toFixed(2)}</span>
                       </div>
                       <div>
                         <span className="block text-xs uppercase text-slate-400 font-bold mb-0.5">Tenure & Rate</span>
                         <span className="font-medium text-slate-900">{totalMonths} Mo. @ {loan.interestRate}%</span>
                       </div>
                       <div>
                         <span className="block text-xs uppercase text-slate-400 font-bold mb-0.5">Progress</span>
                         <span className="font-medium text-slate-900">{paidMonths} / {totalMonths} Paid</span>
                       </div>
                       <div>
                         <span className="block text-xs uppercase text-slate-400 font-bold mb-0.5">Remaining Bal</span>
                         <span className="font-medium text-indigo-700">₹{remainingBalance.toFixed(2)}</span>
                       </div>
                    </div>
                  </div>

                  {/* Expanded Schedule Schedule */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 pl-4 md:pl-12">
                      <h4 className="text-sm font-semibold text-slate-800 mb-3 px-2">Month-Wise Repayment Schedule:</h4>
                      <div className="overflow-x-auto w-full border border-slate-200 rounded-lg bg-white">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead>
                            <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                              <th className="p-3 pl-4 font-bold">Month/Year</th>
                              <th className="p-3 font-bold">Opening Bal</th>
                              <th className="p-3 font-bold">Principal</th>
                              <th className="p-3 font-bold">Interest</th>
                              <th className="p-3 font-bold">Total EMI</th>
                              <th className="p-3 font-bold">Closing Bal</th>
                              <th className="p-3 pr-4 font-bold text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              let currentBalance = loan.principalAmount;
                              return loan.installments.map((inst: any) => {
                                const opening = currentBalance;
                                const closing = opening - inst.principalDue;
                                currentBalance = closing;
                                return (
                                  <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 pl-4 font-medium text-slate-800">{inst.monthYear || formatDate(inst.dueDate)}</td>
                                    <td className="p-3 text-slate-500">₹{opening.toFixed(2)}</td>
                                    <td className="p-3 text-emerald-600">₹{inst.principalDue.toFixed(2)}</td>
                                    <td className="p-3 text-rose-500">₹{inst.interestDue.toFixed(2)}</td>
                                    <td className="p-3 font-bold text-slate-900">₹{inst.amountDue.toFixed(2)}</td>
                                    <td className="p-3 text-slate-500">₹{Math.max(0, closing).toFixed(2)}</td>
                                    <td className="p-3 pr-4 text-right">
                                      {inst.status === 'PAID' ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] bg-emerald-50 font-bold uppercase px-2 py-0.5 rounded">
                                          <CheckCircle2 className="w-3 h-3"/> Paid
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-amber-600 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded">
                                          Pending
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
