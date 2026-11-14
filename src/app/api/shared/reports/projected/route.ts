import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId"); // "all" or a specific userId
  const monthYear = searchParams.get("monthYear"); // e.g. "May-2026"

  const isAdmin = session.user.role === "ADMIN";

  // Only admins can view "all" members
  if (userIdParam === "all" && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get the monthly premium (base contribution)
    const setting = await prisma.setting.findFirst();
    const baseContribution = setting?.monthlyPremium || 0;

    // Determine target month — default to next month
    let targetMonthYear = monthYear;
    if (!targetMonthYear) {
      const now = new Date();
      now.setMonth(now.getMonth() + 1);
      targetMonthYear =
        now.toLocaleString("default", { month: "short" }) +
        "-" +
        now.getFullYear();
    }

    // Determine which users to query
    let targetUserIds: string[] = [];

    if (userIdParam === "all" || !userIdParam) {
      if (isAdmin) {
        const allMembers = await prisma.user.findMany({
          where: { role: "MEMBER" },
          select: { id: true },
        });
        targetUserIds = allMembers.map((m) => m.id);
      } else {
        targetUserIds = [session.user.id];
      }
    } else {
      targetUserIds = [userIdParam];
    }

    // For each member, compute projected payment
    const projections = [];

    for (const uid of targetUserIds) {
      const user = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, name: true, username: true },
      });

      if (!user) continue;

      // Find all active loans for this user with all installments to calculate installment fraction
      const activeLoans = await prisma.loan.findMany({
        where: { userId: uid, status: "ACTIVE" },
        include: {
          installments: {
            orderBy: { dueDate: "asc" },
          },
        },
      });

      let totalLoanPrincipal = 0;
      let totalAccruedInterest = 0;
      const loanBreakdown = [];

      for (const loan of activeLoans) {
        const totalInstallments = loan.installments.length;
        const targetIndex = loan.installments.findIndex(
          (i) => i.monthYear === targetMonthYear
        );

        if (targetIndex >= 0) {
          const inst = loan.installments[targetIndex];
          if (inst.status === "PENDING") {
            const installmentNumber = targetIndex + 1;
            const installmentFraction = `${installmentNumber}/${totalInstallments}`;

            totalLoanPrincipal += inst.principalDue;
            totalAccruedInterest += inst.interestDue;
            loanBreakdown.push({
              loanId: loan.customId,
              principalAmount: loan.principalAmount,
              interestRate: loan.interestRate,
              principalDue: inst.principalDue,
              interestDue: inst.interestDue,
              emiDue: inst.amountDue,
              monthYear: inst.monthYear,
              installmentNumber,
              totalInstallments,
              installmentFraction,
            });
          }
        }
      }

      const totalDue = baseContribution + totalLoanPrincipal + totalAccruedInterest;

      projections.push({
        userId: user.id,
        memberName: user.name || user.username,
        username: user.username,
        baseContribution,
        loanInstallmentPrincipal: totalLoanPrincipal,
        accruedInterest: totalAccruedInterest,
        totalDue,
        loanBreakdown,
      });
    }

    // Compute loan-wise flattened list
    const loanPayments = [];
    for (const p of projections) {
      for (const lb of p.loanBreakdown) {
        loanPayments.push({
          loanId: lb.loanId,
          userId: p.userId,
          memberName: p.memberName,
          username: p.username,
          principalAmount: lb.principalAmount,
          interestRate: lb.interestRate,
          principalDue: lb.principalDue,
          interestDue: lb.interestDue,
          emiDue: lb.emiDue,
          monthYear: lb.monthYear,
          installmentNumber: lb.installmentNumber,
          totalInstallments: lb.totalInstallments,
          installmentFraction: lb.installmentFraction,
        });
      }
    }

    const loanSummary = {
      totalLoans: loanPayments.length,
      totalPrincipalSanctioned: loanPayments.reduce((s, l) => s + l.principalAmount, 0),
      totalPrincipalDue: loanPayments.reduce((s, l) => s + l.principalDue, 0),
      totalInterestDue: loanPayments.reduce((s, l) => s + l.interestDue, 0),
      totalEmiDue: loanPayments.reduce((s, l) => s + l.emiDue, 0),
    };

    // Compute grand total
    const grandTotal = {
      baseContribution: projections.reduce((s, p) => s + p.baseContribution, 0),
      loanInstallmentPrincipal: loanSummary.totalPrincipalDue,
      accruedInterest: loanSummary.totalInterestDue,
      totalLoanDue: loanSummary.totalEmiDue,
      totalDue:
        projections.reduce((s, p) => s + p.baseContribution, 0) +
        loanSummary.totalEmiDue,
    };

    return NextResponse.json({
      targetMonthYear,
      baseContribution,
      projections,
      loanPayments,
      loanSummary,
      grandTotal,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
