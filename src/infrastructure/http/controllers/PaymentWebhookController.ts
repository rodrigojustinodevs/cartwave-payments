import type { Request, Response } from 'express';
import type { PaymentWebhookService } from '../../../domain/use-cases/PaymentWebhookService.js';

export class PaymentWebhookController {
  constructor(private readonly paymentWebhookService: PaymentWebhookService) {}

  async handlePaymentWebhook(req: Request, res: Response): Promise<Response> {
    console.log('[PaymentWebhook] Received payload', JSON.stringify(req.body));

    try {
      await this.paymentWebhookService.execute({
        event: req.body.event as string,
        data: req.body.data as Record<string, unknown>,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PaymentWebhook] Handler error (ack anyway):', msg);
    }

    return res.status(200).json({ received: true });
  }
}
