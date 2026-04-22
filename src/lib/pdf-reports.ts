import { formatDate } from "@/lib/format";

// Dynamic import helper — only loads jsPDF in the browser
async function loadPdfLibs() {
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  return {
    jsPDF: jsPDFModule.default,
    autoTable: autoTableModule.default,
  };
}

// ─── Types (shared) ───
interface PremiumRow {
  id: string;
  amount: number;
  datePaid: string;
  user: { name: string; username: string };
}

interface Installment {
  id: string;
  monthYear: string;
  principalDue: number;
  interestDue: number;
  amountDue: number;
  status: string;
  dueDate: string;
  paidDate?: string | null;
  amountPaid: number;
  interestPaid: number;
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

export interface MonthWisePaymentRow {
  memberId: string;
  memberName: string;
  username: string;
  monthYear: string;
  dateObj: number;
  premium: number;
  principal: number;
  interest: number;
  total: number;
}

interface ReportSummary {
  totalPremiums: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalEmiPaid: number;
  totalLoans: number;
  activeLoans: number;
}

// ─── Shared styles ───
const BRAND_COLOR: [number, number, number] = [79, 70, 229]; // indigo-600
const BRAND_DARK: [number, number, number] = [30, 27, 75]; // indigo-950
const ACCENT_GOLD: [number, number, number] = [245, 158, 11]; // amber-500
const HEADER_BG: [number, number, number] = [30, 27, 75]; // indigo-950
const ALT_ROW: [number, number, number] = [238, 242, 255]; // indigo-50
const BORDER_COLOR: [number, number, number] = [199, 210, 254]; // indigo-200

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addHeader(doc: any, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Deep gradient-effect header bar
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, pageWidth, 30, "F");

  // Gold accent line at bottom of header
  doc.setFillColor(...ACCENT_GOLD);
  doc.rect(0, 30, pageWidth, 1.5, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, 13);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text(subtitle, 14, 22);

