'use strict';

const jwt = require('jsonwebtoken');
const { TokenServicePort } = require('../../domain/ports/TokenServicePort');

class JwtTokenService extends TokenServicePort {
  constructor(secret, defaultExpiresIn = '1h') {
    super();
    this.secret = secret || process.env.JWT_SECRET;
    this.defaultExpiresIn = defaultExpiresIn || process.env.JWT_EXPIRES_IN || '1h';
  }

  sign(payload, options = {}) {
    const expiresIn = options.expiresIn || this.defaultExpiresIn;
    return jwt.sign(
      { sub: payload.sub, role: payload.role },
      this.secret,
      { expiresIn }
    );
  }

  verify(token) {
    const decoded = jwt.verify(token, this.secret);
    return {
      sub: decoded.sub,
      role: decoded.role,
    };
  }
}

module.exports = { JwtTokenService };
