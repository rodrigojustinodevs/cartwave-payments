import bcrypt from 'bcrypt';
import type { PasswordHasherPort } from '../../domain/ports/PasswordHasherPort.js';

export class BcryptPasswordHasher implements PasswordHasherPort {
  private readonly saltRounds: number;

  constructor(saltRounds = 10) {
    const parsed = parseInt(process.env.BCRYPT_SALT_ROUNDS || String(saltRounds), 10);
    this.saltRounds = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }

  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async compare(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
