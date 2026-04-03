"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Users, Calendar, Search, AlertCircle } from "lucide-react";
import DownloadDropdown from "@/components/DownloadDropdown";
import { formatDate } from "@/lib/format";

interface ProjectionRow {
  userId: string;
  memberName: string;
  username: string;
  baseContribution: number;
  loanInstallmentPrincipal: number;
  accruedInterest: number;
  totalDue: number;
  loanBreakdown: {
    loanId: string;
    principalAmount: number;
    interestRate: number;
    principalDue: number;
    interestDue: number;
    emiDue: number;
    monthYear: string;
  }[];
}

interface ProjectedData {
  targetMonthYear: string;
  baseContribution: number;
  projections: ProjectionRow[];
  grandTotal: {
    baseContribution: number;
    loanInstallmentPrincipal: number;
    accruedInterest: number;
    totalDue: number;
  };
}

interface MemberOption {
  id: string;
  name: string | null;
  username: string;
}

interface Props {
  isAdmin: boolean;
  members?: MemberOption[];
}

function getNextMonths(count: number) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(
      d.toLocaleString("default", { month: "short" }) + "-" + d.getFullYear()
    );
  }
  return months;
}

export default function ProjectedPaymentsTab({ isAdmin, members = [] }: Props) {
  const monthOptions = getNextMonths(6);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<ProjectedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ monthYear: selectedMonth });
    if (isAdmin) {
      params.set("userId", selectedUser === "all" ? "all" : selectedUser);
    }
    fetch(`/api/shared/reports/projected?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedMonth, selectedUser, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredMembers = members.filter(
    (m) =>
      (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    if (!data) return;
    const headers = "Member Name,Base Contribution (₹),Loan Principal (₹),Interest (₹),Total Due (₹)\n";
    const rows = data.projections
      .map((p) =>
        `${p.memberName},${p.baseContribution.toFixed(2)},${p.loanInstallmentPrincipal.toFixed(2)},${p.accruedInterest.toFixed(2)},${p.totalDue.toFixed(2)}`
      )
      .join("\n");
    const total = `\nGRAND TOTAL,${data.grandTotal.baseContribution.toFixed(2)},${data.grandTotal.loanInstallmentPrincipal.toFixed(2)},${data.grandTotal.accruedInterest.toFixed(2)},${data.grandTotal.totalDue.toFixed(2)}`;
    const blob = new Blob([headers + rows + total], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Projected_Payments_${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePDF = async () => {
    if (!data) return;
    const { downloadProjectedPDF } = await import("@/lib/pdf-reports");
    downloadProjectedPDF(data.projections, data.grandTotal, data.targetMonthYear, selectedUser === "all");
  };

  return (
    <div>
      {/* Controls */}
      <div className="p-4 border-b border-slate-100 bg-cyan-50/30 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />Target Month
          </label>
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5 inline mr-1" />Member
            </label>
            <select
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-white min-w-[200px]"
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setExpandedUser(null); }}
            >
              <option value="all">All Members</option>
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.username} (@{m.username})
                </option>
              ))}
            </select>
          </div>
        )}

        {isAdmin && members.length > 10 && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Search className="w-3.5 h-3.5 inline mr-1" />Search
            </label>
            <input
              type="text"
              placeholder="Filter members..."
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        <div className="ml-auto">
          <DownloadDropdown
            onDownloadCSV={downloadCSV}
            onDownloadPDF={handlePDF}
            disabled={!data || data.projections.length === 0}
            color="emerald"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-cyan-500 rounded-full mx-auto mb-4" />
          Calculating projections...
        </div>
      ) : !data || data.projections.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-slate-300" />
          <span className="font-medium">No records found for the selected period</span>
          <span className="text-xs">Try selecting a different month.</span>
        </div>
      ) : (
        <div className="overflow-x-auto sticky-header">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                <th className="p-4">#</th>
                <th className="p-4">Member Name</th>
                <th className="p-4 text-right">Base Contribution (₹)</th>
                <th className="p-4 text-right">Loan Principal (₹)</th>
                <th className="p-4 text-right">Interest (₹)</th>
                <th className="p-4 text-right">Total Due (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.projections.map((p, idx) => (
                <>
                  <tr
                    key={p.userId}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedUser(expandedUser === p.userId ? null : p.userId)}
                  >
                    <td className="p-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="p-4 font-medium text-slate-800">
                      {p.memberName}
                      {p.loanBreakdown.length > 0 && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600 font-bold">
                          {p.loanBreakdown.length} loan(s)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-emerald-600 font-semibold">₹{p.baseContribution.toFixed(2)}</td>
                    <td className="p-4 text-right text-indigo-600 font-semibold">₹{p.loanInstallmentPrincipal.toFixed(2)}</td>
                    <td className="p-4 text-right text-rose-500 font-semibold">₹{p.accruedInterest.toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-slate-900">₹{p.totalDue.toFixed(2)}</td>
                  </tr>
                  {expandedUser === p.userId && p.loanBreakdown.length > 0 && (
                    <tr key={`${p.userId}-detail`}>
                      <td colSpan={6} className="bg-slate-50 p-4 pl-12">
                        <div className="text-xs font-semibold text-slate-600 mb-2">Loan-wise Breakdown:</div>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-100/50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                <th className="p-2 pl-3 font-bold">Loan ID</th>
                                <th className="p-2 font-bold text-right">Principal Due</th>
                                <th className="p-2 font-bold text-right">Interest Due</th>
                                <th className="p-2 pr-3 font-bold text-right">EMI Due</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {p.loanBreakdown.map((lb) => (
                                <tr key={lb.loanId} className="hover:bg-slate-50/50">
                                  <td className="p-2 pl-3 font-medium text-indigo-700">{lb.loanId}</td>
                                  <td className="p-2 text-right text-slate-700">₹{lb.principalDue.toFixed(2)}</td>
                                  <td className="p-2 text-right text-rose-500">₹{lb.interestDue.toFixed(2)}</td>
                                  <td className="p-2 pr-3 text-right font-bold text-slate-900">₹{lb.emiDue.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {/* Grand Total Row */}
              <tr className="bg-slate-100/80 border-t-2 border-slate-300">
                <td className="p-4" />
                <td className="p-4 font-bold text-slate-900 uppercase text-xs tracking-wider">Grand Total</td>
                <td className="p-4 text-right font-bold text-emerald-700">₹{data.grandTotal.baseContribution.toFixed(2)}</td>
                <td className="p-4 text-right font-bold text-indigo-700">₹{data.grandTotal.loanInstallmentPrincipal.toFixed(2)}</td>
                <td className="p-4 text-right font-bold text-rose-600">₹{data.grandTotal.accruedInterest.toFixed(2)}</td>
                <td className="p-4 text-right font-extrabold text-slate-900 text-base">₹{data.grandTotal.totalDue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
