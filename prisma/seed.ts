/**
 * Seed script — creates the initial petition record.
 * Run with: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create the main petition
  const petition = await prisma.petition.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000001",
    },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Voice of Gudalur Community Petition",
      description:
        "A community-driven petition for the people of Gudalur. " +
        "We, the residents and supporters of Gudalur, call for [specific demands to be inserted]. " +
        "This petition represents the collective voice of our community.",
      consent_version: "1.0",
      status: "active",
    },
  });

  console.log(`Seeded petition: ${petition.title} (ID: ${petition.id})`);
  console.log("Database is ready for signatures.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
