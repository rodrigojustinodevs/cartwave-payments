export interface TokenPayload {
  sub: string;
  role: string;
}

export interface TokenSignOptions {
  expiresIn?: string;
}

export interface TokenServicePort {
  sign(payload: TokenPayload, options?: TokenSignOptions): string;
  verify(token: string): TokenPayload;
}
