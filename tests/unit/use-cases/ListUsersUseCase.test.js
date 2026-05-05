'use strict';

const { ListUsersUseCase } = require('../../../src/domain/use-cases/ListUsersUseCase');
const { User } = require('../../../src/domain/entities/User');

describe('ListUsersUseCase', () => {
  it('should return paginated items', async () => {
    const u1 = new User({ email: 'a@b.com', name: 'Al', passwordHash: 'h' });
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [u1], total: 1 }),
    };
    const uc = new ListUsersUseCase(repo);

    const out = await uc.execute({ page: 1, pageSize: 20 });

    expect(out.total).toBe(1);
    expect(out.items).toHaveLength(1);
    expect(out.page).toBe(1);
    expect(out.pageSize).toBe(20);
  });
});
