import "dotenv/config";
import { db } from "../db/index.ts";
import { staffAccounts } from "../db/schema/index.ts";

async function runSeed() {
  console.log("🌱 Seeding Admin User...");

  try {
    await db.insert(staffAccounts).values({
      name: "Ko",
      email: "ko@gmail.com",
      passwordHash: "$2b$12$E2sJ8p5s.CHEy34mteV0POARdc2LyWsPSdIaZbHA2q3DvtH7zsKnq",
      role: "ADMIN",
      status: "ACTIVE",
    }).onConflictDoUpdate({
      target: [staffAccounts.email],
      set: {
        name: "Ko",
        passwordHash: "$2b$12$E2sJ8p5s.CHEy34mteV0POARdc2LyWsPSdIaZbHA2q3DvtH7zsKnq",
        role: "ADMIN",
        status: "ACTIVE",
      }
    });

    console.log("✅ Admin user seeded successfully!");
  } catch (error) {
    console.error("❌ Failed to seed admin user:", error);
  }
  process.exit(0);
}

runSeed();
