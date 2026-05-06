import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-utils";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const totalUsers = await prisma.user.count({ where: { role: "MEMBER" } });

  const premiums = await prisma.premium.aggregate({ _sum: { amount: true } });
  const totalCollections = premiums._sum.amount || 0;

  const activeLoansCount = await prisma.loan.count({ where: { status: "ACTIVE" } });

  const allLoans = await prisma.loan.aggregate({ _sum: { principalAmount: true } });
  const totalDisbursed = allLoans._sum.principalAmount || 0;

  const paidInstallments = await prisma.installment.aggregate({
    _sum: { amountPaid: true },
    where: { status: "PAID" },
  });
  const totalRepaid = paidInstallments._sum.amountPaid || 0;

  const expendituresData = await prisma.expenditure.findMany();
  const totalExpenditures = expendituresData
    .filter((e) => !e.isChitPayment)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalChitContributions = expendituresData
    .filter((e) => e.isChitPayment)
    .reduce((sum, e) => sum + e.amount, 0);

  const cashInHand =
    totalCollections + totalRepaid - totalDisbursed - totalExpenditures - totalChitContributions;

  return NextResponse.json({
    totalMembers: totalUsers,
    totalCollections: Math.round(totalCollections),
    totalExpenditures: Math.round(totalExpenditures),
    totalChitContributions: Math.round(totalChitContributions),
    activeLoansCount,
    totalDisbursed: Math.round(totalDisbursed),
    totalRepaid: Math.round(totalRepaid),
    cashInHand: Math.round(cashInHand),
    totalInflow: Math.round(totalCollections + totalRepaid),
    totalOutflow: Math.round(totalDisbursed + totalExpenditures + totalChitContributions),
  });
}
