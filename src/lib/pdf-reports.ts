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
      `₹${p.amount.toFixed(0)}`,
      `₹${runningTotal.toFixed(0)}`,
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
      `₹${opening.toFixed(0)}`,
      `₹${inst.principalDue.toFixed(0)}`,
      `₹${inst.interestDue.toFixed(0)}`,
      `₹${inst.amountDue.toFixed(0)}`,
      `₹${Math.max(0, closing).toFixed(0)}`,
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
      `₹${row.premium.toFixed(0)}`,
      `₹${row.principal.toFixed(0)}`,
      `₹${row.interest.toFixed(0)}`,
      `₹${row.total.toFixed(0)}`,
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
  doc.text(`₹${totalPremium.toFixed(0)}`, doc.internal.pageSize.getWidth() - 110, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalPrincipal.toFixed(0)}`, doc.internal.pageSize.getWidth() - 80, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalInterest.toFixed(0)}`, doc.internal.pageSize.getWidth() - 48, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalAmount.toFixed(0)}`, doc.internal.pageSize.getWidth() - 14, finalY + 5.5, { align: "right" });

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

export interface LoanPaymentPDFRow {
  loanId: string;
  memberName: string;
  username: string;
  principalAmount: number;
  interestRate: number;
  principalDue: number;
  interestDue: number;
  emiDue: number;
  monthYear: string;
  installmentFraction?: string;
  installmentNumber?: number;
  totalInstallments?: number;
}

export async function downloadProjectedPDF(
  projections: ProjectionRow[],
  grandTotal: ProjectedGrandTotal,
  targetMonthYear: string,
  isAllMembers: boolean,
  loanPayments?: LoanPaymentPDFRow[]
) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  addHeader(
    doc,
    `Future Payments Report — ${targetMonthYear}`,
    isAllMembers ? "Consolidated Member & Loan Obligations" : `Member: ${projections[0]?.memberName || "N/A"}`
  );

  let y = 36;
  const pageW = doc.internal.pageSize.getWidth();

  const baseContribution = projections[0]?.baseContribution || 3000;
  const totalBase = projections.reduce((s, p) => s + (p.baseContribution || baseContribution), 0);
  const totalLoanPrin = projections.reduce((s, p) => s + (p.loanInstallmentPrincipal || 0), 0);
  const totalLoanInt = projections.reduce((s, p) => s + (p.accruedInterest || 0), 0);
  const totalLoanEmi = totalLoanPrin + totalLoanInt;
  const grandTotalAll = totalLoanEmi + totalBase;

  const totalLoansCount = projections.reduce((s, p) => s + (p.loanBreakdown?.length || 0), 0);

  // Top Info bar
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(...BRAND_COLOR);
  doc.roundedRect(12, y, pageW - 24, 14, 3, 3, "FD");

  const infoItems = [
    { label: "Target Month", value: targetMonthYear },
    { label: "Active Loans", value: String(totalLoansCount) },
    { label: "Principal Due", value: `Rs. ${Math.round(totalLoanPrin).toLocaleString("en-IN")}` },
    { label: "Interest Due", value: `Rs. ${Math.round(totalLoanInt).toLocaleString("en-IN")}` },
    { label: "Loan EMIs", value: `Rs. ${Math.round(totalLoanEmi).toLocaleString("en-IN")}` },
    { label: "Base Premiums", value: `Rs. ${Math.round(totalBase).toLocaleString("en-IN")}` },
    { label: "Grand Total Due", value: `Rs. ${Math.round(grandTotalAll).toLocaleString("en-IN")}` },
  ];

  const infoColW = (pageW - 24) / infoItems.length;
  infoItems.forEach((item, i) => {
    const x = 12 + i * infoColW + infoColW / 2;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(item.label.toUpperCase(), x, y + 5, { align: "center" });
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, x, y + 11, { align: "center" });
  });

  y += 20;

  // Build table data grouped by member with subtotal rows
  const tableData: string[][] = [];
  let sNo = 1;

  projections.forEach((p) => {
    const memberName = p.memberName;
    const memberBase = p.baseContribution || baseContribution;
    const loans = p.loanBreakdown || [];

    if (loans.length > 0) {
      loans.forEach((lb: any) => {
        const frac = lb.installmentFraction || (lb.installmentNumber && lb.totalInstallments ? `${lb.installmentNumber}/${lb.totalInstallments}` : "—");
        tableData.push([
          String(sNo++),
          memberName,
          lb.loanId,
          frac,
          `Rs. ${Math.round(lb.principalDue).toLocaleString("en-IN")}`,
          `Rs. ${Math.round(lb.interestDue).toLocaleString("en-IN")}`,
          `Rs. ${Math.round(lb.emiDue).toLocaleString("en-IN")}`,
          "—",
          `Rs. ${Math.round(lb.emiDue).toLocaleString("en-IN")}`,
        ]);
      });
    } else {
      tableData.push([
        String(sNo++),
        memberName,
        "—",
        "—",
        "Rs. 0",
        "Rs. 0",
        "Rs. 0",
        `Rs. ${Math.round(memberBase).toLocaleString("en-IN")}`,
        `Rs. ${Math.round(memberBase).toLocaleString("en-IN")}`,
      ]);
    }

    // Member Total Row
    const memberPrin = loans.reduce((s: number, l: any) => s + (l.principalDue || 0), 0);
    const memberInt = loans.reduce((s: number, l: any) => s + (l.interestDue || 0), 0);
    const memberEmi = loans.reduce((s: number, l: any) => s + (l.emiDue || 0), 0);
    const memberTotalToPay = memberEmi + memberBase;

    tableData.push([
      "",
      `Total to be Paid (${memberName})`,
      "",
      loans.length > 0 ? `${loans.length} loan(s)` : "No loans",
      `Rs. ${Math.round(memberPrin).toLocaleString("en-IN")}`,
      `Rs. ${Math.round(memberInt).toLocaleString("en-IN")}`,
      `Rs. ${Math.round(memberEmi).toLocaleString("en-IN")}`,
      `Rs. ${Math.round(memberBase).toLocaleString("en-IN")}`,
      `Rs. ${Math.round(memberTotalToPay).toLocaleString("en-IN")}`,
    ]);
  });

  // Grand Total Row
  tableData.push([
    "",
    `GRAND TOTAL (${projections.length} MEMBERS)`,
    "",
    `${totalLoansCount} loans`,
    `Rs. ${Math.round(totalLoanPrin).toLocaleString("en-IN")}`,
    `Rs. ${Math.round(totalLoanInt).toLocaleString("en-IN")}`,
    `Rs. ${Math.round(totalLoanEmi).toLocaleString("en-IN")}`,
    `Rs. ${Math.round(totalBase).toLocaleString("en-IN")}`,
    `Rs. ${Math.round(grandTotalAll).toLocaleString("en-IN")}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        {
          content: `1. CONSOLIDATED MEMBER & LOAN PAYMENT OBLIGATIONS (${targetMonthYear})`,
          colSpan: 9,
          styles: {
            halign: "left",
            fillColor: [240, 253, 250],
            textColor: [15, 118, 110],
            fontStyle: "bold",
            fontSize: 8,
            cellPadding: 2.8,
          },
        },
      ],
      [
        "#",
        "Member Name",
        "Loan ID",
        "Instalment",
        "Principal Due",
        "Interest Due",
        "Loan EMI",
        "Base Contrib.",
        "Total to Pay",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2.5,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: {
      lineColor: BORDER_COLOR,
      lineWidth: 0.3,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 44 },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 32 },
      5: { halign: "center", cellWidth: 30 },
      6: { halign: "center", cellWidth: 33 },
      7: { halign: "center", cellWidth: 32 },
      8: { halign: "center", cellWidth: 42 },
    },
    margin: { left: 12, right: 12 },
    didParseCell: (cellData: any) => {
      const rawText = cellData.row.raw[1]?.toString() || "";
      const isGrandTotal = cellData.row.index === tableData.length - 1;
      const isMemberTotal = rawText.startsWith("Total to be Paid");

      if (cellData.section === "body") {
        if (isGrandTotal) {
          cellData.cell.styles.fontStyle = "bold";
          cellData.cell.styles.fillColor = BRAND_DARK as any;
          cellData.cell.styles.textColor = [255, 255, 255];
          cellData.cell.styles.halign = "center";
        } else if (isMemberTotal) {
          cellData.cell.styles.fontStyle = "bold";
          cellData.cell.styles.fillColor = [254, 242, 242] as any; // red-50
          cellData.cell.styles.textColor = [220, 38, 38]; // red font color
          cellData.cell.styles.halign = "center";
        }
      }
    },
  });

  // ─── 2. Overall Payment Summary Section in PDF (matching Excel format) ───
  const finalY = (doc as any).lastAutoTable?.finalY || y;
  const pageH = doc.internal.pageSize.getHeight();
  const summaryStartY = finalY + 65 > pageH - 15 ? (doc.addPage(), 22) : finalY + 8;

  const summaryTableData = [
    [
      "Total Active Loans with Payments Due",
      `${totalLoansCount} Loans`
    ],
    [
      "Total Principal to be Collected (Loans)",
      `Rs. ${totalLoanPrin.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      "Total Interest to be Collected (Loans)",
      `Rs. ${totalLoanInt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      "Total Future Loan Payments (Principal + Interest)",
      `Rs. ${totalLoanEmi.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      `Total Member Monthly Base Contributions (${projections.length} Members)`,
      `Rs. ${totalBase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      "Grand Total Amount to be Paid (Loans + Base Contributions)",
      `Rs. ${grandTotalAll.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
  ];

  const summaryWidth = 200;
  const summaryLeftMargin = (pageW - summaryWidth) / 2;

  autoTable(doc, {
    startY: summaryStartY,
    head: [[
      {
        content: `2. OVERALL PAYMENT SUMMARY (${targetMonthYear})`,
        colSpan: 2,
        styles: {
          halign: "left",
          fillColor: [240, 253, 250], // teal-50
          textColor: [15, 118, 110], // teal-700
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 2.8,
        },
      },
    ]],
    body: summaryTableData,
    theme: "grid",
    styles: {
      lineColor: [203, 213, 225], // slate-300
      lineWidth: 0.3,
      fontSize: 7.5,
      cellPadding: 2.4,
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 135, fontStyle: "bold", textColor: [51, 65, 85] },
      1: { halign: "right", cellWidth: 65, fontStyle: "bold", textColor: [15, 23, 42] },
    },
    margin: { left: summaryLeftMargin, right: summaryLeftMargin },
    didParseCell: (cellData: any) => {
      if (cellData.section === "body") {
        if (cellData.row.index === 3) {
          cellData.cell.styles.fillColor = [236, 253, 245]; // emerald-50
          cellData.cell.styles.textColor = [4, 120, 87]; // emerald-700
          cellData.cell.styles.fontStyle = "bold";
        }
        if (cellData.row.index === 5) {
          cellData.cell.styles.fillColor = [209, 250, 229]; // emerald-100
          cellData.cell.styles.textColor = [6, 95, 70]; // emerald-800
          cellData.cell.styles.fontStyle = "bold";
          cellData.cell.styles.fontSize = 8.5;
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
      `₹${(r.totalAmount || 0).toFixed(0)}`,
    ]);

    tableData.push(["GRAND TOTAL", "", `₹${grandTotal.toFixed(0)}`]);

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
      `₹${(r.amount || 0).toFixed(0)}`,
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
    doc.text(`₹${grandTotal.toFixed(0)}`, doc.internal.pageSize.getWidth() - 14, finalY + 5.5, { align: "right" });
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
      `₹${principalPaid.toFixed(0)}`,
      `₹${inst.interestPaid.toFixed(0)}`,
      `₹${inst.amountPaid.toFixed(0)}`,
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
  doc.text(`₹${totalPrincipal.toFixed(0)}`, doc.internal.pageSize.getWidth() - 80, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalInterest.toFixed(0)}`, doc.internal.pageSize.getWidth() - 48, finalY + 5.5, { align: "right" });
  doc.text(`₹${totalAmount.toFixed(0)}`, doc.internal.pageSize.getWidth() - 14, finalY + 5.5, { align: "right" });

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
