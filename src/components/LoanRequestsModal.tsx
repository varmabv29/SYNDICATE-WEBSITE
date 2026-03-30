"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Send, AlertCircle, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

interface LoanRequest {
  id: string;
  userId: string;
  amount: number;
  monthYear: string;
  durationMonths: number;
  priority: string;
  remarks: string;
  createdAt: string;
  user: { name: string; username: string };
}

export default function LoanRequestsModal({ 
  isOpen, 
  onClose,
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    fetch("/api/shared/loan-requests")
      .then(res => res.json())
      .then(data => {
        if (data && data.requests) {
          setRequests(data.requests);
          setCurrentUserId(data.currentUserId);
        } else {
          setRequests(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, fetchRequests]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this loan request?")) return;
    
    // Optimistic UI update
    setRequests(prev => prev.filter(r => r.id !== id));
    
    const res = await fetch(`/api/member/loan-requests/${id}`, {
      method: "DELETE"
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to delete request: ${data.error || 'Unknown error'}`);
      fetchRequests(); // Revert
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-500" />
            Pending Loan Requests
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No Pending Requests</h3>
              <p className="text-slate-500 mt-1">There are currently no active loan requests in the system.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{req.user.name} (@{req.user.username})</h4>
                      <p className="text-sm text-slate-500">Requested on {formatDate(req.createdAt)}</p>
                      <p className="text-sm font-medium text-slate-700 mt-1">Duration: {req.durationMonths} Months</p>
                    </div>
                    <div className="flex items-start gap-4 text-right">
                      <div>
                        <div className="text-xl font-bold text-indigo-600">₹{req.amount.toFixed(2)}</div>
                        <div className="text-sm font-medium text-slate-600 mt-0.5">{req.monthYear}</div>
                      </div>
                      {req.userId === currentUserId && (
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          title="Delete Request"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <span className={`text-xs font-bold px-2.5 py-1 uppercase rounded-full tracking-wider ${
                      req.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                      req.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {req.priority} Priority
                    </span>
                    {req.remarks && (
                      <span className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3">
                        &ldquo;{req.remarks}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-white text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
