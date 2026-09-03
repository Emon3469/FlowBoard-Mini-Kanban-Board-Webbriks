import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('Flowboard123!', 12);
  const alice = await prisma.user.upsert({ where: { email: 'alice@flowboard.dev' }, update: {}, create: { name: 'Alice Morgan', email: 'alice@flowboard.dev', passwordHash } });
  const bob = await prisma.user.upsert({ where: { email: 'bob@flowboard.dev' }, update: {}, create: { name: 'Bob Chen', email: 'bob@flowboard.dev', passwordHash } });
  await prisma.board.deleteMany({ where: { ownerId: alice.id } });
  await prisma.board.create({ data: { name: 'Launch week', ownerId: alice.id, members: { create: [{ userId: alice.id, role: 'OWNER' }, { userId: bob.id, role: 'EDITOR' }] }, columns: { create: [{ name: 'Backlog', position: 1024, tasks: { create: [{ title: 'Map the first release', position: 1024, description: 'Turn the brief into a tiny, testable slice.' }] } }, { name: 'In progress', position: 2048 }, { name: 'Shipped', position: 3072 }] } } });
}
main().finally(() => prisma.$disconnect());
