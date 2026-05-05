'use strict';

class UpdateUserUseCase {
  /**
   * @param {import('../ports/UserRepositoryPort').UserRepositoryPort} userRepository
   * @param {import('../ports/PasswordHasherPort').PasswordHasherPort} passwordHasher
   */
  constructor(userRepository, passwordHasher) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  /**
   * @param {string} id
   * @param {{ name?: string, password?: string }} updates
   */
  async execute(id, updates) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (updates.name !== undefined) {
      user.updateProfile({ name: updates.name });
    }

    if (updates.password !== undefined && updates.password !== '') {
      const hash = await this.passwordHasher.hash(updates.password);
      user.changePasswordHash(hash);
    }

    const saved = await this.userRepository.update(user);
    return saved.toJSON();
  }
}

module.exports = { UpdateUserUseCase };
