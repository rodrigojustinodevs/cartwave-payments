import { User, UserRole, type UserRoleType } from '../entities/User.js';
import type { UserRepositoryPort } from '../ports/UserRepositoryPort.js';
import type { PasswordHasherPort } from '../ports/PasswordHasherPort.js';
import type { CodedError } from '../../types/errors.js';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute({ email, name, password, role }: CreateUserInput) {
    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      const err = new Error('Email already registered') as CodedError;
      err.code = 'EMAIL_ALREADY_REGISTERED';
      throw err;
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const userRole: UserRoleType =
      role && (Object.values(UserRole) as string[]).includes(role)
        ? (role as UserRoleType)
        : UserRole.USER;

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
