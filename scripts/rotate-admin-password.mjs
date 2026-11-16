import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Safe Credential-Rotation Procedure for Administrator Accounts
 * Usage: node scripts/rotate-admin-password.mjs <optional-new-password>
 */
async function main() {
  const customPassword = process.argv[2] || process.env.NEW_ADMIN_PASSWORD;

  // Enforce strong password policy for administrator accounts (min 12 chars)
  const newPassword = customPassword || 'PurePicks@AdminSecure2026!';

  if (newPassword.length < 12) {
    console.error('ERROR: Administrator password must be at least 12 characters long.');
    process.exit(1);
  }

  // Find the primary administrator account
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    console.error('ERROR: No administrator account found in database.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Atomically update password and increment tokenVersion to revoke all active sessions
  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: {
      password: hashedPassword,
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tokenVersion: true,
      updatedAt: true,
    },
  });

  console.log('================================================================');
  console.log('       ADMINISTRATOR CREDENTIAL ROTATION COMPLETED              ');
  console.log('================================================================');
  console.log(`Admin Account:      ${updated.email} (${updated.name})`);
  console.log(`New Stored Hash:    Bcrypt (12 rounds)`);
  console.log(`Session Security:   tokenVersion incremented to ${updated.tokenVersion} (all active sessions revoked)`);
  console.log(`Timestamp:          ${updated.updatedAt.toISOString()}`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Rotation procedure failed:', err);
  process.exit(1);
});
