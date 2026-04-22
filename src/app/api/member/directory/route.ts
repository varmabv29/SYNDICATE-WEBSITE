import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Get total interest collected in the entire system
    const paidInstallments = await prisma.installment.findMany({
      where: { status: "PAID" },
      select: { interestPaid: true }
    });
    const totalGroupInterest = paidInstallments.reduce((sum: number, inst: any) => sum + (inst.interestPaid || 0), 0);

    const expenditures = await prisma.expenditure.findMany({
      where: { isChitPayment: true }
    });
    const totalChitContributions = expenditures.reduce((sum: number, e: any) => sum + e.amount, 0);

    // 2. Get all members (excluding ADMIN)
    const members = await prisma.user.findMany({
      where: { role: "MEMBER" },
      include: {
        premiums: {
          select: { amount: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const totalMembers = members.length;
    const dividendPerMember = totalMembers > 0 ? (totalGroupInterest / totalMembers) : 0;
    const chitShare = totalMembers > 0 ? (totalChitContributions / totalMembers) : 0;

    // 3. Calculate NAV for each member
    const directory = members.map((member: any) => {
      const totalPremiumPaid = member.premiums.reduce((sum: number, p: any) => sum + p.amount, 0);
      const nav = totalPremiumPaid + dividendPerMember + chitShare;

      return {
        id: member.id,
        name: member.name,
        username: member.username,
        totalPremiumPaid,
        dividendEarned: dividendPerMember,
        chitShare,
        nav
      };
    });

    return NextResponse.json({
      totalGroupInterest,
      totalMembers,
      dividendPerMember,
      chitShare,
      members: directory
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
