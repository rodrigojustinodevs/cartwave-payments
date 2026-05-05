'use strict';

class LoginUseCase {
  /**
   * @param {import('../ports/UserRepositoryPort').UserRepositoryPort} userRepository
   * @param {import('../ports/PasswordHasherPort').PasswordHasherPort} passwordHasher
   * @param {import('../ports/TokenServicePort').TokenServicePort} tokenService
   */
  constructor(userRepository, passwordHasher, tokenService) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  /**
   * @param {{ email: string, password: string }} input
   * @returns {Promise<{ token: string, user: object }>}
   */
  async execute({ email, password }) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    let valid = false;
    if (user) {
      valid = await this.passwordHasher.compare(password, user.passwordHash);
    }

    if (!valid) {
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const token = this.tokenService.sign({ sub: user.id, role: user.role });

    return {
      token,
      user: user.toJSON(),
    };
  }
}

module.exports = { LoginUseCase };
