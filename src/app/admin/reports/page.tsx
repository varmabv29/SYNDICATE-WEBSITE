"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileBarChart,
  Download,
  Search,
  CreditCard,
  Banknote,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Users,
  TrendingUp,
  IndianRupee,
  Filter,
  BarChart3,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import type { UserInfo, Installment } from "@/types/models";
import DownloadDropdown from "@/components/DownloadDropdown";
import ProjectedPaymentsTab from "@/components/ProjectedPaymentsTab";
import FinancialActivityTab from "@/components/FinancialActivityTab";
import type { MonthWisePaymentRow } from "@/lib/pdf-reports";

interface PremiumRow {
  id: string;
  amount: number;
  datePaid: string;
  user: { name: string; username: string };
}

interface LoanRow {
  id: string;
  customId: string;
  principalAmount: number;
  interestRate: number;
  startDate: string;
  status: string;
  foreclosureMonth: string | null;
  settlementAmount: number | null;
  user: { name: string; username: string };
  installments: Installment[];
}

interface PaidInstallmentRow {
  id: string;
  monthYear: string;
  amountPaid: number;
  interestPaid: number;
  paidDate: string | null;
  loan: {
    customId: string;
    principalAmount: number;
    user: { name: string; username: string };
  };
}

interface ReportData {
  targetUser: { name: string; username: string };
  summary: {
    totalPremiums: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    totalEmiPaid: number;
    totalLoans: number;
    activeLoans: number;
  };
  premiums: PremiumRow[];
  loans: LoanRow[];
  paidInstallments: PaidInstallmentRow[];
}

type TabKey = "premiums" | "loans" | "payments" | "projected" | "activity";

