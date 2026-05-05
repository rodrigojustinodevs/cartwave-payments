'use strict';

class ListUsersUseCase {
  /**
   * @param {import('../ports/UserRepositoryPort').UserRepositoryPort} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * @param {{ page?: number, pageSize?: number }} params
   */
  async execute(params = {}) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize, 10) || 20));

    const { items, total } = await this.userRepository.list({ page, pageSize });

    return {
      items: items.map((u) => u.toJSON()),
      page,
      pageSize,
      total,
    };
  }
}

module.exports = { ListUsersUseCase };
