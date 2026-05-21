import { jest } from '@jest/globals';

const mDisconnect = jest.fn().mockResolvedValue(undefined);
const mockInstance = { $disconnect: mDisconnect };
const PrismaClientMock = jest.fn(() => mockInstance);
const PrismaPgMock = jest.fn(() => ({}));

jest.unstable_mockModule('@prisma/adapter-pg', () => ({
  PrismaPg: PrismaPgMock,
}));
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: PrismaClientMock,
}));

describe('database prisma singleton', () => {
  beforeEach(() => {
    jest.resetModules();
    mDisconnect.mockClear();
    PrismaClientMock.mockClear();
    PrismaPgMock.mockClear();
  });

  it('getPrisma() deve devolver a mesma instância em chamadas repetidas', async () => {
    const { getPrisma } = await import('../../../src/infrastructure/database/prisma.js');

    const p1 = getPrisma();
    const p2 = getPrisma();

    expect(p1).toBe(p2);
  });

  it('disconnect() deve chamar $disconnect', async () => {
    const { getPrisma, disconnect } = await import('../../../src/infrastructure/database/prisma.js');
    getPrisma();
    await disconnect();

    expect(mDisconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnect() sem instância criada não deve falhar', async () => {
    const { disconnect } = await import('../../../src/infrastructure/database/prisma.js');
    await expect(disconnect()).resolves.toBeUndefined();
  });
});
