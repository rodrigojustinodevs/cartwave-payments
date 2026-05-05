'use strict';

const { BcryptPasswordHasher } = require('../../../../src/infrastructure/security/BcryptPasswordHasher');

describe('BcryptPasswordHasher', () => {
  it('should hash and compare password', async () => {
    const hasher = new BcryptPasswordHasher(4);
    const hash = await hasher.hash('my-password');
    expect(hash).not.toBe('my-password');
    await expect(hasher.compare('my-password', hash)).resolves.toBe(true);
    await expect(hasher.compare('wrong', hash)).resolves.toBe(false);
  });
});
