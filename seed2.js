const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Admin
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "System Admin",
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin created: ${admin.username}`);

  // Create Member 1
  const member1PasswordHash = await bcrypt.hash("member1pass", 10);
  const member1 = await prisma.user.upsert({
    where: { username: "rajeshwar" },
    update: {},
    create: {
      name: "G. RAJESHWAR",
      username: "rajeshwar",
      passwordHash: member1PasswordHash,
      role: "MEMBER",
    },
  });
  console.log(`Member created: ${member1.username}`);

  // Create Member 2
  const member2PasswordHash = await bcrypt.hash("member2pass", 10);
  const member2 = await prisma.user.upsert({
    where: { username: "pradeep" },
    update: {},
    create: {
      name: "G. PRADEEP",
      username: "pradeep",
      passwordHash: member2PasswordHash,
      role: "MEMBER",
    },
  });
  console.log(`Member created: ${member2.username}`);

  // Set Global Premium to 1000
  const setting = await prisma.setting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      monthlyPremium: 1000,
    },
  });
  console.log(`Global setting created with default premium: ₹${setting.monthlyPremium}`);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
