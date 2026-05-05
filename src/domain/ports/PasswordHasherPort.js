'use strict';

class PasswordHasherPort {
  /**
   * @param {string} plainPassword
   * @returns {Promise<string>}
   */
  async hash(plainPassword) {
    throw new Error('PasswordHasherPort.hash() not implemented');
  }

  /**
   * @param {string} plainPassword
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async compare(plainPassword, hash) {
    throw new Error('PasswordHasherPort.compare() not implemented');
  }
}

module.exports = { PasswordHasherPort };
