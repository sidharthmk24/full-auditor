import { prisma, Role } from './index';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('[Seed] Seeding initial database data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@megamind.studio' },
    update: {},
    create: {
      email: 'admin@megamind.studio',
      name: 'Administrator',
      passwordHash,
    },
  });

  const org = await prisma.organization.upsert({
    where: { id: 'org-master-default' },
    update: {},
    create: {
      id: 'org-master-default',
      name: 'Megamind Studios',
      members: {
        create: {
          userId: user.id,
          role: Role.ADMIN,
        },
      },
    },
  });

  console.log(`[Seed] Seeded admin user: ${user.email} (Password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

