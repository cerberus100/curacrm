import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || "Admin User";

  if (!email || !password) {
    console.error("Usage: npm run create-admin <email> <password> [name]");
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.error("User with this email already exists");
      process.exit(1);
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create admin user
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
    console.log("Email:", user.email);
    console.log("Name:", user.name);
    console.log("Role:", user.role);
    
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
