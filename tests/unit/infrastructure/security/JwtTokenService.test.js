'use strict';

const { JwtTokenService } = require('../../../../src/infrastructure/security/JwtTokenService');

describe('JwtTokenService', () => {
  it('should sign and verify payload', () => {
    const jwt = new JwtTokenService('unit-test-secret-key-min-length');
    const token = jwt.sign({ sub: 'user-id-1', role: 'user' });
    const payload = jwt.verify(token);
    expect(payload.sub).toBe('user-id-1');
    expect(payload.role).toBe('user');
  });
});