export default function AdminReportsPage() {
  const [members, setMembers] = useState<UserInfo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("premiums");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Fetch members list
  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((users) => {
        const memberList = users.filter((u: UserInfo) => u.role === "MEMBER");
        setMembers(memberList);
        setSelectedUserId("all");
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, []);

  const fetchReport = useCallback(() => {
    if (!selectedUserId) return;
    setLoading(true);
    const params = new URLSearchParams({ userId: selectedUserId });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    fetch(`/api/shared/reports?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedUserId, startDate, endDate]);

  const monthWisePayments = useMemo(() => {
    if (!report) return [];

    const agg: Record<string, MonthWisePaymentRow> = {};

    const getMonthKey = (dateStr: string) => {
      const d = new Date(dateStr);
      const mmm = d.toLocaleString("en-US", { month: "short" });
      const yyyy = d.getFullYear();
      return { label: `${mmm}-${yyyy}`, timestamp: new Date(yyyy, d.getMonth(), 1).getTime() };
    };

    report.premiums.forEach((p) => {
      const { label, timestamp } = getMonthKey(p.datePaid);
      const key = `${p.user.username}_${label}`;
      if (!agg[key]) {
        agg[key] = {
          memberId: p.user.username,
          memberName: p.user.name,
          username: p.user.username,
          monthYear: label,
          dateObj: timestamp,
          premium: 0,
          principal: 0,
          interest: 0,
          total: 0,
        };
      }
      agg[key].premium += p.amount;
    });

    report.paidInstallments.forEach((i) => {
      const label = i.monthYear;
      // Convert "Oct-2025" or similar format to valid timestamp.
      const d = new Date(label.replace("-", " "));
      const timestamp = isNaN(d.getTime()) ? 0 : new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const key = `${i.loan.user.username}_${label}`;
      if (!agg[key]) {
        agg[key] = {
          memberId: i.loan.user.username,
          memberName: i.loan.user.name,
          username: i.loan.user.username,
          monthYear: label,
          dateObj: timestamp,
          premium: 0,
          principal: 0,
          interest: 0,
          total: 0,
        };
      }
      const prin = i.amountPaid - i.interestPaid;
      agg[key].principal += prin;
      agg[key].interest += i.interestPaid;
    });

    const results = Object.values(agg).map((row) => {
      row.premium = Math.ceil(row.premium);
      row.principal = Math.ceil(row.principal);
      row.interest = Math.ceil(row.interest);
      row.total = row.premium + row.principal + row.interest;
      return row;
    });

    return results.sort((a, b) => {
      if (a.memberName < b.memberName) return -1;
      if (a.memberName > b.memberName) return 1;
      return a.dateObj - b.dateObj;
    });
  }, [report]);

  useEffect(() => {
    if (selectedUserId) {
      fetchReport();
    }
  }, [selectedUserId, startDate, endDate, fetchReport]);

  // ─── Download Helpers ───
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // CSV generators
  const downloadPremiumCSV = () => {
    if (!report) return;
    let runningTotal = 0;
    const headers = "Date Paid,Amount (₹),Running Total (₹)\n";
    const rows = report.premiums
      .map((p) => {
        runningTotal += p.amount;
        return `${formatDate(p.datePaid)},${p.amount.toFixed(2)},${runningTotal.toFixed(2)}`;
      })
      .join("\n");
    downloadCSV(headers + rows, `Premium_Statement_${report.targetUser.username}.csv`);
  };

  const downloadMonthWiseCSV = () => {
    if (!monthWisePayments.length) return;
    const headers = "Member Name,Payment Month,Monthly Premium (₹),Loan Installment (₹),Interest Paid (₹),Total Paid (₹)\n";
    const rows = monthWisePayments
      .map((row) => {
        return `${row.memberName},${row.monthYear},${row.premium.toFixed(2)},${row.principal.toFixed(2)},${row.interest.toFixed(2)},${row.total.toFixed(2)}`;
      })
      .join("\n");
    downloadCSV(headers + rows, `Month_Wise_Payments_${report?.targetUser.username || "all"}.csv`);
  };

  const downloadLoanCSV = (loan: LoanRow) => {
    const headers = "Month/Year,Opening Balance,Principal,Interest,Total EMI,Closing Balance,Status\n";
    let balance = loan.principalAmount;
    const rows = loan.installments
      .map((inst) => {
        const opening = balance;
        const closing = opening - inst.principalDue;
        balance = closing;
        return `${inst.monthYear},${opening.toFixed(2)},${inst.principalDue.toFixed(2)},${inst.interestDue.toFixed(2)},${inst.amountDue.toFixed(2)},${Math.max(0, closing).toFixed(2)},${inst.status}`;
      })
      .join("\n");
    downloadCSV(headers + rows, `Loan_${loan.customId}_Schedule.csv`);
  };

  // PDF generators (dynamic import to avoid SSR issues)
  const handlePremiumPDF = async () => {
    if (!report) return;
    const { downloadPremiumPDF } = await import("@/lib/pdf-reports");
    downloadPremiumPDF(report.premiums, report.summary, report.targetUser.username, report.targetUser.name);
  };

  const handleMonthWisePDF = async () => {
    if (!report) return;
    const { downloadMonthWisePDF } = await import("@/lib/pdf-reports");
    downloadMonthWisePDF(monthWisePayments, report.summary, report.targetUser.username, report.targetUser.name);
  };

  const handleLoanPDF = async (loan: LoanRow) => {
    if (!report) return;
    const { downloadLoanPDF } = await import("@/lib/pdf-reports");
    downloadLoanPDF(loan, report.summary, report.targetUser.username, report.targetUser.name);
  };

  const tabs: { key: TabKey; label: string; icon: typeof CreditCard }[] = [
    { key: "premiums", label: "Premium Statement", icon: CreditCard },
    { key: "loans", label: "Loan Statement", icon: Banknote },
    { key: "payments", label: "Month-wise Payments", icon: CalendarCheck },
    { key: "projected", label: "Future Payments", icon: TrendingUp },
    { key: "activity", label: "Financial Activity", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Financial Reports
        </h1>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-500" />
            Report Filters
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Users className="w-4 h-4 inline mr-1 text-slate-400" />
                Select Member
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={membersLoading}
              >
                {membersLoading ? (
                  <option>Loading members...</option>
                ) : (
                  <>
                    <option value="all">All Members</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (@{m.username})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {report && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20">
            <div className="text-xs font-medium text-emerald-100 uppercase tracking-wider mb-1">Total Premiums</div>
            <div className="text-xl font-bold">₹{report.summary.totalPremiums.toFixed(0)}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-500/20">
            <div className="text-xs font-medium text-indigo-100 uppercase tracking-wider mb-1">Principal Repaid</div>
            <div className="text-xl font-bold">₹{report.summary.totalPrincipalPaid.toFixed(0)}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-lg shadow-amber-500/20">
            <div className="text-xs font-medium text-amber-100 uppercase tracking-wider mb-1">Interest Paid</div>
            <div className="text-xl font-bold">₹{report.summary.totalInterestPaid.toFixed(0)}</div>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-4 text-white shadow-lg shadow-violet-500/20">
            <div className="text-xs font-medium text-violet-100 uppercase tracking-wider mb-1">Total EMI Paid</div>
            <div className="text-xl font-bold">₹{report.summary.totalEmiPaid.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Loans</div>
            <div className="text-xl font-bold text-slate-900">{report.summary.totalLoans}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Active Loans</div>
            <div className="text-xl font-bold text-emerald-600">{report.summary.activeLoans}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-indigo-500" />
            {report?.targetUser
              ? `${report.targetUser.name}'s Reports`
              : "Reports"}
          </h2>
          <div className="flex bg-slate-200/60 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${activeTab === tab.key
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full mx-auto mb-4" />
            Loading report data...
          </div>
        ) : !report ? (
          <div className="p-12 text-center text-slate-500">
            Select a member to view their reports.
          </div>
        ) : (
          <>
            {/* Premium Statement Tab */}
            {activeTab === "premiums" && (
              <div>
                <div className="p-3 border-b border-slate-100 bg-emerald-50/30 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    {report.premiums.length} premium record(s) found
                  </span>
                  <DownloadDropdown
                    onDownloadCSV={downloadPremiumCSV}
                    onDownloadPDF={handlePremiumPDF}
                    disabled={report.premiums.length === 0}
                    color="emerald"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                        <th className="p-4">#</th>
                        <th className="p-4">Date Paid</th>
                        <th className="p-4">Amount (₹)</th>
                        <th className="p-4">Running Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.premiums.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-8 text-center text-slate-500"
                          >
                            No premium records found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          let runningTotal = 0;
                          return report.premiums.map((p, idx) => {
                            runningTotal += p.amount;
                            return (
                              <tr
                                key={p.id}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="p-4 text-slate-400 font-mono text-xs">
                                  {idx + 1}
                                </td>
                                <td className="p-4 font-medium text-slate-800">
                                  {formatDate(p.datePaid)}
                                  {selectedUserId === "all" && (
                                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                                      {p.user.name}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-emerald-600 font-bold">
                                  ₹{p.amount.toFixed(2)}
                                </td>
                                <td className="p-4 font-bold text-slate-900">
                                  ₹{runningTotal.toFixed(2)}
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Loan Statement Tab */}
            {activeTab === "loans" && (
              <div>
                <div className="p-3 border-b border-slate-100 bg-indigo-50/30">
                  <span className="text-sm font-medium text-slate-600">
                    {report.loans.length} loan(s) found
                  </span>
                </div>
                {report.loans.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No loans found for this member.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {report.loans.map((loan) => {
                      const paidMonths = loan.installments.filter(
                        (i) => i.status === "PAID"
                      ).length;
                      const totalMonths = loan.installments.length;
                      const remainingBal = loan.installments
                        .filter((i) => i.status === "PENDING")
                        .reduce((s, i) => s + i.amountDue, 0);
                      const isExpanded = expandedLoanId === loan.id;

                      return (
                        <div key={loan.id} className="group">
                          <div
                            onClick={() =>
                              setExpandedLoanId(
                                isExpanded ? null : loan.id
                              )
                            }
                            className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                  Loan {loan.customId}
                                  {selectedUserId === "all" && (
                                    <span className="text-sm font-normal text-slate-500">
                                      ({loan.user.name})
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${loan.status === "ACTIVE"
                                      ? "bg-amber-100 text-amber-700"
                                      : loan.status === "FORECLOSED"
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-emerald-100 text-emerald-700"
                                      }`}
                                  >
                                    {loan.status}
                                  </span>
                                </h3>
                                <div className="text-xs text-slate-500">
                                  Started{" "}
                                  {formatDate(loan.startDate)} •
                                  ₹{loan.principalAmount.toFixed(0)} @{" "}
                                  {loan.interestRate}%
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm flex-1 md:px-8">
                              <div>
                                <span className="block text-[10px] uppercase text-slate-400 font-bold">
                                  Progress
                                </span>
                                <span className="font-medium text-slate-900">
                                  {paidMonths}/{totalMonths} Paid
                                </span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase text-slate-400 font-bold">
                                  Remaining
                                </span>
                                <span className="font-medium text-indigo-700">
                                  ₹{remainingBal.toFixed(0)}
                                </span>
                              </div>
                              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                                <DownloadDropdown
                                  onDownloadCSV={() => downloadLoanCSV(loan)}
                                  onDownloadPDF={() => handleLoanPDF(loan)}
                                  color="indigo"
                                  compact
                                />
                              </div>
                            </div>
                          </div>

                          {/* Expanded installments table */}
                          {isExpanded && (
                            <div className="bg-slate-50 border-t border-slate-100 p-4 pl-4 md:pl-12">
                              <h4 className="text-sm font-semibold text-slate-800 mb-3 px-2">
                                Month-Wise Repayment Schedule:
                              </h4>
                              <div className="overflow-x-auto w-full border border-slate-200 rounded-lg bg-white">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                  <thead>
                                    <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                                      <th className="p-3 pl-4 font-bold">
                                        Month/Year
                                      </th>
                                      <th className="p-3 font-bold">
                                        Opening Bal
                                      </th>
                                      <th className="p-3 font-bold">
                                        Principal
                                      </th>
                                      <th className="p-3 font-bold">
                                        Interest
                                      </th>
                                      <th className="p-3 font-bold">
                                        Total EMI
                                      </th>
                                      <th className="p-3 font-bold">
                                        Closing Bal
                                      </th>
                                      <th className="p-3 pr-4 font-bold text-right">
                                        Status
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                      let currentBalance =
                                        loan.principalAmount;
                                      return loan.installments.map(
                                        (inst) => {
                                          const opening = currentBalance;
                                          const closing =
                                            opening - inst.principalDue;
                                          currentBalance = closing;
                                          return (
                                            <tr
                                              key={inst.id}
                                              className="hover:bg-slate-50/50 transition-colors"
                                            >
                                              <td className="p-3 pl-4 font-medium text-slate-800">
                                                {inst.monthYear ||
                                                  formatDate(inst.dueDate)}
                                              </td>
                                              <td className="p-3 text-slate-500">
                                                ₹{opening.toFixed(2)}
                                              </td>
                                              <td className="p-3 text-emerald-600">
                                                ₹
                                                {inst.principalDue.toFixed(
                                                  2
                                                )}
                                              </td>
                                              <td className="p-3 text-rose-500">
                                                ₹
                                                {inst.interestDue.toFixed(
                                                  2
                                                )}
                                              </td>
                                              <td className="p-3 font-bold text-slate-900">
                                                ₹{inst.amountDue.toFixed(2)}
                                              </td>
                                              <td className="p-3 text-slate-500">
                                                ₹
                                                {Math.max(
                                                  0,
                                                  closing
                                                ).toFixed(2)}
                                              </td>
                                              <td className="p-3 pr-4 text-right">
                                                {inst.status === "PAID" ? (
                                                  <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] bg-emerald-50 font-bold uppercase px-2 py-0.5 rounded">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Paid
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] text-amber-600 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded">
                                                    Pending
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        }
                                      );
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
            )}

            {/* Month-wise Payments Tab */}
            {activeTab === "payments" && (
              <div>
                <div className="p-3 border-b border-slate-100 bg-violet-50/30 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    {monthWisePayments.length} monthly aggregate(s) found
                  </span>
                  <DownloadDropdown
                    onDownloadCSV={downloadMonthWiseCSV}
                    onDownloadPDF={handleMonthWisePDF}
                    disabled={monthWisePayments.length === 0}
                    color="violet"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                        <th className="p-4">#</th>
                        <th className="p-4">Member Name/ID</th>
                        <th className="p-4">Payment Month</th>
                        <th className="p-4">Monthly Premium (₹)</th>
                        <th className="p-4">Loan Installment (₹)</th>
                        <th className="p-4">Interest Paid (₹)</th>
                        <th className="p-4">Total Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthWisePayments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-8 text-center text-slate-500"
                          >
                            No payment records found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        monthWisePayments.map((row, idx) => (
                          <tr
                            key={`${row.username}-${row.monthYear}`}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-4 text-slate-400 font-mono text-xs">
                              {idx + 1}
                            </td>
                            <td className="p-4 font-medium text-slate-800">
                              {row.memberName}
                              <div className="text-xs text-slate-500 font-normal">
                                @{row.username}
                              </div>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">
                              {row.monthYear}
                            </td>
                            <td className="p-4 text-emerald-600 font-medium">
                              ₹{row.premium.toFixed(2)}
                            </td>
                            <td className="p-4 text-indigo-600 font-medium">
                              ₹{row.principal.toFixed(2)}
                            </td>
                            <td className="p-4 text-rose-500 font-medium">
                              ₹{row.interest.toFixed(2)}
                            </td>
                            <td className="p-4 font-bold text-slate-900">
                              ₹{row.total.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Projected Payments Tab */}
            {activeTab === "projected" && (
              <ProjectedPaymentsTab
                isAdmin={true}
                members={members.map((m) => ({ id: m.id, name: m.name, username: m.username }))}
              />
            )}

            {/* Financial Activity Tab */}
            {activeTab === "activity" && (
              <FinancialActivityTab
                isAdmin={true}
                members={members.map((m) => ({ id: m.id, name: m.name, username: m.username }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
