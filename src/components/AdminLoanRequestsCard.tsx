"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import LoanRequestsModal from "@/components/LoanRequestsModal";

export default function AdminLoanRequestsCard({ 
  pendingCount 
}: { 
  pendingCount: number 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 hover:border-amber-200 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500 text-white">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Loan Requests</p>
            <h3 className="text-2xl font-bold text-slate-900">{pendingCount}</h3>
          </div>
        </div>
      </button>

      <LoanRequestsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
