import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") || session.user.id;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const isAdmin = session.user.role === "ADMIN";
  if (targetUserId === "all" && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // 1. Premium Statement
    const premiums = await prisma.premium.findMany({
      where: {
        ...(targetUserId === "all" ? {} : { userId: targetUserId }),
        ...(hasDateFilter ? { datePaid: dateFilter } : {}),
      },
      include: {
        user: { select: { name: true, username: true } },
      },
      orderBy: { datePaid: "asc" },
    });

    // 2. Loan Statement — all loans for the user with installments
    const loans = await prisma.loan.findMany({
      where: targetUserId === "all" ? {} : { userId: targetUserId },
      include: {
        user: { select: { name: true, username: true } },
        installments: {
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { startDate: "desc" },
    });

    // 3. Date-wise paid installments
    const paidInstallmentFilter: any = {
      status: "PAID",
      ...(targetUserId === "all" ? {} : { loan: { userId: targetUserId } }),
    };
    if (hasDateFilter) {
      paidInstallmentFilter.paidDate = dateFilter;
    }

    const paidInstallments = await prisma.installment.findMany({
      where: paidInstallmentFilter,
      include: {
        loan: {
          select: {
            customId: true,
            principalAmount: true,
            user: { select: { name: true, username: true } },
          },
        },
      },
      orderBy: { paidDate: "asc" },
    });

    // Compute summary totals
    const totalPremiums = premiums.reduce((sum, p) => sum + p.amount, 0);
    const totalPrincipalPaid = paidInstallments.reduce((sum, i) => sum + (i.amountPaid - i.interestPaid), 0);
    const totalInterestPaid = paidInstallments.reduce((sum, i) => sum + i.interestPaid, 0);
    const totalEmiPaid = paidInstallments.reduce((sum, i) => sum + i.amountPaid, 0);

    // Get target user info
    let targetUser = { name: "All Members", username: "all_members" };
    if (targetUserId !== "all") {
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, username: true },
      });
      if (user) {
        targetUser = { name: user.name || "Unknown", username: user.username };
      }
    }

    return NextResponse.json({
      targetUser,
      summary: {
        totalPremiums,
        totalPrincipalPaid,
        totalInterestPaid,
        totalEmiPaid,
        totalLoans: loans.length,
        activeLoans: loans.filter((l) => l.status === "ACTIVE").length,
      },
      premiums,
      loans,
      paidInstallments,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