  // Date on the right with gold color
  doc.setTextColor(...ACCENT_GOLD);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 14, 22, { align: "right" });

  // Reset text color
  doc.setTextColor(0, 0, 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addSummaryBox(
  doc: any,
  summary: ReportSummary,
  startY: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxH = 22;

  // Summary background with subtle indigo tint
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(...BRAND_COLOR);
  doc.roundedRect(14, startY, pageWidth - 28, boxH, 3, 3, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229); // indigo-600

  const cols = [
    { label: "TOTAL PREMIUMS", value: `₹${summary.totalPremiums.toFixed(0)}` },
    { label: "PRINCIPAL REPAID", value: `₹${summary.totalPrincipalPaid.toFixed(0)}` },
    { label: "INTEREST PAID", value: `₹${summary.totalInterestPaid.toFixed(0)}` },
    { label: "TOTAL EMI PAID", value: `₹${summary.totalEmiPaid.toFixed(0)}` },
    { label: "TOTAL LOANS", value: String(summary.totalLoans) },
    { label: "ACTIVE LOANS", value: String(summary.activeLoans) },
  ];

  const colW = (pageWidth - 28) / cols.length;
  cols.forEach((col, i) => {
    const x = 14 + i * colW + colW / 2;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(col.label, x, startY + 8, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(col.value, x, startY + 16, { align: "center" });
  });

  return startY + boxH + 8;
}

// ─── Premium Statement PDF ───
export async function downloadPremiumPDF(
  premiums: PremiumRow[],
  summary: ReportSummary,
  username: string,
  memberName: string
) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  addHeader(doc, "Premium Statement", `Member: ${memberName} (@${username})`);
  let y = addSummaryBox(doc, summary, 34);

  // Section title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Premium Payment History", 14, y);
  y += 4;

  let runningTotal = 0;
  const tableData = premiums.map((p, idx) => {
    runningTotal += p.amount;
    return [
      String(idx + 1),
      formatDate(p.datePaid),
      `₹${p.amount.toFixed(2)}`,
      `₹${runningTotal.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Date Paid", "Amount (₹)", "Running Total (₹)"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center" },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3, overflow: "linebreak", cellWidth: "wrap" },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pgW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, pageH - 12, pgW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text(
      `Page ${i} of ${pageCount}`,
      pgW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  doc.save(`Premium_Statement_${username}.pdf`);
}

// ─── Loan Schedule PDF ───
export async function downloadLoanPDF(
  loan: LoanRow,
  summary: ReportSummary,
  username: string,
  memberName: string
) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  addHeader(
    doc,
    `Loan Schedule — ${loan.customId}`,
    `Member: ${memberName} (@${username}) • Principal: ₹${loan.principalAmount.toFixed(0)} @ ${loan.interestRate}% • Status: ${loan.status}`
  );

  let y = 36;

  // Loan info bar
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(...BRAND_COLOR);
  const pageW = doc.internal.pageSize.getWidth();
  doc.roundedRect(14, y, pageW - 28, 14, 3, 3, "FD");

  const infoItems = [
    { label: "Loan ID", value: loan.customId },
    { label: "Principal", value: `₹${loan.principalAmount.toFixed(0)}` },
    { label: "Interest Rate", value: `${loan.interestRate}%` },
    { label: "Start Date", value: formatDate(loan.startDate) },
    { label: "Status", value: loan.status },
    { label: "EMIs", value: `${loan.installments.filter(i => i.status === "PAID").length}/${loan.installments.length} Paid` },
  ];

  const infoColW = (pageW - 28) / infoItems.length;
  infoItems.forEach((item, i) => {
    const x = 14 + i * infoColW + infoColW / 2;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(item.label.toUpperCase(), x, y + 5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, x, y + 11, { align: "center" });
  });

  y += 20;

  let balance = loan.principalAmount;
  const tableData = loan.installments.map((inst) => {
    const opening = balance;
    const closing = opening - inst.principalDue;
    balance = closing;
    return [
      inst.monthYear,
      `₹${opening.toFixed(2)}`,
      `₹${inst.principalDue.toFixed(2)}`,
      `₹${inst.interestDue.toFixed(2)}`,
      `₹${inst.amountDue.toFixed(2)}`,
      `₹${Math.max(0, closing).toFixed(2)}`,
      inst.status,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Month/Year", "Opening Balance", "Principal", "Interest", "Total EMI", "Closing Balance", "Status"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center" },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3, overflow: "linebreak", cellWidth: "wrap" },
    columnStyles: {},
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 6) {
        if (data.cell.raw === "PAID") {
          data.cell.styles.textColor = [22, 163, 74]; // green-600
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [234, 88, 12]; // orange-600
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pgW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, pageH - 12, pgW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text(
      `Page ${i} of ${pageCount}`,
      pgW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  doc.save(`Loan_${loan.customId}_Schedule.pdf`);
}

// ─── Month-wise Payments PDF ───
export async function downloadMonthWisePDF(
  monthWisePayments: MonthWisePaymentRow[],
  summary: ReportSummary,
  username: string,
  memberName: string
) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  addHeader(doc, "Month-wise Payment Statement", `Member: ${memberName} (@${username})`);
  let y = addSummaryBox(doc, summary, 34);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Payment Records", 14, y);
  y += 4;

  const tableData = monthWisePayments.map((row, idx) => {
    return [
      String(idx + 1),
      row.memberName,
      row.monthYear,
      `₹${row.premium.toFixed(2)}`,
      `₹${row.principal.toFixed(2)}`,
      `₹${row.interest.toFixed(2)}`,
      `₹${row.total.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Member Name", "Payment Month", "Monthly Premium (₹)", "Loan Installment (₹)", "Interest Paid (₹)", "Total Paid (₹)"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center" },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3, overflow: "linebreak", cellWidth: "wrap" },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
    },
    margin: { left: 14, right: 14 },
  });

  // Add totals row
  const totalPremium = monthWisePayments.reduce((s, i) => s + i.premium, 0);
  const totalPrincipal = monthWisePayments.reduce((s, i) => s + i.principal, 0);
  const totalInterest = monthWisePayments.reduce((s, i) => s + i.interest, 0);
  const totalAmount = monthWisePayments.reduce((s, i) => s + i.total, 0);

  // Get final Y from autoTable
  const finalY = (doc as any).lastAutoTable?.finalY || y + 20;

  doc.setFillColor(...BRAND_DARK);
  doc.rect(14, finalY, doc.internal.pageSize.getWidth() - 28, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTALS:", 20, finalY + 5.5);
  doc.setTextColor(...ACCENT_GOLD);
  doc.text(`₹${totalPremium.toFixed(2)}`, doc.internal.pageSize.getWidth() - 110, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalPrincipal.toFixed(2)}`, doc.internal.pageSize.getWidth() - 80, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalInterest.toFixed(2)}`, doc.internal.pageSize.getWidth() - 48, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalAmount.toFixed(2)}`, doc.internal.pageSize.getWidth() - 14, finalY + 5.5, { align: "right" });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pgW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, pageH - 12, pgW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text(
      `Page ${i} of ${pageCount}`,
      pgW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  doc.save(`Month_Wise_Payments_${username}.pdf`);
}

// ─── Projected Payments PDF ───
interface ProjectionRow {
  memberName: string;
  username: string;
  baseContribution: number;
  loanInstallmentPrincipal: number;
  accruedInterest: number;
  totalDue: number;
  loanBreakdown: {
    loanId: string;
    principalDue: number;
    interestDue: number;
    emiDue: number;
  }[];
}

interface ProjectedGrandTotal {
  baseContribution: number;
  loanInstallmentPrincipal: number;
  accruedInterest: number;
  totalDue: number;
}

export async function downloadProjectedPDF(
  projections: ProjectionRow[],
  grandTotal: ProjectedGrandTotal,
  targetMonthYear: string,
  isAllMembers: boolean
) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  addHeader(
    doc,
    `Projected Payments — ${targetMonthYear}`,
    isAllMembers ? "All Members Summary" : `Member: ${projections[0]?.memberName || "N/A"}`
  );

  let y = 36;

  // Info bar
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(...BRAND_COLOR);
  doc.roundedRect(14, y, pageW - 28, 14, 3, 3, "FD");

  const infoItems = [
    { label: "Target Month", value: targetMonthYear },
    { label: "Members", value: String(projections.length) },
    { label: "Total Base", value: `₹${grandTotal.baseContribution.toFixed(0)}` },
    { label: "Total Principal", value: `₹${grandTotal.loanInstallmentPrincipal.toFixed(0)}` },
    { label: "Total Interest", value: `₹${grandTotal.accruedInterest.toFixed(0)}` },
    { label: "Grand Total", value: `₹${grandTotal.totalDue.toFixed(0)}` },
  ];

  const infoColW = (pageW - 28) / infoItems.length;
  infoItems.forEach((item, i) => {
    const x = 14 + i * infoColW + infoColW / 2;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(item.label.toUpperCase(), x, y + 5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, x, y + 11, { align: "center" });
  });

  y += 20;

  const tableData = projections.map((p, idx) => [
    String(idx + 1),
    p.memberName,
    `₹${p.baseContribution.toFixed(2)}`,
    `₹${p.loanInstallmentPrincipal.toFixed(2)}`,
    `₹${p.accruedInterest.toFixed(2)}`,
    `₹${p.totalDue.toFixed(2)}`,
  ]);

  // Grand total row
  tableData.push([
    "",
    "GRAND TOTAL",
    `₹${grandTotal.baseContribution.toFixed(2)}`,
    `₹${grandTotal.loanInstallmentPrincipal.toFixed(2)}`,
    `₹${grandTotal.accruedInterest.toFixed(2)}`,
    `₹${grandTotal.totalDue.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Member Name", "Base Contribution (₹)", "Loan Principal (₹)", "Interest (₹)", "Total Due (₹)"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center" },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3, overflow: "linebreak", cellWidth: "wrap" },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      // Style the grand total row
      if (data.section === "body" && data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = BRAND_DARK as any;
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pgW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, pageH - 12, pgW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text(
      `Page ${i} of ${pageCount}`,
      pgW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  doc.save(`Projected_Payments_${targetMonthYear}.pdf`);
}

// ─── Financial Activity PDF ───
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

export async function downloadActivityPDF(
  results: ActivityRow[],
  grandTotal: number,
  viewMode: string,
  types: string[]
) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  addHeader(
    doc,
    "Financial Activity Report",
    `View: ${viewMode === "aggregated" ? "Aggregated" : "Individual"} • Types: ${types.join(", ")}`
  );

  let y = 36;

  if (viewMode === "aggregated") {
    const tableData = results.map((r) => [
      r.type,
      String(r.count || 0),
      `₹${(r.totalAmount || 0).toFixed(2)}`,
    ]);

    tableData.push(["GRAND TOTAL", "", `₹${grandTotal.toFixed(2)}`]);

    autoTable(doc, {
      startY: y,
      head: [["Transaction Type", "Count", "Total Amount (₹)"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: HEADER_BG,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 4,
        halign: "center",
      },
      bodyStyles: { fontSize: 9, cellPadding: 3, halign: "center" },
      alternateRowStyles: { fillColor: ALT_ROW },
      styles: { lineColor: BORDER_COLOR, lineWidth: 0.3, overflow: "linebreak", cellWidth: "wrap" },
      columnStyles: {},
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = BRAND_DARK as any;
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
    });
  } else {
    const tableData = results.map((r, idx) => [
      String(idx + 1),
      formatDate(r.date || null),
      r.type,
      r.memberName || "-",
      r.description || "-",
      `₹${(r.amount || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Date", "Type", "Member", "Description", "Amount (₹)"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: HEADER_BG,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 3,
        halign: "center",
      },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center" },
      alternateRowStyles: { fillColor: ALT_ROW },
      styles: { lineColor: BORDER_COLOR, lineWidth: 0.3, overflow: "linebreak", cellWidth: "wrap" },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
      },
      margin: { left: 14, right: 14 },
    });

    // Add totals
    const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
    doc.setFillColor(...BRAND_DARK);
    doc.rect(14, finalY, doc.internal.pageSize.getWidth() - 28, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("GRAND TOTAL:", 20, finalY + 5.5);
    doc.setTextColor(...ACCENT_GOLD);
    doc.text(`₹${grandTotal.toFixed(2)}`, doc.internal.pageSize.getWidth() - 14, finalY + 5.5, { align: "right" });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Footer bar
    const pageH = doc.internal.pageSize.getHeight();
    const pgW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, pageH - 12, pgW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text(
      `Page ${i} of ${pageCount}`,
      pgW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  doc.save(`Financial_Activity_Report.pdf`);
}

// ─── Date-wise Payments PDF ───
export async function downloadPaymentsPDF(
  paidInstallments: PaidInstallmentRow[],
  summary: ReportSummary,
  username: string,
  memberName: string
) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  addHeader(doc, "Date-wise Payment Statement", `Member: ${memberName} (@${username})`);
  let y = addSummaryBox(doc, summary, 34);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Payment Records", 14, y);
  y += 4;

  const tableData = paidInstallments.map((inst, idx) => {
    const principalPaid = inst.amountPaid - inst.interestPaid;
    return [
      String(idx + 1),
      formatDate(inst.paidDate),
      inst.loan.customId,
      inst.monthYear,
      `₹${principalPaid.toFixed(2)}`,
      `₹${inst.interestPaid.toFixed(2)}`,
      `₹${inst.amountPaid.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Paid Date", "Loan ID", "Month/Year", "Principal (₹)", "Interest (₹)", "Total Paid (₹)"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center" },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3, overflow: "linebreak", cellWidth: "wrap" },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
    },
    margin: { left: 14, right: 14 },
  });

  // Add totals row
  const totalPrincipal = paidInstallments.reduce((s, i) => s + (i.amountPaid - i.interestPaid), 0);
  const totalInterest = paidInstallments.reduce((s, i) => s + i.interestPaid, 0);
  const totalAmount = paidInstallments.reduce((s, i) => s + i.amountPaid, 0);

  // Get final Y from autoTable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || y + 20;

  doc.setFillColor(...BRAND_DARK);
  doc.rect(14, finalY, doc.internal.pageSize.getWidth() - 28, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTALS:", 20, finalY + 5.5);
  doc.setTextColor(...ACCENT_GOLD);
  doc.text(`₹${totalPrincipal.toFixed(2)}`, doc.internal.pageSize.getWidth() - 80, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalInterest.toFixed(2)}`, doc.internal.pageSize.getWidth() - 48, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalAmount.toFixed(2)}`, doc.internal.pageSize.getWidth() - 14, finalY + 5.5, { align: "right" });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pgW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, pageH - 12, pgW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(199, 210, 254);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pgW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  doc.save(`Payment_Statement_${username}.pdf`);
}
