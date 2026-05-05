'use strict';

class PaymentWebhookController {
  /**
   * @param {import('../../../domain/use-cases/PaymentWebhookService').PaymentWebhookService} paymentWebhookService
   */
  constructor(paymentWebhookService) {
    this.paymentWebhookService = paymentWebhookService;
  }

  async handlePaymentWebhook(req, res) {
    console.log('[PaymentWebhook] Received payload', JSON.stringify(req.body));

    try {
      await this.paymentWebhookService.execute({
        event: req.body.event,
        data: req.body.data,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PaymentWebhook] Handler error (ack anyway):', msg);
    }

    return res.status(200).json({ received: true });
  }
}

module.exports = { PaymentWebhookController };
