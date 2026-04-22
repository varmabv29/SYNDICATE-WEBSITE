import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMember } from "@/lib/auth-utils";

export async function GET() {
  const memberEntry = await checkMember();
  if (!memberEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = memberEntry.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });

    const premiums = await prisma.premium.findMany({
      where: { userId },
      orderBy: { datePaid: "desc" },
    });

    const totalPremiumsPaid = premiums.reduce((sum: number, p: any) => sum + p.amount, 0);

    const paidInstallments = await prisma.installment.findMany({
      where: { status: "PAID" },
      select: { interestPaid: true }
    });
    const totalGroupInterest = paidInstallments.reduce((sum: number, inst: any) => sum + (inst.interestPaid || 0), 0);
    const totalMembers = await prisma.user.count({ where: { role: "MEMBER" }});
    const dividendEarned = totalMembers > 0 ? (totalGroupInterest / totalMembers) : 0;
    
    const expenditures = await prisma.expenditure.findMany();
    const regularExpenditures = expenditures.filter(e => !e.isChitPayment);
    const chitPayments = expenditures.filter(e => e.isChitPayment);
    
    const totalExpenditures = regularExpenditures.reduce((sum, e) => sum + e.amount, 0);
    const totalChitContributions = chitPayments.reduce((sum, e) => sum + e.amount, 0);
    
    const chitShare = totalMembers > 0 ? (totalChitContributions / totalMembers) : 0;
    const nav = totalPremiumsPaid + dividendEarned + chitShare;

    const loans = await prisma.loan.findMany({
      where: { userId },
      include: {
        installments: {
          orderBy: { dueDate: "asc" }
        }
      },
      orderBy: { startDate: "desc" }
    });



    const pendingLoanRequests = await prisma.loanRequest.count({
      where: { status: "PENDING" }
    });

    return NextResponse.json({
      userName: user?.name || user?.username || "Member",
      summary: {
        totalPremiumsPaid,
        dividendEarned,
        nav,
        totalExpenditures,
        totalChitContributions,
        chitShare,
        activeLoansCount: loans.filter((l: any) => l.status === "ACTIVE").length,
        pendingLoanRequests,
      },
      premiums,
      loans
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
