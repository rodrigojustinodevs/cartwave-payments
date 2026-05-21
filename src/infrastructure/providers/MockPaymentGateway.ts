import axios, { type AxiosInstance } from 'axios';
import type {
  PaymentGateway,
  PaymentGatewayPayload,
  PaymentGatewayResponse,
} from '../../domain/ports/PaymentGateway.js';
import type { GatewayError } from '../../types/gateway.js';

export class MockPaymentGateway implements PaymentGateway {
  private readonly client: AxiosInstance;

  constructor(baseURL?: string) {
    const resolved =
      baseURL ||
      process.env.PAYMENT_PROVIDER_URL ||
      process.env.PAYMENT_PROVIDER_BASE_URL ||
      'http://localhost:3110';
    this.client = axios.create({
      baseURL: resolved,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
  }

  async createPayment(payload: PaymentGatewayPayload): Promise<PaymentGatewayResponse> {
    try {
      const response = await this.client.post('/payments', {
        money: { amount: payload.amount, currency: payload.currency },
        payment_method: payload.paymentMethod,
        product_id: payload.productId,
      });
      return this._mapResponse(response.data);
    } catch (err) {
      throw this._toGatewayError(err);
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse> {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return this._mapResponse(response.data);
    } catch (err) {
      throw this._toGatewayError(err);
    }
  }

  private _toGatewayError(err: unknown): GatewayError {
    if (axios.isAxiosError(err)) {
      const netCode = err.code || (err.cause && typeof err.cause === 'object' && 'code' in err.cause ? String((err.cause as { code?: string }).code) : undefined);
      if (
        netCode === 'ECONNREFUSED' ||
        netCode === 'ENOTFOUND' ||
        netCode === 'ETIMEDOUT' ||
        netCode === 'ECONNABORTED'
      ) {
        const e = new Error('Payment provider is unreachable') as GatewayError;
        e.code = 'GATEWAY_UNAVAILABLE';
        return e;
      }
      if (err.response) {
        const data = err.response.data;
        const e = new Error(
          typeof data === 'object' && data && 'message' in data
            ? String((data as { message: unknown }).message)
            : `Payment provider error (HTTP ${err.response.status})`
        ) as GatewayError;
        e.code = 'GATEWAY_HTTP_ERROR';
        e.status = err.response.status;
        return e;
      }
    }
    if (err instanceof Error) {
      return err;
    }
    return new Error(String(err));
  }

  private _mapResponse(data: Record<string, unknown>): PaymentGatewayResponse {
    const txId = (data.tx_id ?? data.id ?? null) as string | null;
    const status = typeof data.status === 'string' ? data.status : '';
    return { txId, status };
  }
}
