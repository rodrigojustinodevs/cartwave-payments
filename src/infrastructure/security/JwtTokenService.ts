import jwt, { type SignOptions } from 'jsonwebtoken';
import type { TokenServicePort, TokenPayload, TokenSignOptions } from '../../domain/ports/TokenServicePort.js';

export class JwtTokenService implements TokenServicePort {
  private readonly secret: string;
  private readonly defaultExpiresIn: string;

  constructor(secret?: string, defaultExpiresIn = '1h') {
    this.secret = secret || process.env.JWT_SECRET || 'dev-secret';
    this.defaultExpiresIn = defaultExpiresIn || process.env.JWT_EXPIRES_IN || '1h';
  }

  sign(payload: TokenPayload, options: TokenSignOptions = {}): string {
    const expiresIn = options.expiresIn || this.defaultExpiresIn;
    return jwt.sign(
      { sub: payload.sub, role: payload.role },
      this.secret,
      { expiresIn } as SignOptions
    );
  }

  verify(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;
    return {
      sub: String(decoded.sub),
      role: String(decoded.role),
    };
  }
}
