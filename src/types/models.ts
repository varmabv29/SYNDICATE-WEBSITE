// Shared frontend types derived from Prisma schema

export interface UserInfo {
  id: string;
  name: string | null;
  username: string;
  role: string;
  createdAt: string;
}

export interface PremiumRecord {
  id: string;
  userId: string;
  amount: number;
  datePaid: string;
  user: { name: string; username: string };
}

export interface Installment {
  id: string;
  loanId: string;
  monthYear: string;
  amountDue: number;
  principalDue: number;
  interestDue: number;
  dueDate: string;
  amountPaid: number;
  interestPaid: number;
  paidDate: string | null;
  status: string;
}

export interface Loan {
  id: string;
  customId: string;
  userId: string;
  principalAmount: number;
  interestRate: number;
  startDate: string;
  status: string;
  foreclosureMonth: string | null;
  settlementAmount: number | null;
  user: { name: string; username: string };
  installments: Installment[];
}

export interface Expenditure {
  id: string;
  amount: number;
  date: string;
  monthYear: string;
  remarks: string | null;
  isChitPayment: boolean;
}

export interface MemberDashboardData {
  userName: string;
  summary: {
    nav: number;
    totalPremiumsPaid: number;
    dividendEarned: number;
    totalExpenditures: number;
    totalChitContributions: number;
    chitShare: number;
    pendingLoanRequests: number;
  };
  premiums: PremiumRecord[];
  loans: Loan[];
}
