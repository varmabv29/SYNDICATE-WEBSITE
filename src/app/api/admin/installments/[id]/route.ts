import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    
    // First, get the installment to check its state
    const installment = await prisma.installment.findUnique({
      where: { id }
    });

    if (!installment) {
      return NextResponse.json({ error: "Installment not found" }, { status: 404 });
    }

    if (installment.status === "PAID") {
      return NextResponse.json({ error: "Installment already paid" }, { status: 400 });
    }

    const updated = await prisma.installment.update({
      where: { id },
      data: {
        status: "PAID",
        amountPaid: installment.amountDue,
        interestPaid: installment.interestDue ?? 0,
        paidDate: new Date()
      }
    });

    // Check if all installments for this loan are now paid
    const pendingInstallments = await prisma.installment.count({
      where: {
        loanId: installment.loanId,
        status: "PENDING"
      }
    });

    if (pendingInstallments === 0) {
      // Mark loan as settled
      await prisma.loan.update({
        where: { id: installment.loanId },
        data: { status: "SETTLED" }
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
