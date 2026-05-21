import type { Response } from 'express';
import type { ValidationError } from 'express-validator';

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

export function sendSuccess<T>(
  res: Response,
  status: number,
  message: string,
  data: T
): Response {
  return res.status(status).json({
    success: true,
    message,
    data,
  } satisfies ApiResponseBody<T>);
}

export function sendError(res: Response, status: number, message: string): Response {
  return res.status(status).json({
    success: false,
    message,
    data: null,
  } satisfies ApiResponseBody<null>);
}

export function validationMessage(errors: ValidationError[]): string {
  const messages = errors.map((error) => error.msg).filter(Boolean);
  return messages.length > 0 ? messages.join('; ') : 'Validation failed';
}
