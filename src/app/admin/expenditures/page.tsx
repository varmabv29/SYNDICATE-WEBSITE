"use client";

import { useState, useEffect } from "react";
import { Receipt, Trash2, Pencil, X, Check } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function ExpendituresPage() {
  const [expenditures, setExpenditures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ amount: "", date: "", monthYear: "", remarks: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ amount: "", date: "", monthYear: "", remarks: "" });

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/expenditures");
    if (res.ok) setExpenditures(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/expenditures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setFormData({ amount: "", date: "", monthYear: "", remarks: "" });
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to add expenditure");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this expenditure record?")) {
      const res = await fetch(`/api/admin/expenditures/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    }
  };

  const startEdit = (exp: any) => {
    setEditingId(exp.id);
    setEditData({
      amount: exp.amount.toString(),
      date: new Date(exp.date).toISOString().split("T")[0],
      monthYear: exp.monthYear,
      remarks: exp.remarks || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ amount: "", date: "", monthYear: "", remarks: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const res = await fetch(`/api/admin/expenditures/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData)
    });

    if (res.ok) {
      setEditingId(null);
      setEditData({ amount: "", date: "", monthYear: "", remarks: "" });
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to update expenditure");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Other Expenditures</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="xl:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-500" />
              Log Expenditure
            </h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input required type="number" step="0.01" min="1" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input required type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all bg-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month-Year Mapping</label>
                  <input required type="month" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all bg-white" value={formData.monthYear} onChange={e => setFormData({...formData, monthYear: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea rows={3} placeholder="Describe the expenditure..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
              </div>
              
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg transition-colors">
                Save Record
              </button>
            </form>
          </div>
        </div>

        {/* List Panel */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             {loading ? (
                <div className="p-8 text-center text-slate-500">Loading expenditures...</div>
              ) : expenditures.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No expenditures recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Mapping</th>
                        <th className="p-4 font-medium">Remarks</th>
                        <th className="p-4 font-medium">Amount</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenditures.map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                          {editingId === exp.id ? (
                            <>
                              <td className="p-3">
                                <input type="date" className="w-full px-2 py-1.5 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} />
                              </td>
                              <td className="p-3">
                                <input type="month" className="w-full px-2 py-1.5 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white" value={editData.monthYear} onChange={e => setEditData({...editData, monthYear: e.target.value})} />
                              </td>
                              <td className="p-3">
                                <input type="text" className="w-full px-2 py-1.5 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400 outline-none" value={editData.remarks} onChange={e => setEditData({...editData, remarks: e.target.value})} />
                              </td>
                              <td className="p-3">
                                <input type="number" step="0.01" min="0" className="w-24 px-2 py-1.5 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400 outline-none" value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} />
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={saveEdit} className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors" title="Save">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={cancelEdit} className="p-1.5 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors" title="Cancel">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-4 text-slate-900">{formatDate(exp.date)}</td>
                              <td className="p-4 text-slate-500 font-mono text-xs">{exp.monthYear}</td>
                              <td className="p-4 text-slate-600 truncate max-w-[200px]" title={exp.remarks}>{exp.remarks || '-'}</td>
                              <td className="p-4 font-bold text-rose-600">₹{exp.amount.toFixed(2)}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => startEdit(exp)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(exp.id)} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
