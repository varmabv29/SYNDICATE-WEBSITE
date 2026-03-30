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

interface ReportSummary {
  totalPremiums: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalEmiPaid: number;
  totalLoans: number;
  activeLoans: number;
}

// ─── Shared styles ───
const BRAND_COLOR: [number, number, number] = [16, 185, 129]; // emerald-500
const HEADER_BG: [number, number, number] = [30, 41, 59]; // slate-800
const ALT_ROW: [number, number, number] = [248, 250, 252]; // slate-50
const BORDER_COLOR: [number, number, number] = [226, 232, 240]; // slate-200

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addHeader(doc: any, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Brand bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, 12);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 252, 231); // emerald-100
  doc.text(subtitle, 14, 20);

  // Date on the right
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 14, 20, { align: "right" });

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

  // Summary background
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, startY, pageWidth - 28, boxH, 3, 3, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // slate-500

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
    doc.setTextColor(100, 116, 139);
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
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3 },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
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
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_COLOR);
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
    doc.setTextColor(100, 116, 139);
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
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right" },
      6: { halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 6) {
        if (data.cell.raw === "PAID") {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [245, 158, 11];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`Loan_${loan.customId}_Schedule.pdf`);
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
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { lineColor: BORDER_COLOR, lineWidth: 0.3 },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // Add totals row
  const totalPrincipal = paidInstallments.reduce((s, i) => s + (i.amountPaid - i.interestPaid), 0);
  const totalInterest = paidInstallments.reduce((s, i) => s + i.interestPaid, 0);
  const totalAmount = paidInstallments.reduce((s, i) => s + i.amountPaid, 0);

  // Get final Y from autoTable
  const finalY = (doc as any).lastAutoTable?.finalY || y + 20;

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, finalY, doc.internal.pageSize.getWidth() - 28, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("TOTALS:", 20, finalY + 5.5);
  doc.text(`₹${totalPrincipal.toFixed(2)}`, doc.internal.pageSize.getWidth() - 80, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalInterest.toFixed(2)}`, doc.internal.pageSize.getWidth() - 48, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalAmount.toFixed(2)}`, doc.internal.pageSize.getWidth() - 14, finalY + 5.5, { align: "right" });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`Payment_Statement_${username}.pdf`);
}
