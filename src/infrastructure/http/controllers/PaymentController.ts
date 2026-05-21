import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserRole } from '../../../domain/entities/User.js';
import type { InitiatePaymentUseCase } from '../../../domain/use-cases/InitiatePaymentUseCase.js';
import type { GetPaymentStatusUseCase } from '../../../domain/use-cases/GetPaymentStatusUseCase.js';
import { getErrorCode } from '../../../types/errors.js';
import { sendError, sendSuccess, validationMessage } from '../utils/apiResponse.js';

export class PaymentController {
  constructor(
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly getPaymentStatusUseCase: GetPaymentStatusUseCase
  ) {}

  async initiatePayment(req: Request, res: Response): Promise<Response> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, validationMessage(errors.array()));
    }

    const { amount, currency, method, product_id, user_id } = req.body as {
      amount: number;
      currency: string;
      method: string;
      product_id: string;
      user_id: string;
    };

    if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.id !== user_id)) {
      return sendError(res, 403, 'user_id does not match authenticated user');
    }

    try {
      const result = await this.initiatePaymentUseCase.execute({
        amount,
        currency,
        method,
        productId: product_id,
        userId: user_id,
      });

      return sendSuccess(res, 201, 'Payment initiated successfully', result);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'USER_NOT_FOUND') {
        return sendError(res, 404, message);
      }
      if (message.includes('must be') || message.includes('required')) {
        return sendError(res, 400, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }

  async getPaymentStatus(req: Request, res: Response): Promise<Response> {
    try {
      const paymentId = String(req.params.paymentId);
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized');
      }
      const result = await this.getPaymentStatusUseCase.execute(paymentId, {
        actorUserId: req.user.id,
        actorRole: req.user.role,
      });
      return sendSuccess(res, 200, 'Success', result);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'PAYMENT_NOT_FOUND') {
        return sendError(res, 404, message);
      }
      if (code === 'FORBIDDEN') {
        return sendError(res, 403, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }
}
