'use strict';

const { validationResult } = require('express-validator');
const { UserRole } = require('../../../domain/entities/User');

class PaymentController {
  /**
   * @param {import('../../../domain/use-cases/InitiatePaymentUseCase').InitiatePaymentUseCase} initiatePaymentUseCase
   * @param {import('../../../domain/use-cases/GetPaymentStatusUseCase').GetPaymentStatusUseCase} getPaymentStatusUseCase
   */
  constructor(initiatePaymentUseCase, getPaymentStatusUseCase) {
    this.initiatePaymentUseCase = initiatePaymentUseCase;
    this.getPaymentStatusUseCase = getPaymentStatusUseCase;
  }

  async initiatePayment(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency, method, product_id, user_id } = req.body;

    if (req.user.role !== UserRole.ADMIN && req.user.id !== user_id) {
      return res.status(403).json({ error: 'user_id does not match authenticated user' });
    }

    try {
      const result = await this.initiatePaymentUseCase.execute({
        amount,
        currency,
        method,
        productId: product_id,
        userId: user_id,
      });

      return res.status(201).json(result);
    } catch (err) {
      if (err.code === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      if (err.message.includes('must be') || err.message.includes('required')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const result = await this.getPaymentStatusUseCase.execute(paymentId, {
        actorUserId: req.user.id,
        actorRole: req.user.role,
      });
      return res.status(200).json(result);
    } catch (err) {
      if (err.code === 'PAYMENT_NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      if (err.code === 'FORBIDDEN') {
        return res.status(403).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = { PaymentController };
