'use strict';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn(() => ({})),
}));
jest.mock('@prisma/client', () => {
  const mDisconnect = jest.fn().mockResolvedValue(undefined);
  const mockInstance = { $disconnect: mDisconnect };
  return {
    PrismaClient: jest.fn(() => mockInstance),
  };
});

describe('database prisma singleton', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('getPrisma() deve devolver a mesma instância em chamadas repetidas', () => {
    const { getPrisma } = require('../../../src/infrastructure/database/prisma');

    const p1 = getPrisma();
    const p2 = getPrisma();

    expect(p1).toBe(p2);
  });

  it('disconnect() deve chamar $disconnect', async () => {
    const { getPrisma, disconnect } = require('../../../src/infrastructure/database/prisma');
    getPrisma();
    await disconnect();

    const { PrismaClient } = require('@prisma/client');
    const instance = PrismaClient.mock.results[0].value;
    expect(instance.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnect() sem instância criada não deve falhar', async () => {
    const { disconnect } = require('../../../src/infrastructure/database/prisma');
    await expect(disconnect()).resolves.toBeUndefined();
  });
});
