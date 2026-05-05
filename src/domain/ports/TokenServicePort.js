'use strict';

class TokenServicePort {
  /**
   * @param {{ sub: string, role: string }} payload
   * @param {{ expiresIn?: string }} [options]
   * @returns {string}
   */
  sign(payload, options) {
    throw new Error('TokenServicePort.sign() not implemented');
  }

  /**
   * @param {string} token
   * @returns {{ sub: string, role: string }}
   */
  verify(token) {
    throw new Error('TokenServicePort.verify() not implemented');
  }
}

module.exports = { TokenServicePort };
