"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  Search,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Banknote,
  IndianRupee,
  Layers,
  ArrowRight,
} from "lucide-react";
import DownloadDropdown from "@/components/DownloadDropdown";

interface LoanBreakdownItem {
  loanId: string;
  principalAmount: number;
  interestRate: number;
  principalDue: number;
  interestDue: number;
  emiDue: number;
  monthYear: string;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentFraction?: string;
}

interface ProjectionRow {
  userId: string;
  memberName: string;
  username: string;
  baseContribution: number;
  loanInstallmentPrincipal: number;
  accruedInterest: number;
  totalDue: number;
  loanBreakdown: LoanBreakdownItem[];
}

export interface LoanPaymentItem {
  loanId: string;
  userId: string;
  memberName: string;
  username: string;
  principalAmount: number;
  interestRate: number;
  principalDue: number;
  interestDue: number;
  emiDue: number;
  monthYear: string;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentFraction?: string;
}

interface ProjectedData {
  targetMonthYear: string;
  baseContribution: number;
  projections: ProjectionRow[];
  loanPayments?: LoanPaymentItem[];
  loanSummary?: {
    totalLoans: number;
    totalPrincipalSanctioned: number;
    totalPrincipalDue: number;
    totalInterestDue: number;
    totalEmiDue: number;
  };
  grandTotal: {
    baseContribution: number;
    loanInstallmentPrincipal: number;
    accruedInterest: number;
    totalLoanDue?: number;
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

function getRunningMonth() {
  const now = new Date();
  return (
    now.toLocaleString("default", { month: "short" }) + "-" + now.getFullYear()
  );
}

function getAvailableMonths(count = 12) {
  const months: string[] = [];
  const now = new Date();
  // Include running/current month (i = 0) and next months
  for (let i = 0; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(
      d.toLocaleString("default", { month: "short" }) + "-" + d.getFullYear()
    );
  }
  return months;
}

function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default function ProjectedPaymentsTab({ isAdmin, members = [] }: Props) {
  const runningMonth = useMemo(() => getRunningMonth(), []);
  const monthOptions = useMemo(() => getAvailableMonths(12), []);
  // Default to running month or Dec-2026 if running month has passed or is upcoming
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return monthOptions.length > 1 ? monthOptions[1] : monthOptions[0];
  });
  const [selectedUser, setSelectedUser] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<ProjectedData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ monthYear: selectedMonth });
    if (isAdmin) {
      params.set("userId", selectedUser === "all" ? "all" : selectedUser);
    }
    fetch(`/api/shared/reports/projected?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonth, selectedUser, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = useMemo(() => {
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  // Group projections by member matching search criteria
  const displayedMembers = useMemo(() => {
    if (!data?.projections) return [];
    if (!searchTerm.trim()) return data.projections;

    const term = searchTerm.toLowerCase();
    return data.projections.filter((p) => {
      const matchMember =
        p.memberName.toLowerCase().includes(term) ||
        p.username.toLowerCase().includes(term);
      const matchLoan = p.loanBreakdown.some((l) =>
        l.loanId.toLowerCase().includes(term)
      );
      return matchMember || matchLoan;
    });
  }, [data, searchTerm]);

  // Calculated totals across all displayed members
  const calculatedTotals = useMemo(() => {
    let totalLoans = 0;
    let totalSanctioned = 0;
    let totalPrincipalDue = 0;
    let totalInterestDue = 0;
    let totalLoanEmi = 0;
    let totalBaseContribution = 0;
    let grandTotalAmountToPay = 0;

    displayedMembers.forEach((p) => {
      const memberLoans = p.loanBreakdown || [];
      totalLoans += memberLoans.length;

      const memberPrin = memberLoans.reduce(
        (s, l) => s + (l.principalDue || 0),
        0
      );
      const memberInt = memberLoans.reduce(
        (s, l) => s + (l.interestDue || 0),
        0
      );
      const memberEmi = memberLoans.reduce((s, l) => s + (l.emiDue || 0), 0);
      const memberSanctioned = memberLoans.reduce(
        (s, l) => s + (l.principalAmount || 0),
        0
      );

      totalSanctioned += memberSanctioned;
      totalPrincipalDue += memberPrin;
      totalInterestDue += memberInt;
      totalLoanEmi += memberEmi;

      const memberBase = p.baseContribution || 0;
      totalBaseContribution += memberBase;

      grandTotalAmountToPay += memberEmi + memberBase;
    });

    return {
      membersCount: displayedMembers.length,
      totalLoans,
      totalSanctioned,
      totalPrincipalDue,
      totalInterestDue,
      totalLoanEmi,
      totalBaseContribution,
      grandTotalAmountToPay,
    };
  }, [displayedMembers]);

  // Excel (.xls) Export with XML Spreadsheet 2003 (Merged cells, Member subtotals, Grand totals)
  const downloadExcel = () => {
    if (!data) return;

    const targetMonth = data.targetMonthYear || selectedMonth;
    const generatedDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    let sNo = 1;
    let rowsXml = "";

    displayedMembers.forEach((p) => {
      const memberName = p.memberName;
      const memberBase = p.baseContribution || 0;
      const loans = p.loanBreakdown || [];

      if (loans.length > 0) {
        loans.forEach((l) => {
          const frac =
            l.installmentFraction ||
            (l.installmentNumber && l.totalInstallments
              ? `${l.installmentNumber}/${l.totalInstallments}`
              : "—");

          rowsXml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${sNo++}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${escapeXml(memberName)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(l.loanId)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(frac)}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${l.principalAmount.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${l.interestRate.toFixed(1)}%</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${l.principalDue.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${l.interestDue.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="CellCurrencyBold"><Data ss:Type="Number">${l.emiDue.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${l.emiDue.toFixed(2)}</Data></Cell>
   </Row>`;
        });
      } else {
        rowsXml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${sNo++}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${escapeXml(memberName)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">0.00</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">0.00</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">0.00</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">0.00</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${memberBase.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="CellCurrencyBold"><Data ss:Type="Number">${memberBase.toFixed(2)}</Data></Cell>
   </Row>`;
      }

      // Member Subtotal Row
      const memberPrin = loans.reduce((s, l) => s + (l.principalDue || 0), 0);
      const memberInt = loans.reduce((s, l) => s + (l.interestDue || 0), 0);
      const memberEmi = loans.reduce((s, l) => s + (l.emiDue || 0), 0);
      const memberTotalToPay = memberEmi + memberBase;

      rowsXml += `
   <Row ss:Height="24">
    <Cell ss:StyleID="MemberTotalLabel"><Data ss:Type="String">Total to be Paid</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MemberTotalName"><Data ss:Type="String">${escapeXml(memberName)}</Data></Cell>
    <Cell ss:StyleID="MemberTotalCenter"><Data ss:Type="String">${loans.length > 0 ? `${loans.length} Loan(s)` : "No Loans"}</Data></Cell>
    <Cell ss:StyleID="MemberTotalCenter"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="MemberTotalCurrency"><Data ss:Type="Number">${memberPrin.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="MemberTotalCurrency"><Data ss:Type="Number">${memberInt.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="MemberTotalCurrency"><Data ss:Type="Number">${memberEmi.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="MemberTotalCurrency"><Data ss:Type="Number">${memberBase.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="MemberTotalHighlight"><Data ss:Type="Number">${memberTotalToPay.toFixed(2)}</Data></Cell>
   </Row>
   <Row ss:Height="6"/>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Future Payments Report - ${escapeXml(targetMonth)}</Title>
  <Author>Syndicate Finance</Author>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleBanner">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubtitleBanner">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Italic="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#115E59" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#0F766E"/>
   <Interior ss:Color="#F0FDFA" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F766E"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCFBF1"/>
   </Borders>
  </Style>
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCurrencyBold">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F766E"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="MemberTotalLabel">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F766E"/>
   <Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
   </Borders>
  </Style>
  <Style ss:ID="MemberTotalName">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F766E"/>
   <Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
   </Borders>
  </Style>
  <Style ss:ID="MemberTotalCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F766E"/>
   <Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
   </Borders>
  </Style>
  <Style ss:ID="MemberTotalCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F766E"/>
   <Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4"/>
   </Borders>
  </Style>
  <Style ss:ID="MemberTotalHighlight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#047857"/>
   <Interior ss:Color="#A7F3D0" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#059669"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#059669"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6EE7B7"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6EE7B7"/>
   </Borders>
  </Style>
  <Style ss:ID="GrandTotalLabel">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10.5" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#334155"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="GrandTotalCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10.5" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#334155"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="GrandTotalHighlight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#047857"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#059669"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#047857"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
   </Borders>
  </Style>
  <Style ss:ID="SummaryLabelCell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="SummaryValueCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="SummaryValueHighlight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#047857"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#059669"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6EE7B7"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Future Payments">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="45"/>
   <Column ss:Width="160"/>
   <Column ss:Width="115"/>
   <Column ss:Width="95"/>
   <Column ss:Width="120"/>
   <Column ss:Width="75"/>
   <Column ss:Width="115"/>
   <Column ss:Width="115"/>
   <Column ss:Width="125"/>
   <Column ss:Width="125"/>
   <Column ss:Width="135"/>

   <!-- Title Banner -->
   <Row ss:Height="28">
    <Cell ss:MergeAcross="10" ss:StyleID="TitleBanner"><Data ss:Type="String">FUTURE PAYMENTS REPORT — ${escapeXml(targetMonth)}</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="10" ss:StyleID="SubtitleBanner"><Data ss:Type="String">Generated: ${escapeXml(generatedDate)} | Active Loans: ${calculatedTotals.totalLoans} | Scope: ${selectedUser === "all" ? "All Syndicate Members" : "Individual Member"}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <!-- Section 1 Header: Loan Breakdown -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="10" ss:StyleID="SectionHeader"><Data ss:Type="String">1. CONSOLIDATED MEMBER &amp; LOAN PAYMENT OBLIGATIONS</Data></Cell>
   </Row>

   <!-- Table Headers -->
   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Member Name</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Loan ID</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Instalment</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Loan Amount</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Rate</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Principal Due</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Interest Due</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Loan EMI</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Base Contribution</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total to Pay</Data></Cell>
   </Row>

   ${rowsXml}

   <!-- Grand Total Row -->
   <Row ss:Height="26">
    <Cell ss:MergeAcross="3" ss:StyleID="GrandTotalLabel"><Data ss:Type="String">GRAND TOTAL (${calculatedTotals.membersCount} MEMBERS)</Data></Cell>
    <Cell ss:StyleID="GrandTotalCurrency"><Data ss:Type="Number">${calculatedTotals.totalSanctioned.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="GrandTotalLabel"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="GrandTotalCurrency"><Data ss:Type="Number">${calculatedTotals.totalPrincipalDue.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="GrandTotalCurrency"><Data ss:Type="Number">${calculatedTotals.totalInterestDue.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="GrandTotalCurrency"><Data ss:Type="Number">${calculatedTotals.totalLoanEmi.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="GrandTotalCurrency"><Data ss:Type="Number">${calculatedTotals.totalBaseContribution.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="GrandTotalHighlight"><Data ss:Type="Number">${calculatedTotals.grandTotalAmountToPay.toFixed(2)}</Data></Cell>
   </Row>

   <!-- Spacing Rows -->
   <Row ss:Height="14"/>
   <Row ss:Height="14"/>

   <!-- Section 2: Overall Payment Summary (Same Sheet) -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader"><Data ss:Type="String">2. OVERALL PAYMENT SUMMARY (${escapeXml(targetMonth)})</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryLabelCell"><Data ss:Type="String">Total Active Loans with Payments Due</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="SummaryValueCell"><Data ss:Type="String">${calculatedTotals.totalLoans} Loans</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryLabelCell"><Data ss:Type="String">Total Principal to be Collected (Loans)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="SummaryValueCell"><Data ss:Type="Number">${calculatedTotals.totalPrincipalDue.toFixed(2)}</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryLabelCell"><Data ss:Type="String">Total Interest to be Collected (Loans)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="SummaryValueCell"><Data ss:Type="Number">${calculatedTotals.totalInterestDue.toFixed(2)}</Data></Cell>
   </Row>

   <Row ss:Height="24">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryLabelCell"><Data ss:Type="String">Total Future Loan Payments (Principal + Interest)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="SummaryValueHighlight"><Data ss:Type="Number">${calculatedTotals.totalLoanEmi.toFixed(2)}</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryLabelCell"><Data ss:Type="String">Total Member Monthly Base Contributions (${calculatedTotals.membersCount} Members)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="SummaryValueCell"><Data ss:Type="Number">${calculatedTotals.totalBaseContribution.toFixed(2)}</Data></Cell>
   </Row>

   <Row ss:Height="26">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryLabelCell"><Data ss:Type="String">Grand Total Amount to be Paid (Loans + Base Contributions)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="SummaryValueHighlight"><Data ss:Type="Number">${calculatedTotals.grandTotalAmountToPay.toFixed(2)}</Data></Cell>
   </Row>

  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Future_Payments_${targetMonth}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // CSV Export with consolidated member subtotals and grand totals
  const downloadCSV = () => {
    if (!data) return;

    const targetMonth = data.targetMonthYear || selectedMonth;
    const headers =
      "#,Member Name,Username,Loan ID,Instalment,Loan Amount (₹),Interest Rate (%),Principal Due (₹),Interest Due (₹),Loan EMI (₹),Base Contribution (₹),Total to Pay (₹)\n";

    let sNo = 1;
    const rows: string[] = [];

    displayedMembers.forEach((p) => {
      const memberName = p.memberName;
      const memberBase = p.baseContribution || 0;
      const loans = p.loanBreakdown || [];

      if (loans.length > 0) {
        loans.forEach((l) => {
          const frac =
            l.installmentFraction ||
            (l.installmentNumber && l.totalInstallments
              ? `${l.installmentNumber}/${l.totalInstallments}`
              : "—");

          rows.push(
            `${sNo++},"${memberName}","${p.username}","${l.loanId}","${frac}",${l.principalAmount.toFixed(0)},${l.interestRate.toFixed(1)},${l.principalDue.toFixed(0)},${l.interestDue.toFixed(0)},${l.emiDue.toFixed(0)},—,${l.emiDue.toFixed(0)}`
          );
        });
      } else {
        rows.push(
          `${sNo++},"${memberName}","${p.username}",—,—,0,0,0,0,0,${memberBase.toFixed(0)},${memberBase.toFixed(0)}`
        );
      }

      // Member total row in CSV
      const memberPrin = loans.reduce((s, l) => s + (l.principalDue || 0), 0);
      const memberInt = loans.reduce((s, l) => s + (l.interestDue || 0), 0);
      const memberEmi = loans.reduce((s, l) => s + (l.emiDue || 0), 0);
      const memberTotalToPay = memberEmi + memberBase;

      rows.push(
        `,"Total to be Paid (${memberName})",,,"${loans.length} loan(s)",—,—,${memberPrin.toFixed(0)},${memberInt.toFixed(0)},${memberEmi.toFixed(0)},${memberBase.toFixed(0)},${memberTotalToPay.toFixed(0)}`
      );
    });

    const grandTotalRow = `\n"GRAND TOTAL (${calculatedTotals.membersCount} MEMBERS)",,,,"${calculatedTotals.totalLoans} loans","${calculatedTotals.totalSanctioned.toFixed(0)}",—,"${calculatedTotals.totalPrincipalDue.toFixed(0)}","${calculatedTotals.totalInterestDue.toFixed(0)}","${calculatedTotals.totalLoanEmi.toFixed(0)}","${calculatedTotals.totalBaseContribution.toFixed(0)}","${calculatedTotals.grandTotalAmountToPay.toFixed(0)}"\n`;

    const summarySection = `\nOVERALL PAYMENT SUMMARY (${targetMonth})\nTotal Active Loans,${calculatedTotals.totalLoans}\nTotal Principal to be Collected (₹),${calculatedTotals.totalPrincipalDue.toFixed(0)}\nTotal Interest to be Collected (₹),${calculatedTotals.totalInterestDue.toFixed(0)}\nTotal Loan EMIs (₹),${calculatedTotals.totalLoanEmi.toFixed(0)}\nTotal Member Base Contributions (₹),${calculatedTotals.totalBaseContribution.toFixed(0)}\nGrand Total Amount to be Paid (₹),${calculatedTotals.grandTotalAmountToPay.toFixed(0)}\n`;

    const blob = new Blob(
      [headers + rows.join("\n") + grandTotalRow + summarySection],
      {
        type: "text/csv;charset=utf-8",
      }
    );
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Future_Payments_${targetMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // PDF Export using enhanced landscape layout with centered table contents
  const handlePDF = async () => {
    if (!data) return;
    const { downloadProjectedPDF } = await import("@/lib/pdf-reports");
    downloadProjectedPDF(
      displayedMembers,
      data.grandTotal,
      data.targetMonthYear || selectedMonth,
      selectedUser === "all"
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-100 bg-teal-50/20 flex flex-wrap items-end gap-4 rounded-t-xl">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1 text-teal-600" />
            Target Month{" "}
            <span className="text-teal-700 font-bold lowercase">
              (running: {runningMonth})
            </span>
          </label>
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-900 font-medium shadow-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m} className="bg-white">
                {m} {m === runningMonth ? "(Running Month)" : ""}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5 inline mr-1 text-teal-600" />
              Member Filter
            </label>
            <select
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-900 font-medium min-w-[200px] shadow-sm"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="all" className="bg-white">
                All Members
              </option>
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id} className="bg-white">
                  {m.name || m.username} (@{m.username})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Search className="w-3.5 h-3.5 inline mr-1 text-teal-600" />
            Search Table
          </label>
          <input
            type="text"
            placeholder="Search member or loan ID..."
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-900 font-medium w-60 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="ml-auto">
          <DownloadDropdown
            onDownloadExcel={downloadExcel}
            onDownloadCSV={downloadCSV}
            onDownloadPDF={handlePDF}
            disabled={!data || displayedMembers.length === 0}
            color="emerald"
            label="Export Report"
          />
        </div>
      </div>

      {/* KPI Metric Cards */}
      {data && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-4 pt-1">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Loans
              </span>
              <Layers className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {calculatedTotals.totalLoans}{" "}
              <span className="text-xs font-normal text-slate-400">due</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Principal Due
              </span>
              <Banknote className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-indigo-700 mt-1">
              ₹{Math.round(calculatedTotals.totalPrincipalDue).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Interest Due
              </span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600 mt-1">
              ₹{Math.round(calculatedTotals.totalInterestDue).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Base Premiums
              </span>
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">
              ₹{Math.round(calculatedTotals.totalBaseContribution).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl p-3.5 text-white shadow-md shadow-teal-700/20 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-teal-100">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Grand Total Due
              </span>
              <IndianRupee className="w-4 h-4" />
            </div>
            <div className="text-xl font-extrabold mt-1">
              ₹{Math.round(calculatedTotals.grandTotalAmountToPay).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}

      {/* Main Consolidated Table with Member Subtotals */}
      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full mx-auto mb-4" />
          Calculating future payment projections for {selectedMonth}...
        </div>
      ) : !data || displayedMembers.length === 0 ? (
        <div className="p-14 text-center text-slate-400 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-slate-300" />
          <span className="font-semibold text-slate-700">
            No active records found for {selectedMonth}
          </span>
          <span className="text-xs text-slate-500">
            {searchTerm
              ? "Try clearing your search query."
              : "Try selecting a different target month or member."}
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto px-4 pb-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 bg-slate-100/70 uppercase tracking-wider">
                  <th className="p-3 text-center w-12">#</th>
                  <th className="p-3 text-left">Member Name</th>
                  <th className="p-3 text-center">Loan ID</th>
                  <th className="p-3 text-center">Instalment</th>
                  <th className="p-3 text-right">Loan Amount</th>
                  <th className="p-3 text-center">Rate</th>
                  <th className="p-3 text-right">Principal Due</th>
                  <th className="p-3 text-right">Interest Due</th>
                  <th className="p-3 text-right">Loan EMI</th>
                  <th className="p-3 text-right">Base Contrib.</th>
                  <th className="p-3 text-right font-extrabold text-teal-900">
                    Total to Pay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  let globalIndex = 1;
                  return displayedMembers.map((member) => {
                    const memberName = member.memberName;
                    const memberBase = member.baseContribution || 0;
                    const loans = member.loanBreakdown || [];

                    const memberPrin = loans.reduce(
                      (s, l) => s + (l.principalDue || 0),
                      0
                    );
                    const memberInt = loans.reduce(
                      (s, l) => s + (l.interestDue || 0),
                      0
                    );
                    const memberEmi = loans.reduce(
                      (s, l) => s + (l.emiDue || 0),
                      0
                    );
                    const memberTotalToPay = memberEmi + memberBase;

                    return (
                      <Fragment key={member.userId}>
                        {loans.length > 0 ? (
                          loans.map((loan, lIdx) => {
                            const frac =
                              loan.installmentFraction ||
                              (loan.installmentNumber && loan.totalInstallments
                                ? `${loan.installmentNumber}/${loan.totalInstallments}`
                                : "—");

                            return (
                              <tr
                                key={`${loan.loanId}-${lIdx}`}
                                className="hover:bg-teal-50/20 transition-colors"
                              >
                                <td className="p-3 text-center text-slate-400 font-mono text-xs">
                                  {globalIndex++}
                                </td>
                                <td className="p-3 font-medium text-slate-900">
                                  {lIdx === 0 ? (
                                    <div>
                                      <span>{memberName}</span>
                                      <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                                        @{member.username}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 pl-4 text-xs">
                                      ↳ (Loan {lIdx + 1})
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                    {loan.loanId}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                                    {frac}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-medium text-slate-700 font-mono text-xs">
                                  ₹{Math.round(loan.principalAmount).toLocaleString("en-IN")}
                                </td>
                                <td className="p-3 text-center text-xs font-medium text-slate-600">
                                  {loan.interestRate}%
                                </td>
                                <td className="p-3 text-right font-semibold text-indigo-600 font-mono text-xs">
                                  ₹{Math.round(loan.principalDue).toLocaleString("en-IN")}
                                </td>
                                <td className="p-3 text-right font-semibold text-rose-500 font-mono text-xs">
                                  ₹{Math.round(loan.interestDue).toLocaleString("en-IN")}
                                </td>
                                <td className="p-3 text-right font-bold text-teal-700 font-mono text-xs">
                                  ₹{Math.round(loan.emiDue).toLocaleString("en-IN")}
                                </td>
                                <td className="p-3 text-right text-slate-400 font-mono text-xs">
                                  —
                                </td>
                                <td className="p-3 text-right font-semibold text-slate-800 font-mono text-xs">
                                  ₹{Math.round(loan.emiDue).toLocaleString("en-IN")}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr className="hover:bg-teal-50/20 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-mono text-xs">
                              {globalIndex++}
                            </td>
                            <td className="p-3 font-medium text-slate-900">
                              <div>
                                <span>{memberName}</span>
                                <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                                  @{member.username}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center text-slate-400 text-xs">
                              —
                            </td>
                            <td className="p-3 text-center text-slate-400 text-xs">
                              —
                            </td>
                            <td className="p-3 text-right text-slate-400 text-xs">
                              —
                            </td>
                            <td className="p-3 text-center text-slate-400 text-xs">
                              —
                            </td>
                            <td className="p-3 text-right text-slate-400 font-mono text-xs">
                              ₹0
                            </td>
                            <td className="p-3 text-right text-slate-400 font-mono text-xs">
                              ₹0
                            </td>
                            <td className="p-3 text-right text-slate-400 font-mono text-xs">
                              ₹0
                            </td>
                            <td className="p-3 text-right font-semibold text-emerald-600 font-mono text-xs">
                              ₹{Math.round(memberBase).toLocaleString("en-IN")}
                            </td>
                            <td className="p-3 text-right font-bold text-teal-800 font-mono text-xs">
                              ₹{Math.round(memberBase).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        )}

                        {/* Member Total Row */}
                        <tr className="bg-teal-50/50 border-y border-teal-200/80 font-bold text-xs text-teal-950">
                          <td className="p-2.5 text-center text-teal-600 font-bold">
                            ✓
                          </td>
                          <td className="p-2.5" colSpan={3}>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold uppercase tracking-wide text-teal-900 text-[11px]">
                                Total to be Paid:
                              </span>
                              <span className="text-teal-800 font-semibold">
                                {memberName}
                              </span>
                              {loans.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-200/60 text-teal-900">
                                  {loans.length} loan(s)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            {loans.length > 0
                              ? `₹${Math.round(
                                  loans.reduce(
                                    (s, l) => s + (l.principalAmount || 0),
                                    0
                                  )
                                ).toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className="p-2.5 text-center text-slate-400">—</td>
                          <td className="p-2.5 text-right font-mono text-indigo-700">
                            ₹{Math.round(memberPrin).toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 text-right font-mono text-rose-600">
                            ₹{Math.round(memberInt).toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 text-right font-mono text-teal-800 font-extrabold">
                            ₹{Math.round(memberEmi).toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-700 font-extrabold">
                            ₹{Math.round(memberBase).toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 text-right font-mono text-sm font-black text-emerald-800 bg-emerald-100/70">
                            ₹{Math.round(memberTotalToPay).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  });
                })()}

                {/* Grand Total Row at bottom */}
                <tr className="bg-slate-900 text-white font-extrabold text-sm border-t-2 border-slate-700">
                  <td colSpan={4} className="p-3.5 text-left">
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-wider text-white text-xs">
                        Grand Total ({calculatedTotals.membersCount} Members)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500 text-slate-950 font-bold">
                        {calculatedTotals.totalLoans} active loans
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs text-slate-300">
                    ₹{Math.round(calculatedTotals.totalSanctioned).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 text-center text-slate-500">—</td>
                  <td className="p-3.5 text-right font-mono text-xs text-indigo-300">
                    ₹{Math.round(calculatedTotals.totalPrincipalDue).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs text-rose-300">
                    ₹{Math.round(calculatedTotals.totalInterestDue).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs text-teal-300 font-bold">
                    ₹{Math.round(calculatedTotals.totalLoanEmi).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs text-emerald-300 font-bold">
                    ₹{Math.round(calculatedTotals.totalBaseContribution).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 text-right font-mono text-base font-black text-emerald-300 bg-slate-800">
                    ₹{Math.round(calculatedTotals.grandTotalAmountToPay).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Overall Payment Summary Section */}
          {data && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Overall Payment Summary ({data.targetMonthYear || selectedMonth})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Consolidated obligation for{" "}
                  {selectedUser === "all" ? "all members" : "selected member"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                  <div className="text-slate-500 font-medium">Principal Due</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    ₹{Math.round(calculatedTotals.totalPrincipalDue).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                  <div className="text-slate-500 font-medium">Interest Due</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    ₹{Math.round(calculatedTotals.totalInterestDue).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                  <div className="text-slate-500 font-medium">Total Loan EMIs</div>
                  <div className="text-base font-bold text-teal-700 mt-0.5">
                    ₹{Math.round(calculatedTotals.totalLoanEmi).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                  <div className="text-slate-500 font-medium">Base Premiums</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    ₹{Math.round(calculatedTotals.totalBaseContribution).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Formula:</span>
                  <span className="font-mono text-slate-600">
                    Total Loan Repayments (₹{Math.round(calculatedTotals.totalLoanEmi).toLocaleString("en-IN")}) + Base Contributions (₹{Math.round(calculatedTotals.totalBaseContribution).toLocaleString("en-IN")})
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-300">
                  Grand Total to be Paid:{" "}
                  <span className="text-teal-700 font-black">
                    ₹{Math.round(calculatedTotals.grandTotalAmountToPay).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
