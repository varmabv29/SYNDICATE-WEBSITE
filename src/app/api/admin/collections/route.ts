import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function POST(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { collectionDate, entries } = await req.json();

    if (!collectionDate || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Invalid payload format. Expected collectionDate and entries array." }, { status: 400 });
    }

    const cDate = new Date(collectionDate);
    const results = [];

    // Process each user's entry sequentially to avoid transaction locks/conflicts on shared resources
    for (const entry of entries) {
      const { userId, premiumAmount, principalAmount, interestAmount } = entry;
      
      const pAmt = parseFloat(premiumAmount) || 0;
      const princAmt = parseFloat(principalAmount) || 0;
      const intAmt = parseFloat(interestAmount) || 0;

      // Skip empty entries
      if (pAmt === 0 && princAmt === 0 && intAmt === 0) {
        continue;
      }

      let premiumRecord = null;
      let installmentRecord = null;
      let loanSettled = false;
      let entryError = null;

      try {
        // Process Premium
        if (pAmt > 0) {
          premiumRecord = await prisma.premium.create({
            data: {
              userId,
              amount: pAmt,
              datePaid: cDate
            }
          });
        }
        
        results.push({ userId, success: true, premiumRecord });

      } catch (err: any) {
        results.push({ userId, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, processedCount: results.length, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
