import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function GET(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const loans = await prisma.loan.findMany({
      include: {
        user: { select: { name: true, username: true } },
        installments: {
          orderBy: { dueDate: "asc" }
        }
      },
      orderBy: { startDate: "desc" }
    });

    return NextResponse.json(loans);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, principalAmount, interestRate, startDate, durationMonths } = await req.json();

    if (!userId || !principalAmount || !interestRate || !durationMonths) {
      return NextResponse.json({ error: "Missing required fields (including interest rate)" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { loans: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const loanCount = user.loans.length + 1;
    const memberSerialStr = user.memberSerial ? String(user.memberSerial).padStart(3, '0') : "000";
    
    // Use the start date for the month representation
    const startDateObj = startDate ? new Date(startDate) : new Date();
    const monthStr = startDateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();

    const customId = `${memberSerialStr}_${monthStr}_L${loanCount}`;

    const loanData: any = {
      userId,
      principalAmount: parseFloat(principalAmount),
      interestRate: parseFloat(interestRate),
      startDate: startDateObj,
      status: "ACTIVE",
      customId,
    };

    const loan = await prisma.loan.create({
      data: loanData
    });

    const amount = parseFloat(principalAmount);
    const months = parseInt(durationMonths);
    const rate = parseFloat(interestRate);
    
    // Custom Reducing Balance Equalized EMI:
    // 1. Principal is paid down equally each month (P_chunk)
    // 2. Interest is calculated on the remaining principal for that month
    // 3. All monthly interests are summed up to find Total Interest
    // 4. Total Interest is then divided equally across all months to produce a fixed, equal EMI.
    const principalChunk = amount / months;
    let simulatedRemainingPrincipal = amount;
    let totalInterest = 0;

    for (let i = 1; i <= months; i++) {
      const currentMonthInterest = simulatedRemainingPrincipal * (rate / 100);
      totalInterest += currentMonthInterest;
      simulatedRemainingPrincipal -= principalChunk;
    }

    const interestChunk = totalInterest / months;
    const installmentAmount = principalChunk + interestChunk;
    
    const installmentsData = [];

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(loan.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const monthYear = dueDate.toLocaleString('default', { month: 'short' }) + '-' + dueDate.getFullYear();

      installmentsData.push({
        loanId: loan.id,
        monthYear: monthYear,
        amountDue: installmentAmount,
        principalDue: principalChunk,
        interestDue: interestChunk,
        dueDate: dueDate,
        status: "PENDING"
      });
    }

    await prisma.installment.createMany({
      data: installmentsData
    });

    const newLoan = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { installments: true }
    });

    return NextResponse.json(newLoan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
