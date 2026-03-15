import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMember } from "@/lib/auth-utils";

export async function GET() {
  const memberEntry = await checkMember();
  if (!memberEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = memberEntry.user.id;

  try {
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
    const nav = totalPremiumsPaid + dividendEarned;

    const loans = await prisma.loan.findMany({
      where: { userId },
      include: {
        installments: {
          orderBy: { dueDate: "asc" }
        }
      },
      orderBy: { startDate: "desc" }
    });

    const expenditures = await prisma.expenditure.findMany();
    const totalExpenditures = expenditures.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      summary: {
        totalPremiumsPaid,
        dividendEarned,
        nav,
        totalExpenditures,
        activeLoansCount: loans.filter((l: any) => l.status === "ACTIVE").length,
      },
      premiums,
      loans
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
