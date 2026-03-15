const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const userCount = await prisma.user.count();
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    
    console.log("=== Database Check ===");
    console.log("Total users:", userCount);
    console.log("Admin account found:", !!admin);
    if (admin) {
      console.log("Admin role:", admin.role);
    }
    console.log("======================");
  } catch (err) {
    console.error("Check failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
