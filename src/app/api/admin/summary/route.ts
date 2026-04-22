import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function GET(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startMonthStr = searchParams.get("start"); // Expected format: YYYY-MM
  const endMonthStr = searchParams.get("end");     // Expected format: YYYY-MM

  try {
    // Collect all data to filter manually for Month-Year logic
    // (Or use DateTime ranges if we parse them implicitly)
    let premiums = await prisma.premium.findMany();
    let installments = await prisma.installment.findMany({
      where: { status: "PAID" }
    });
    let expenditures = await prisma.expenditure.findMany();

    if (startMonthStr && endMonthStr) {
      const parseLimit = (my: string, isEnd: boolean) => {
        const [y, m] = my.split('-');
        // If it's the end month, go to the end of that month properly
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

      expenditures = expenditures.filter(e => {
        const t = new Date(e.date).getTime();
        return t >= startTime && t <= endTime;
      });
    }

    const totalPremiums = premiums.reduce((sum, p) => sum + p.amount, 0);
    const totalPrincipalRepaid = installments.reduce((sum, i) => sum + (i.amountPaid - i.interestPaid), 0);
    const totalInterestCollected = installments.reduce((sum, i) => sum + i.interestPaid, 0);
    
    const regularExpenditures = expenditures.filter(e => !e.isChitPayment);
    const chitPayments = expenditures.filter(e => e.isChitPayment);
    
    const totalExpenditures = regularExpenditures.reduce((sum, e) => sum + e.amount, 0);
    const totalChitContributions = chitPayments.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      totalPremiums,
      totalPrincipalRepaid,
      totalInterestCollected,
      totalExpenditures,
      totalChitContributions,
      countPremiums: premiums.length,
      countInstallments: installments.length,
      countExpenditures: regularExpenditures.length,
      countChitPayments: chitPayments.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
