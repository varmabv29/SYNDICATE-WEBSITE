"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";

interface DownloadDropdownProps {
  onDownloadCSV: () => void;
  onDownloadPDF: () => void;
  disabled?: boolean;
  color?: "emerald" | "indigo" | "violet";
  label?: string;
  compact?: boolean;
}

const buttonStyles = {
  emerald: "bg-emerald-600 hover:bg-emerald-700",
  indigo: "bg-indigo-600 hover:bg-indigo-700",
  violet: "bg-violet-600 hover:bg-violet-700",
};

const compactButtonStyles = {
  emerald: "bg-emerald-50 hover:bg-emerald-100 text-emerald-600",
  indigo: "bg-indigo-50 hover:bg-indigo-100 text-indigo-600",
  violet: "bg-violet-50 hover:bg-violet-100 text-violet-600",
};

export default function DownloadDropdown({
  onDownloadCSV,
  onDownloadPDF,
  disabled = false,
  color = "indigo",
  label = "Download",
  compact = false,
}: DownloadDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dropdownMenu = (
    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
      <button
        onClick={() => { onDownloadCSV(); setOpen(false); }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-left">
          <div className="text-xs font-semibold text-slate-800">CSV File</div>
          <div className="text-[10px] text-slate-400">Spreadsheet format</div>
        </div>
      </button>
      <div className="mx-3 border-t border-slate-100" />
      <button
        onClick={() => { onDownloadPDF(); setOpen(false); }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-rose-600" />
        </div>
        <div className="text-left">
          <div className="text-xs font-semibold text-slate-800">PDF File</div>
          <div className="text-[10px] text-slate-400">Print-ready document</div>
        </div>
      </button>
    </div>
  );

  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className={`p-2 ${compactButtonStyles[color]} rounded-lg transition disabled:opacity-40`}
          title="Download Report"
        >
          <Download className="w-4 h-4" />
        </button>
        {open && dropdownMenu}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${buttonStyles[color]} text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Download className="w-3.5 h-3.5" />
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && dropdownMenu}
    </div>
  );
}
