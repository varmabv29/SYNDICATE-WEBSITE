import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: loanId } = await params;
    
    // Fetch loan and all pending installments. Ensure it belongs to the member.
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        installments: {
          orderBy: { dueDate: "asc" }
        }
      }
    });

    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    if (loan.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (loan.status === "SETTLED" || loan.status === "FORECLOSED") {
      return NextResponse.json({ error: "Loan is already closed" }, { status: 400 });
    }

    const pendingInstallments = loan.installments.filter(i => i.status === "PENDING");
    
    if (pendingInstallments.length === 0) {
      return NextResponse.json({ error: "No pending installments to foreclose" }, { status: 400 });
    }

    let outstandingPrincipal = 0;
    pendingInstallments.forEach(i => outstandingPrincipal += i.principalDue);
    
    const currentMonthInterest = pendingInstallments[0].interestDue;
    const foreclosureCharge = 0; // Fixed at 0
    
    const settlementAmount = outstandingPrincipal + currentMonthInterest + foreclosureCharge;
    
    const today = new Date();
    const foreclosureMonth = today.toLocaleString('default', { month: 'short' }) + '-' + today.getFullYear();

    // Mark the loan as FORECLOSED
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: "FORECLOSED",
        foreclosureMonth: foreclosureMonth,
        settlementAmount: settlementAmount
      }
    });

    // Consolidate the foreclosure payment into the current pending installment
    await prisma.installment.update({
      where: { id: pendingInstallments[0].id },
      data: {
        amountDue: settlementAmount,
        amountPaid: settlementAmount,
        interestDue: currentMonthInterest,
        interestPaid: currentMonthInterest,
        principalDue: outstandingPrincipal,
        status: "PAID",
        paidDate: new Date()
      }
    });

    const idsToDelete = pendingInstallments.slice(1).map(i => i.id);
    if (idsToDelete.length > 0) {
      await prisma.installment.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }

    return NextResponse.json({ message: "Loan successfully foreclosed", settlementAmount, updatedLoan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
