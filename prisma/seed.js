const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MongoDB database...");

  // Create Admin
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const existingAdmin = await prisma.user.findUnique({ where: { username: "admin" } });
  let admin;
  if (existingAdmin) {
    admin = await prisma.user.update({ where: { username: "admin" }, data: { passwordHash: adminPassword } });
    console.log("Updated admin password.");
  } else {
    admin = await prisma.user.create({
      data: {
        name: "Group Admin",
        username: "admin",
        passwordHash: adminPassword,
        role: "ADMIN",
        memberSerial: 0
      }
    });
  }

  console.log("Admin user ready (username: admin, password: Admin@123)");

  // Create default setting
  const existingSetting = await prisma.setting.findFirst();
  if (!existingSetting) {
    await prisma.setting.create({ data: { monthlyPremium: 0 } });
    console.log("Default setting created.");
  }

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
