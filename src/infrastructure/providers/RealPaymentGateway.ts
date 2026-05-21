import type { PaymentGateway, PaymentGatewayPayload, PaymentGatewayResponse } from '../../domain/ports/PaymentGateway.js';

/** Esqueleto para integração futura com gateway real (produção). */
export class RealPaymentGateway implements PaymentGateway {
  async createPayment(_payload: PaymentGatewayPayload): Promise<PaymentGatewayResponse> {
    throw new Error('RealPaymentGateway not implemented yet');
  }

  async getPaymentStatus(_paymentId: string): Promise<PaymentGatewayResponse> {
    throw new Error('RealPaymentGateway not implemented yet');
  }
}
