import { prisma } from '../../lib/prisma';

export async function listMembers(boardId: string) {
  return prisma.boardMember.findMany({ where: { boardId }, include: { user: { select: { id: true, name: true, email: true } } } });
}

export async function upsertMember(boardId: string, email: string, role: 'OWNER' | 'EDITOR' | 'VIEWER') {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return prisma.boardMember.upsert({ where: { boardId_userId: { boardId, userId: user.id } }, update: { role }, create: { boardId, userId: user.id, role } });
}

export async function removeMember(boardId: string, userId: string) {
  await prisma.boardMember.deleteMany({ where: { boardId, userId } });
}
