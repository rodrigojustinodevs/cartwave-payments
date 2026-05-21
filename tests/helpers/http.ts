import { jest } from '@jest/globals';
import type { Request, Response } from 'express';

export function makeRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

export function makeReq(partial: Record<string, unknown> = {}): Request {
  return partial as unknown as Request;
}
