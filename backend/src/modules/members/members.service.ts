import { prisma } from '../../lib/prisma';

export async function listMembers(boardId: string) {
  return prisma.boardMember.findMany({ where: { boardId }, include: { user: { select: { id: true, name: true, email: true } } } });
}

type UpsertResult =
  | { error: 'USER_NOT_FOUND' | 'LAST_OWNER' }
  | { member: { id: string; boardId: string; userId: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' }; created: boolean; roleChanged: boolean };

export async function upsertMember(boardId: string, email: string, role: 'OWNER' | 'EDITOR' | 'VIEWER'): Promise<UpsertResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: 'USER_NOT_FOUND' };
  const existing = await prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId: user.id } } });
  // Never let the last remaining OWNER be demoted.
  if (existing?.role === 'OWNER' && role !== 'OWNER') {
    const ownerCount = await prisma.boardMember.count({ where: { boardId, role: 'OWNER' } });
    if (ownerCount <= 1) return { error: 'LAST_OWNER' };
  }
  const member = await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    update: { role },
    create: { boardId, userId: user.id, role },
  });
  return { member, created: !existing, roleChanged: existing ? existing.role !== role : false };
}

type RemoveResult = { error: 'LAST_OWNER' } | { removed: boolean; userId: string };

export async function removeMember(boardId: string, userId: string): Promise<RemoveResult> {
  const existing = await prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  if (!existing) return { removed: false, userId };
  // Never let the last remaining OWNER be removed.
  if (existing.role === 'OWNER') {
    const ownerCount = await prisma.boardMember.count({ where: { boardId, role: 'OWNER' } });
    if (ownerCount <= 1) return { error: 'LAST_OWNER' };
  }
  await prisma.boardMember.deleteMany({ where: { boardId, userId } });
  return { removed: true, userId };
}
