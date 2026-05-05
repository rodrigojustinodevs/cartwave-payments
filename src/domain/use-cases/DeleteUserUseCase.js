'use strict';

class DeleteUserUseCase {
  /**
   * @param {import('../ports/UserRepositoryPort').UserRepositoryPort} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * @param {string} id
   */
  async execute(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    await this.userRepository.delete(id);
  }
}

module.exports = { DeleteUserUseCase };
