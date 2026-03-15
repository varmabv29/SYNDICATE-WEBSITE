const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting database cleanup...");

  try {
    // Delete all installments, loans, and premiums
    const deletedInstallments = await prisma.installment.deleteMany({});
    console.log(`Deleted ${deletedInstallments.count} Installments`);
    
    const deletedLoans = await prisma.loan.deleteMany({});
    console.log(`Deleted ${deletedLoans.count} Loans`);

    const deletedPremiums = await prisma.premium.deleteMany({});
    console.log(`Deleted ${deletedPremiums.count} Premiums`);

    // Delete all members (exclude admin)
    const deletedMembers = await prisma.user.deleteMany({
      where: { role: "MEMBER" }
    });
    console.log(`Deleted ${deletedMembers.count} Members`);

    // Reset global settings to 0
    await prisma.setting.upsert({
      where: { id: "global" },
      update: { monthlyPremium: 0 },
      create: { id: "global", monthlyPremium: 0 }
    });
    console.log(`Reset Global Settings`);

    console.log("\n✅ Database cleared successfully! Only the Admin account remains.");
  } catch (error) {
    console.error("Error clearing database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
