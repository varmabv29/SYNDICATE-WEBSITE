const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function debugLogin() {
  try {
    const user = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!user) {
      console.log("User 'admin' not found.");
      return;
    }

    const testPassword = "Admin@123";
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    
    console.log("=== Debug Login Result ===");
    console.log("Username found:", user.username);
    console.log("Password hash exists:", !!user.passwordHash);
    console.log("Comparison with 'Admin@123':", isValid ? "SUCCESS" : "FAILED");
    console.log("===========================");

  } catch (err) {
    console.error("Debug failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugLogin();
