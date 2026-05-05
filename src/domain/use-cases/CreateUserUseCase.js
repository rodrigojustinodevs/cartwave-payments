'use strict';

const { User, UserRole } = require('../entities/User');

class CreateUserUseCase {
  /**
   * @param {import('../ports/UserRepositoryPort').UserRepositoryPort} userRepository
   * @param {import('../ports/PasswordHasherPort').PasswordHasherPort} passwordHasher
   */
  constructor(userRepository, passwordHasher) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  /**
   * @param {{ email: string, name: string, password: string, role?: string }} input
   */
  async execute({ email, name, password, role }) {
    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      const err = new Error('Email already registered');
      err.code = 'EMAIL_ALREADY_REGISTERED';
      throw err;
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const userRole = role && Object.values(UserRole).includes(role) ? role : UserRole.USER;

    const user = new User({
      email: normalizedEmail,
      name,
      passwordHash,
      role: userRole,
    });

    const saved = await this.userRepository.save(user);
    return saved.toJSON();
  }
}

module.exports = { CreateUserUseCase };
