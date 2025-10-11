import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log("🌱 Seeding admin user...");
    
    const email = "admin@curagenesis.com";
    const password = "Money100!";
    const name = "Admin User";

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log("⚠️  Admin user already exists, updating password...");
      
      // Update password
      const hashedPassword = await hashPassword(password);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: "ADMIN",
          active: true,
          onboardStatus: "ACTIVE",
        }
      });
      
      console.log("✅ Admin password updated successfully!");
    } else {
      // Create new admin
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: "ADMIN",
          active: true,
          onboardStatus: "ACTIVE",
          onboardedAt: new Date(),
        }
      });
      
      console.log("✅ Admin user created successfully!");
    }
    
    console.log("📧 Email: admin@curagenesis.com");
    console.log("🔑 Password: Money100!");
    
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if called directly
if (require.main === module) {
  seedAdmin();
}

export { seedAdmin };
