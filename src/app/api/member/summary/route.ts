import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const startMonthStr = searchParams.get("start"); // Expected format: YYYY-MM
  const endMonthStr = searchParams.get("end");     // Expected format: YYYY-MM

  try {
    let premiums = await prisma.premium.findMany({ where: { userId } });
    let installments = await prisma.installment.findMany({
      where: { 
        status: "PAID",
        loan: { userId }
      }
    });

    if (startMonthStr && endMonthStr) {
      const parseLimit = (my: string, isEnd: boolean) => {
        const [y, m] = my.split('-');
        if (isEnd) return new Date(parseInt(y), parseInt(m), 0, 23, 59, 59).getTime();
        return new Date(parseInt(y), parseInt(m) - 1, 1).getTime();
      };
      
      const startTime = parseLimit(startMonthStr, false);
      const endTime = parseLimit(endMonthStr, true);

      premiums = premiums.filter(p => {
        const t = new Date(p.datePaid).getTime();
        return t >= startTime && t <= endTime;
      });

      installments = installments.filter(i => {
        const t = new Date(i.paidDate || i.dueDate).getTime();
        return t >= startTime && t <= endTime;
      });
    }

    const totalPremiums = premiums.reduce((sum, p) => sum + p.amount, 0);
    const totalPrincipalRepaid = installments.reduce((sum, i) => sum + (i.amountPaid - i.interestPaid), 0);
    const totalInterestCollected = installments.reduce((sum, i) => sum + i.interestPaid, 0);

    return NextResponse.json({
      totalPremiums,
      totalPrincipalRepaid,
      totalInterestCollected,
      countPremiums: premiums.length,
      countInstallments: installments.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
