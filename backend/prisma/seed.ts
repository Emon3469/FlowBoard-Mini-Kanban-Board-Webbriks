import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Flowboard123!', 12);
  const alice = await prisma.user.upsert({ where: { email: 'alice@flowboard.dev' }, update: {}, create: { name: 'Alice Morgan', email: 'alice@flowboard.dev', passwordHash } });
  const bob = await prisma.user.upsert({ where: { email: 'bob@flowboard.dev' }, update: {}, create: { name: 'Bob Chen', email: 'bob@flowboard.dev', passwordHash } });

  // Idempotent: only create the demo board if it isn't already present.
  let board = await prisma.board.findFirst({ where: { ownerId: alice.id, name: 'Launch week' }, include: { columns: { orderBy: { position: 'asc' } } } });
  if (!board) {
    board = await prisma.board.create({
      data: {
        name: 'Launch week',
        ownerId: alice.id,
        members: { create: [{ userId: alice.id, role: 'OWNER' }, { userId: bob.id, role: 'EDITOR' }] },
        columns: {
          create: [
            { name: 'Backlog', position: 1024, tasks: { create: [
              { title: 'Map the first release', position: 1024, description: 'Turn the brief into a tiny, testable slice.', priority: 'HIGH', labels: ['planning'] },
              { title: 'Draft launch checklist', position: 2048, priority: 'MEDIUM', labels: ['docs'] },
            ] } },
            { name: 'In progress', position: 2048, tasks: { create: [
              { title: 'Wire optimistic drag-and-drop', position: 1024, priority: 'URGENT', assigneeId: alice.id, dueDate: new Date(Date.now() + 2 * 86_400_000), labels: ['frontend'] },
            ] } },
            { name: 'Shipped', position: 3072, tasks: { create: [
              { title: 'Set up CI', position: 1024, priority: 'LOW', labels: ['infra'] },
            ] } },
          ],
        },
      },
      include: { columns: { orderBy: { position: 'asc' } } },
    });
  }

  const shipped = board.columns.find((column) => column.name === 'Shipped');
  if (shipped && !(await prisma.automation.findFirst({ where: { boardId: board.id, name: 'Celebrate shipped work' } }))) {
    await prisma.automation.create({ data: { boardId: board.id, name: 'Celebrate shipped work', enabled: true, triggerColumnId: shipped.id, action: 'add_label', actionValue: 'shipped' } });
  }

  if (!(await prisma.note.findFirst({ where: { userId: alice.id, title: 'Welcome to FlowBoard' } }))) {
    await prisma.note.create({ data: { userId: alice.id, title: 'Welcome to FlowBoard', content: 'Use Notes for quick thoughts. Try the List, Kanban, and Timeline views on your board, and drag a card into "Shipped" to see an automation fire.' } });
  }

  await prisma.favorite.upsert({ where: { userId_boardId: { userId: alice.id, boardId: board.id } }, update: {}, create: { userId: alice.id, boardId: board.id } });

  if (!(await prisma.notification.findFirst({ where: { userId: bob.id, type: 'member_added', boardId: board.id } }))) {
    await prisma.notification.create({ data: { userId: bob.id, type: 'member_added', title: `You were added to "${board.name}"`, boardId: board.id, actorId: alice.id } });
  }

  console.log('✅ Seed complete. Users: alice@flowboard.dev / bob@flowboard.dev — password: Flowboard123!');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
