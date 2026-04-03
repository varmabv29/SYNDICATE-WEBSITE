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

      // Find all active loans for this user
      const activeLoans = await prisma.loan.findMany({
        where: { userId: uid, status: "ACTIVE" },
        include: {
          installments: {
            where: { monthYear: targetMonthYear, status: "PENDING" },
            take: 1,
          },
        },
      });

      let totalLoanPrincipal = 0;
      let totalAccruedInterest = 0;
      const loanBreakdown = [];

      for (const loan of activeLoans) {
        if (loan.installments.length > 0) {
          const inst = loan.installments[0];
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
          });
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

    // Compute grand total
    const grandTotal = {
      baseContribution: projections.reduce((s, p) => s + p.baseContribution, 0),
      loanInstallmentPrincipal: projections.reduce(
        (s, p) => s + p.loanInstallmentPrincipal,
        0
      ),
      accruedInterest: projections.reduce((s, p) => s + p.accruedInterest, 0),
      totalDue: projections.reduce((s, p) => s + p.totalDue, 0),
    };

    return NextResponse.json({
      targetMonthYear,
      baseContribution,
      projections,
      grandTotal,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
