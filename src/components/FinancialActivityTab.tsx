"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Users,
  Calendar,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import DownloadDropdown from "@/components/DownloadDropdown";
import { formatDate } from "@/lib/format";

interface ActivityRow {
  type: string;
  date?: string;
  amount?: number;
  totalAmount?: number;
  memberName?: string;
  username?: string;
  description?: string;
  count?: number;
}

interface ActivityData {
  viewMode: string;
  types: string[];
  results: ActivityRow[];
  grandTotal: number;
  count: number;
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

const TYPE_OPTIONS = [
  { key: "premiums", label: "Collected Amount", color: "emerald" },
  { key: "principal", label: "Loans Paid", color: "indigo" },
  { key: "interest", label: "Interest Paid", color: "rose" },
];

function getQuickDate(preset: string): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { start: fmt(start), end: fmt(now) };
    }
    case "month":
      return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(now) };
    case "quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: fmt(new Date(now.getFullYear(), qMonth, 1)), end: fmt(now) };
    }
    case "year":
      return { start: fmt(new Date(now.getFullYear(), 0, 1)), end: fmt(now) };
    default:
      return { start: "", end: "" };
  }
}

export default function FinancialActivityTab({ isAdmin, members = [] }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["premiums", "principal", "interest"]);
  const [viewMode, setViewMode] = useState<"aggregated" | "individual">("aggregated");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleType = (key: string) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const applyPreset = (preset: string) => {
    const { start, end } = getQuickDate(preset);
    setStartDate(start);
    setEndDate(end);
  };

  const fetchData = useCallback(() => {
    if (selectedTypes.length === 0) {
      setData(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      types: selectedTypes.join(","),
      viewMode,
    });
    if (selectedUser) params.set("userId", selectedUser);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    fetch(`/api/shared/reports/activity?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedTypes, viewMode, selectedUser, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const downloadCSV = () => {
    if (!data) return;
    let csv = "";
    if (viewMode === "aggregated") {
      csv = "Type,Count,Total Amount (₹)\n";
      csv += data.results.map((r) => `${r.type},${r.count || 0},${(r.totalAmount || 0).toFixed(2)}`).join("\n");
      csv += `\nGRAND TOTAL,,${data.grandTotal.toFixed(2)}`;
    } else {
      csv = "#,Date,Type,Member,Description,Amount (₹)\n";
      csv += data.results.map((r, i) =>
        `${i + 1},${formatDate(r.date || null)},${r.type},${r.memberName || "-"},${r.description || "-"},${(r.amount || 0).toFixed(2)}`
      ).join("\n");
      csv += `\n,,,,GRAND TOTAL,${data.grandTotal.toFixed(2)}`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Financial_Activity_Report.csv"; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePDF = async () => {
    if (!data) return;
    const { downloadActivityPDF } = await import("@/lib/pdf-reports");
    downloadActivityPDF(data.results, data.grandTotal, data.viewMode, data.types);
  };

  return (
    <div>
      {/* Controls */}
      <div className="p-4 border-b border-slate-100 bg-amber-50/30 space-y-4">
        {/* Row 1: Transaction Types */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" />Transaction Types
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const active = selectedTypes.includes(opt.key);
              const colors: Record<string, string> = {
                emerald: active ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 border-emerald-200",
                indigo: active ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 border-indigo-200",
                rose: active ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 border-rose-200",
              };
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleType(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${colors[opt.color]}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: View Mode + Member + Date Range */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">View Mode</label>
            <button
              onClick={() => setViewMode(viewMode === "aggregated" ? "individual" : "aggregated")}
              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 transition-colors"
            >
              {viewMode === "aggregated" ? (
                <><ToggleLeft className="w-4 h-4 text-amber-500" /><span>Aggregated</span></>
              ) : (
                <><ToggleRight className="w-4 h-4 text-indigo-500" /><span>Individual</span></>
              )}
            </button>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5 inline mr-1" />Member
              </label>
              <select
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white min-w-[180px]"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name || m.username} (@{m.username})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
            <input type="date" className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
            <input type="date" className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="flex gap-1">
            {["week", "month", "quarter", "year"].map((p) => (
              <button key={p} onClick={() => applyPreset(p)} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                {p === "week" ? "This Week" : p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : "This Year"}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <DownloadDropdown
              onDownloadCSV={downloadCSV}
              onDownloadPDF={handlePDF}
              disabled={!data || data.results.length === 0}
              color="violet"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full mx-auto mb-4" />
          Loading activity data...
        </div>
      ) : selectedTypes.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-slate-300" />
          <span className="font-medium">Select at least one transaction type</span>
        </div>
      ) : !data || data.results.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-slate-300" />
          <span className="font-medium">No records found for the selected period</span>
          <span className="text-xs">Try adjusting the filters or date range.</span>
        </div>
      ) : viewMode === "aggregated" ? (
        <div className="overflow-x-auto sticky-header">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                <th className="p-4">Transaction Type</th>
                <th className="p-4 text-right">Count</th>
                <th className="p-4 text-right">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.results.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                      r.type.includes("Collected") ? "bg-emerald-50 text-emerald-700" :
                      r.type.includes("Principal") ? "bg-indigo-50 text-indigo-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>{r.type}</span>
                  </td>
                  <td className="p-4 text-right text-slate-600">{r.count}</td>
                  <td className="p-4 text-right font-bold text-slate-900">₹{(r.totalAmount || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100/80 border-t-2 border-slate-300">
                <td className="p-4 font-bold text-slate-900 uppercase text-xs tracking-wider">Grand Total</td>
                <td className="p-4" />
                <td className="p-4 text-right font-extrabold text-slate-900 text-base">₹{data.grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto sticky-header">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                <th className="p-4">#</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Member</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.results.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                  <td className="p-4 font-medium text-slate-800">{formatDate(r.date || null)}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.type.includes("Collected") ? "bg-emerald-50 text-emerald-700" :
                      r.type.includes("Principal") ? "bg-indigo-50 text-indigo-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>{r.type}</span>
                  </td>
                  <td className="p-4 text-slate-600">{r.memberName || "-"}</td>
                  <td className="p-4 text-slate-500 text-xs">{r.description || "-"}</td>
                  <td className="p-4 text-right font-bold text-slate-900">₹{(r.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100/80 border-t-2 border-slate-300">
                <td className="p-4" colSpan={5}>
                  <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Grand Total</span>
                </td>
                <td className="p-4 text-right font-extrabold text-slate-900 text-base">₹{data.grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
