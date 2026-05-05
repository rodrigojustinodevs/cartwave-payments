'use strict';

const bcrypt = require('bcrypt');
const { PasswordHasherPort } = require('../../domain/ports/PasswordHasherPort');

class BcryptPasswordHasher extends PasswordHasherPort {
  constructor(saltRounds = 10) {
    super();
    const parsed = parseInt(process.env.BCRYPT_SALT_ROUNDS || String(saltRounds), 10);
    this.saltRounds = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }

  async hash(plainPassword) {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async compare(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  }
}

module.exports = { BcryptPasswordHasher };
