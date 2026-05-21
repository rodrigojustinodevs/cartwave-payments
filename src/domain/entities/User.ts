import { v4 as uuidv4 } from 'uuid';

export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UserProps {
  id?: string;
  email: string;
  name: string;
  passwordHash: string;
  role?: UserRoleType;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserJson {
  id: string;
  email: string;
  name: string;
  role: UserRoleType;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRoleType;
  createdAt: Date;
  updatedAt: Date;

  constructor({ id, email, name, passwordHash, role, createdAt, updatedAt }: UserProps) {
    this.id = id || uuidv4();
    this.email = email;
    this.name = name;
    this.passwordHash = passwordHash;
    this.role = role || UserRole.USER;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();

    this._validate();
  }

  private _validate(): void {
    if (!this.email || typeof this.email !== 'string' || !EMAIL_RE.test(this.email.trim())) {
      throw new Error('User email must be a valid string');
    }
    if (!this.name || typeof this.name !== 'string' || this.name.trim().length < 2) {
      throw new Error('User name must be at least 2 characters');
    }
    if (!this.passwordHash || typeof this.passwordHash !== 'string') {
      throw new Error('User password hash is required');
    }
    if (!Object.values(UserRole).includes(this.role)) {
      throw new Error('User role is invalid');
    }
  }

  updateProfile({ name }: { name?: string }): this {
    if (name !== undefined) {
      this.name = name;
    }
    this.updatedAt = new Date();
    this._validate();
    return this;
  }

  changePasswordHash(newHash: string): this {
    this.passwordHash = newHash;
    this.updatedAt = new Date();
    this._validate();
    return this;
  }

  toJSON(): UserJson {
    return {
      id: this.id,
      email: this.email.trim().toLowerCase(),
      name: this.name,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
