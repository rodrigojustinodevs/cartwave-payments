import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import type { LoginUseCase } from '../../../domain/use-cases/LoginUseCase.js';
import { getErrorCode } from '../../../types/errors.js';
import { sendError, sendSuccess, validationMessage } from '../utils/apiResponse.js';

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  async login(req: Request, res: Response): Promise<Response> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, validationMessage(errors.array()));
    }

    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await this.loginUseCase.execute({ email, password });
      return sendSuccess(res, 200, 'Login successful', result);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'INVALID_CREDENTIALS') {
        return sendError(res, 401, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }
}
