'use strict';

const { PrismaClientKnownRequestError } = require('@prisma/client-runtime-utils');
const { User } = require('../../../domain/entities/User');
const { UserRepositoryPort } = require('../../../domain/ports/UserRepositoryPort');

class PrismaUserRepository extends UserRepositoryPort {
  /**
   * @param {import('@prisma/client').PrismaClient} prisma
   */
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async save(user) {
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

  async findById(id) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return this._mapRow(row);
  }

  async findByEmail(email) {
    const normalized = String(email).trim().toLowerCase();
    const row = await this.prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    });
    if (!row) return null;
    return this._mapRow(row);
  }

  async update(user) {
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

  async delete(id) {
    await this.prisma.user.deleteMany({ where: { id } });
  }

  async list({ page, pageSize }) {
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

  _mapRow(row) {
    return new User({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      role: row.role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  _rethrowPrisma(e) {
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

module.exports = { PrismaUserRepository };
