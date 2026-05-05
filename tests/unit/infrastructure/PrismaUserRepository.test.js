'use strict';

const { PrismaClientKnownRequestError } = require('@prisma/client-runtime-utils');
const { PrismaUserRepository } = require('../../../src/infrastructure/database/repositories/PrismaUserRepository');
const { User, UserRole } = require('../../../src/domain/entities/User');

function userRow(overrides = {}) {
  return {
    id: 'u1',
    email: 'a@b.com',
    name: 'User Name',
    passwordHash: 'hash',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePrisma(overrides = {}) {
  const row = userRow(overrides.row);
  return {
    user: {
      create: jest.fn().mockResolvedValue(row),
      findUnique: jest.fn().mockResolvedValue(row),
      findFirst: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([row]),
    },
    $transaction: jest.fn().mockImplementation(async (ops) => {
      const results = [];
      for (const op of ops) {
        results.push(await op);
      }
      return results;
    }),
    ...overrides,
  };
}

describe('PrismaUserRepository (unit)', () => {
  it('save deve criar user e mapear User', async () => {
    const prisma = makePrisma();
    const repo = new PrismaUserRepository(prisma);
    const user = new User({ email: 'a@b.com', name: 'User Name', passwordHash: 'hash' });

    const out = await repo.save(user);

    expect(prisma.user.create).toHaveBeenCalled();
    expect(out).toBeInstanceOf(User);
    expect(out.email).toBe('a@b.com');
  });

  it('findById deve devolver null quando vazio', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    const repo = new PrismaUserRepository(prisma);

    const result = await repo.findById('missing');

    expect(result).toBeNull();
  });

  it('findByEmail deve usar equals com mode insensitive', async () => {
    const prisma = makePrisma();
    const repo = new PrismaUserRepository(prisma);

    await repo.findByEmail('A@B.COM');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'a@b.com', mode: 'insensitive' } },
    });
  });

  it('list deve usar $transaction com count e findMany', async () => {
    const prisma = makePrisma();
    const repo = new PrismaUserRepository(prisma);

    const result = await repo.list({ page: 1, pageSize: 10 });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
  });

  it('findByEmail deve devolver null quando não há utilizador', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.mockResolvedValue(null);
    const repo = new PrismaUserRepository(prisma);

    const result = await repo.findByEmail('x@y.com');

    expect(result).toBeNull();
  });

  it('update deve persistir alterações', async () => {
    const prisma = makePrisma();
    const repo = new PrismaUserRepository(prisma);
    const user = new User({ email: 'a@b.com', name: 'User Name', passwordHash: 'hash', id: 'u1' });

    const out = await repo.update(user);

    expect(prisma.user.update).toHaveBeenCalled();
    expect(out).toBeInstanceOf(User);
  });

  describe('tratamento de erros Prisma', () => {
    function p2002() {
      return new PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: {},
      });
    }
    function p2003() {
      return new PrismaClientKnownRequestError('fk', {
        code: 'P2003',
        clientVersion: 'test',
        meta: {},
      });
    }

    it('save deve mapear P2002', async () => {
      const prisma = makePrisma();
      prisma.user.create.mockRejectedValueOnce(p2002());
      const repo = new PrismaUserRepository(prisma);
      const user = new User({ email: 'a@b.com', name: 'User Name', passwordHash: 'h' });
      await expect(repo.save(user)).rejects.toThrow('Unique constraint violation');
    });

    it('save deve propagar erro não Prisma', async () => {
      const prisma = makePrisma();
      prisma.user.create.mockRejectedValueOnce(new Error('x'));
      const repo = new PrismaUserRepository(prisma);
      const user = new User({ email: 'a@b.com', name: 'User Name', passwordHash: 'h' });
      await expect(repo.save(user)).rejects.toThrow('x');
    });

    it('update deve mapear P2003', async () => {
      const prisma = makePrisma();
      prisma.user.update.mockRejectedValueOnce(p2003());
      const repo = new PrismaUserRepository(prisma);
      const user = new User({ email: 'a@b.com', name: 'User Name', passwordHash: 'h', id: 'u1' });
      await expect(repo.update(user)).rejects.toThrow('Foreign key constraint violation');
    });
  });
});
