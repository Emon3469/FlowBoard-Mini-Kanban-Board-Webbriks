export const prismaMock = {
  user: { findUnique: jest.fn(), create: jest.fn() },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  board: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  boardMember: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  column: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  task: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn() },
  note: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
  favorite: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  notification: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  integration: { findMany: jest.fn(), upsert: jest.fn() },
  automation: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
};
