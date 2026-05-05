'use strict';

const { v4: uuidv4 } = require('uuid');

const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class User {
  constructor({ id, email, name, passwordHash, role, createdAt, updatedAt }) {
    this.id = id || uuidv4();
    this.email = email;
    this.name = name;
    this.passwordHash = passwordHash;
    this.role = role || UserRole.USER;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();

    this._validate();
  }

  _validate() {
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

  updateProfile({ name }) {
    if (name !== undefined) {
      this.name = name;
    }
    this.updatedAt = new Date();
    this._validate();
    return this;
  }

  changePasswordHash(newHash) {
    this.passwordHash = newHash;
    this.updatedAt = new Date();
    this._validate();
    return this;
  }

  toJSON() {
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

module.exports = { User, UserRole };
