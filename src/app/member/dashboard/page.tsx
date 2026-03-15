"use client";

import { useState, useEffect } from "react";
import { HandCoins, TrendingUp, CreditCard, History, CheckCircle2, Clock, CheckIcon, Search, Download, AlertTriangle, Receipt } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function MemberDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ACTIVE" | "SETTLED" | "FORECLOSED">("ACTIVE");

  // Summary filtering states
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchDashboardData = () => {
    fetch("/api/member/dashboard")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (startMonth && endMonth) {
      setLoadingSummary(true);
      fetch(`/api/member/summary?start=${startMonth}&end=${endMonth}`)
        .then(res => res.json())
        .then(d => {
          setSummaryData(d);
          setLoadingSummary(false);
        });
    } else {
      setSummaryData(null);
    }
  }, [startMonth, endMonth]);



  const handleDownloadSchedule = (loan: any) => {
    // Basic CSV download stub for the schedule
    const headers = "Month/Year,Opening Balance,Principal,Interest,Total EMI,Closing Balance,Status\n";
    let currentBalance = loan.principalAmount;
    
    const rows = loan.installments.map((inst: any) => {
      const opening = currentBalance;
      const closing = opening - inst.principalDue;
      currentBalance = closing;
      return `${inst.monthYear},${opening.toFixed(2)},${inst.principalDue.toFixed(2)},${inst.interestDue.toFixed(2)},${inst.amountDue.toFixed(2)},${Math.max(0, closing).toFixed(2)},${inst.status}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Loan_Schedule_${loan.id}.csv`;
    a.click();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your financial dashboard...</div>;
  if (!data || data.error) return <div className="p-8 text-center text-rose-500">Error loading dashboard</div>;

  const { userName, summary, premiums, loans } = data;
  const filteredLoans = loans.filter((l: any) => l.status === filter || (filter === "SETTLED" && l.status === "FORECLOSED"));
  
  let upcomingInstallment = null;
  const activeLoans = loans.filter((l: any) => l.status === "ACTIVE");
  let totalBorrowed = 0;
  let totalRepaid = 0;

  activeLoans.forEach((loan: any) => {
    totalBorrowed += loan.principalAmount;
    loan.installments.forEach((inst: any) => {
      if (inst.status === "PAID") totalRepaid += inst.principalDue;
    });
  });

  const remainingBalance = totalBorrowed - totalRepaid;

  if (activeLoans.length > 0) {
    const allPending = activeLoans.flatMap((l: any) => l.installments.filter((i: any) => i.status === "PENDING"));
    if (allPending.length > 0) {
      allPending.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      upcomingInstallment = allPending[0];
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hello, {userName} 👋</h1>
      
      {/* Top Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {/* NAV Card */}
        <div className="bg-indigo-600 rounded-xl border border-indigo-700 p-6 shadow-sm text-white">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-medium text-indigo-200">Net Asset Value</h2>
             <div className="p-2 rounded-lg bg-indigo-500 text-white">
               <TrendingUp className="w-5 h-5" />
             </div>
           </div>
           <div className="text-3xl font-bold">₹{summary.nav.toFixed(2)}</div>
           <p className="text-xs text-indigo-200 mt-1 flex justify-between">
             <span>Premium: ₹{summary.totalPremiumsPaid.toFixed(0)}</span>
             <span className="font-bold text-white">+ Div: ₹{summary.dividendEarned.toFixed(0)}</span>
           </p>
         </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-medium text-slate-500">Total Contributions</h2>
             <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
               <CreditCard className="w-5 h-5" />
             </div>
           </div>
           <div className="text-3xl font-bold text-slate-900">₹{summary.totalPremiumsPaid.toFixed(2)}</div>
           <p className="text-sm text-slate-500 mt-1">{premiums.length} total payments made</p>
         </div>

         <div className="bg-rose-50 rounded-xl border border-rose-200 p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-medium text-rose-800">Group Expenditures</h2>
             <div className="p-2 rounded-lg bg-rose-200 text-rose-700">
               <Receipt className="w-5 h-5" />
             </div>
           </div>
           <div className="text-3xl font-bold text-rose-700">₹{summary.totalExpenditures.toFixed(2)}</div>
           <p className="text-xs text-rose-600/80 mt-1">Deducted from global cash pool</p>
         </div>
         
         <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-medium text-slate-500">Active Loans Balance</h2>
             <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
               <HandCoins className="w-5 h-5" />
             </div>
           </div>
           <div className="text-3xl font-bold text-slate-900">₹{remainingBalance.toFixed(2)}</div>
           <div className="text-xs text-slate-500 mt-1 flex justify-between">
             <span>Borrowed: ₹{totalBorrowed.toFixed(0)}</span>
             <span className="text-emerald-600 font-medium">Repaid: ₹{totalRepaid.toFixed(0)}</span>
           </div>
         </div>
         
         <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm outline outline-2 outline-indigo-500 outline-offset-[-2px]">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-medium text-indigo-900">Next Upcoming Payment</h2>
             <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md">
               <Clock className="w-5 h-5" />
             </div>
           </div>
           {upcomingInstallment ? (
             <>
               <div className="text-3xl font-bold text-slate-900">₹{upcomingInstallment.amountDue.toFixed(2)}</div>
               <p className="text-sm text-slate-600 font-medium mt-1">Due {formatDate(upcomingInstallment.dueDate)}</p>
             </>
           ) : (
             <>
               <div className="text-3xl font-bold text-slate-400">₹-</div>
               <p className="text-sm text-slate-500 mt-1">No pending payments</p>
             </>
           )}
         </div>
      </div>

      {/* Date Range Summary Dashboard */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-8">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500" />
          Monthly Financial Report Picker
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Month</label>
            <input type="month" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={startMonth} onChange={e => setStartMonth(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">End Month</label>
            <input type="month" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={endMonth} onChange={e => setEndMonth(e.target.value)} />
          </div>
        </div>

        {loadingSummary ? (
          <div className="text-center text-slate-500 py-4">Calculating summary...</div>
        ) : summaryData ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
            <div>
              <div className="text-sm font-medium text-slate-500">Collected Premium</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">₹{summaryData.totalPremiums}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Principal Repaid</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">₹{summaryData.totalPrincipalRepaid.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Interest Paid</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">₹{summaryData.totalInterestCollected.toFixed(2)}</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 py-4 text-sm bg-slate-50 rounded-lg border border-slate-100">
            Select a start and end month to view filtered financial metrics.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 mt-8">
        {/* Loans Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-slate-200 bg-slate-50 p-4 flex justify-between items-center gap-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Month-Wise Repayment Schedule
            </h2>
            <div className="flex bg-slate-200/60 p-1 rounded-lg">
              <button 
                onClick={() => setFilter('ACTIVE')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'ACTIVE' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setFilter('SETTLED')} // SETTLED includes FORECLOSED in visual filtering logic
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'SETTLED' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Closed
              </button>
            </div>
          </div>
          <div className="p-0 overflow-y-auto w-full">
             {filteredLoans.length === 0 ? (
               <div className="p-6 text-center text-slate-500 font-medium">No loans found in this category.</div>
             ) : filteredLoans.map((loan: any) => {
               let runningBalance = loan.principalAmount;
               return (
                 <div key={loan.id} className="border-b-4 border-slate-200 last:border-0">
                   <div className="p-4 bg-slate-50/50 flex items-center justify-between border-b border-slate-200">
                     <div>
                       <div className="font-bold text-slate-900">Loan Principal: ₹{loan.principalAmount.toFixed(2)}</div>
                       {loan.status === "FORECLOSED" && loan.settlementAmount && (
                         <div className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
                           <AlertTriangle className="w-3.5 h-3.5" /> Foreclosed in {loan.foreclosureMonth} (Settled for ₹{loan.settlementAmount})
                         </div>
                       )}
                     </div>
                     <div className="flex items-center gap-3">
                       <div className={`text-xs font-bold px-3 py-1 uppercase tracking-wider rounded-full ${loan.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                         {loan.status}
                       </div>
                       <button onClick={() => handleDownloadSchedule(loan)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition" title="Download Schedule">
                         <Download className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                   
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead>
                         <tr className="bg-slate-100/50 text-slate-500">
                           <th className="p-3 pl-4 font-medium">Month/Year</th>
                           <th className="p-3 font-medium">Opening Bal</th>
                           <th className="p-3 font-medium">Principal</th>
                           <th className="p-3 font-medium">Interest</th>
                           <th className="p-3 font-medium">Total EMI</th>
                           <th className="p-3 font-medium">Closing Bal</th>
                           <th className="p-3 pr-4 font-medium text-right">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {loan.installments.map((inst: any) => {
                           const opening = runningBalance;
                           const closing = opening - inst.principalDue;
                           runningBalance = closing;
                           return (
                             <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                               <td className="p-3 pl-4 font-medium text-slate-900">{inst.monthYear || formatDate(inst.dueDate)}</td>
                               <td className="p-3 text-slate-500">₹{opening.toFixed(2)}</td>
                               <td className="p-3 text-emerald-600">₹{inst.principalDue.toFixed(2)}</td>
                               <td className="p-3 text-rose-500">₹{inst.interestDue.toFixed(2)}</td>
                               <td className="p-3 font-bold text-slate-900">₹{inst.amountDue.toFixed(2)}</td>
                               <td className="p-3 text-slate-500">₹{Math.max(0, closing).toFixed(2)}</td>
                               <td className="p-3 pr-4 text-right">
                                 {inst.status === "PAID" ? (
                                   <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded">
                                     <CheckIcon className="w-3 h-3" /> Paid
                                   </span>
                                 ) : (
                                   <span className="text-amber-500 font-bold text-[10px] uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded">Pending</span>
                                 )}
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}
