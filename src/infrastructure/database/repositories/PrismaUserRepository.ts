import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import type { PrismaClient } from '@prisma/client';
import { User, type UserRoleType } from '../../../domain/entities/User.js';
import type { UserRepositoryPort, UserListParams, UserListResult } from '../../../domain/ports/UserRepositoryPort.js';

export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<User> {
    try {
      const row = await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email.trim().toLowerCase(),
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      return this._mapRow(row);
    } catch (e) {
      this._rethrowPrisma(e);
    }
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return this._mapRow(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = String(email).trim().toLowerCase();
    const row = await this.prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    });
    if (!row) return null;
    return this._mapRow(row);
  }

  async update(user: User): Promise<User> {
    try {
      const row = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email.trim().toLowerCase(),
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role,
          updatedAt: user.updatedAt,
        },
      });
      return this._mapRow(row);
    } catch (e) {
      this._rethrowPrisma(e);
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.deleteMany({ where: { id } });
  }

  async list({ page, pageSize }: UserListParams): Promise<UserListResult> {
    const skip = (page - 1) * pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        take: pageSize,
        skip,
      }),
    ]);
    const items = rows.map((row) => this._mapRow(row));
    return { items, total };
  }

  private _mapRow(row: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      role: row.role as UserRoleType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private _rethrowPrisma(e: unknown): never {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new Error('Unique constraint violation');
      }
      if (e.code === 'P2003') {
        throw new Error('Foreign key constraint violation');
      }
    }
    throw e;
  }
}
