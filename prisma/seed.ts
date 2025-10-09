import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@curagenesis.com" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Admin User",
      email: "admin@curagenesis.com",
      role: "ADMIN",
      active: true,
    },
  });

  console.log("✅ Created admin user:", admin.email);

  // Create sales rep
  const rep = await prisma.user.upsert({
    where: { email: "rep@curagenesis.com" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Sales Rep",
      email: "rep@curagenesis.com",
      role: "AGENT",
      active: true,
    },
  });

  console.log("✅ Created sales rep:", rep.email);

  // Create sample account
  const account = await prisma.account.create({
    data: {
      practiceName: "Sample Medical Center",
      state: "CA",
      city: "San Francisco",
      addressLine1: "123 Market Street",
      zip: "94102",
      phoneDisplay: "(555) 123-4567",
      phoneE164: "+15551234567",
      email: "contact@samplemedical.com",
      status: "PENDING",
      ownerRepId: rep.id,
    },
  });

  console.log("✅ Created sample account:", account.practiceName);

  // Create sample contact
  const contact = await prisma.contact.create({
    data: {
      accountId: account.id,
      contactType: "admin",
      fullName: "Dr. Jane Smith",
      title: "Practice Manager",
      email: "jsmith@samplemedical.com",
      phoneDisplay: "(555) 987-6543",
      phoneE164: "+15559876543",
      preferredContactMethod: "email",
    },
  });

  console.log("✅ Created sample contact:", contact.fullName);

  console.log("🎉 Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
