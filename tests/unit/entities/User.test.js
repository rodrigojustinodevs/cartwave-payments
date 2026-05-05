'use strict';

const { User, UserRole } = require('../../../src/domain/entities/User');

describe('User Entity', () => {
  const base = {
    email: 'user@example.com',
    name: 'John Doe',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
  };

  it('should create user with defaults', () => {
    const u = new User(base);
    expect(u.email).toBe('user@example.com');
    expect(u.role).toBe(UserRole.USER);
    expect(u.id).toBeDefined();
  });

  it('toJSON should not expose passwordHash', () => {
    const u = new User(base);
    const j = u.toJSON();
    expect(j.passwordHash).toBeUndefined();
    expect(j.email).toBe('user@example.com');
    expect(j.role).toBe(UserRole.USER);
  });

  it('should reject invalid email', () => {
    expect(() => new User({ ...base, email: 'not-an-email' })).toThrow();
  });

  it('should reject short name', () => {
    expect(() => new User({ ...base, name: 'x' })).toThrow();
  });
});
