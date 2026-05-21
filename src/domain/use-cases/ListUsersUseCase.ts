import type { UserRepositoryPort } from '../ports/UserRepositoryPort.js';

export interface ListUsersParams {
  page?: string | number;
  pageSize?: string | number;
}

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(params: ListUsersParams = {}) {
    const page = Math.max(1, parseInt(String(params.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize), 10) || 20));

    const { items, total } = await this.userRepository.list({ page, pageSize });

    return {
      items: items.map((u) => u.toJSON()),
      page,
      pageSize,
      total,
    };
  }
}
