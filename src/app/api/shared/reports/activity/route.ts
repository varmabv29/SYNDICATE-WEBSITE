import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId"); // specific user or empty for self
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const viewMode = searchParams.get("viewMode") || "individual"; // "aggregated" or "individual"

  // Transaction type toggles (comma-separated): "premiums,principal,interest"
  const typesParam = searchParams.get("types") || "premiums,principal,interest";
  const types = typesParam.split(",").map((t) => t.trim());
  const includePremiums = types.includes("premiums");
  const includePrincipal = types.includes("principal");
  const includeInterest = types.includes("interest");

  const isAdmin = session.user.role === "ADMIN";
  const targetUserId = userId || (isAdmin ? undefined : session.user.id);

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

    const results: any[] = [];

    // 1. Premiums (Collected Amount / Savings)
    if (includePremiums) {
      const premiumWhere: any = {};
      if (targetUserId) premiumWhere.userId = targetUserId;
      if (hasDateFilter) premiumWhere.datePaid = dateFilter;

      const premiums = await prisma.premium.findMany({
        where: premiumWhere,
        include: { user: { select: { name: true, username: true } } },
        orderBy: { datePaid: "asc" },
      });

      if (viewMode === "aggregated") {
        const total = premiums.reduce((s, p) => s + p.amount, 0);
        if (total > 0) {
          results.push({
            type: "Collected Amount",
            totalAmount: total,
            count: premiums.length,
          });
        }
      } else {
        premiums.forEach((p) => {
          results.push({
            type: "Collected Amount",
            date: p.datePaid,
            amount: p.amount,
            memberName: p.user.name || p.user.username,
            username: p.user.username,
            description: "Monthly Contribution",
          });
        });
      }
    }

    // 2 & 3. Loan payments (Principal Paid and/or Interest Paid)
    if (includePrincipal || includeInterest) {
      const installmentWhere: any = {
        status: "PAID",
      };
      if (targetUserId) installmentWhere.loan = { userId: targetUserId };
      if (hasDateFilter) installmentWhere.paidDate = dateFilter;

      const paidInstallments = await prisma.installment.findMany({
        where: installmentWhere,
        include: {
          loan: {
            select: {
              customId: true,
              user: { select: { name: true, username: true } },
            },
          },
        },
        orderBy: { paidDate: "asc" },
      });

      if (viewMode === "aggregated") {
        if (includePrincipal) {
          const totalPrincipal = paidInstallments.reduce(
            (s, i) => s + (i.amountPaid - i.interestPaid),
            0
          );
          if (totalPrincipal > 0) {
            results.push({
              type: "Loans Paid (Principal)",
              totalAmount: totalPrincipal,
              count: paidInstallments.length,
            });
          }
        }
        if (includeInterest) {
          const totalInterest = paidInstallments.reduce(
            (s, i) => s + i.interestPaid,
            0
          );
          if (totalInterest > 0) {
            results.push({
              type: "Interest Paid",
              totalAmount: totalInterest,
              count: paidInstallments.length,
            });
          }
        }
      } else {
        paidInstallments.forEach((inst) => {
          const principalPaid = inst.amountPaid - inst.interestPaid;
          if (includePrincipal) {
            results.push({
              type: "Loans Paid (Principal)",
              date: inst.paidDate,
              amount: principalPaid,
              memberName: inst.loan.user.name || inst.loan.user.username,
              username: inst.loan.user.username,
              description: `Loan ${inst.loan.customId} — ${inst.monthYear}`,
            });
          }
          if (includeInterest) {
            results.push({
              type: "Interest Paid",
              date: inst.paidDate,
              amount: inst.interestPaid,
              memberName: inst.loan.user.name || inst.loan.user.username,
              username: inst.loan.user.username,
              description: `Loan ${inst.loan.customId} — ${inst.monthYear}`,
            });
          }
        });
      }
    }

    // Sort individual results by date
    if (viewMode === "individual") {
      results.sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    // Grand totals
    const grandTotal = results.reduce(
      (s, r) => s + (r.totalAmount || r.amount || 0),
      0
    );

    return NextResponse.json({
      viewMode,
      types,
      results,
      grandTotal,
      count: results.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
