const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Group Admin",
      username: "admin",
      passwordHash: adminPassword,
      role: "ADMIN"
    }
  });

  // Create Member 1
  const member1Password = await bcrypt.hash("member123", 10);
  const member1 = await prisma.user.upsert({
    where: { username: "alice" },
    update: {},
    create: {
      name: "Alice Smith",
      username: "alice",
      passwordHash: member1Password,
      role: "MEMBER"
    }
  });

  // Create Member 2
  const member2Password = await bcrypt.hash("member123", 10);
  const member2 = await prisma.user.upsert({
    where: { username: "bob" },
    update: {},
    create: {
      name: "Bob Jones",
      username: "bob",
      passwordHash: member2Password,
      role: "MEMBER"
    }
  });

  console.log("Created users: admin, alice, bob (passwords: admin123, member123)");

  // Seed sample premiums for Alice
  await prisma.premium.createMany({
    data: [
      { userId: member1.id, amount: 100, datePaid: new Date(new Date().setMonth(new Date().getMonth() - 2)) },
      { userId: member1.id, amount: 100, datePaid: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      { userId: member1.id, amount: 100, datePaid: new Date() },
    ]
  });

  // Seed sample loan for Bob
  const loan = await prisma.loan.create({
    data: {
      userId: member2.id,
      principalAmount: 1000,
      interestRate: 1,
      startDate: new Date(),
      status: "ACTIVE",
      customId: "002_MAR_L1"
    }
  });

  await prisma.installment.createMany({
    data: [
      { loanId: loan.id, amountDue: 250, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), status: "PENDING" },
      { loanId: loan.id, amountDue: 250, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 2)), status: "PENDING" },
      { loanId: loan.id, amountDue: 250, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 3)), status: "PENDING" },
      { loanId: loan.id, amountDue: 250, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 4)), status: "PENDING" },
    ]
  });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
