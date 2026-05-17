import mongoose from "mongoose";

import { connectDatabase } from "../src/config/db.js";
import { User } from "../src/models/User.js";

const identifier = process.argv[2]?.trim().toLowerCase();

if (!identifier) {
  console.error("Usage: node scripts/promote-admin.js <email-or-userId>");
  process.exit(1);
}

const run = async () => {
  await connectDatabase();

  const user = await User.findOne({
    $or: [{ email: identifier }, { userId: identifier }]
  });

  if (!user) {
    console.error(`User not found for identifier: ${identifier}`);
    process.exitCode = 1;
    return;
  }

  user.role = "admin";
  await user.save();

  console.log(`Promoted ${user.email} (${user.userId}) to admin.`);
};

run()
  .catch((error) => {
    console.error("Failed to promote admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
