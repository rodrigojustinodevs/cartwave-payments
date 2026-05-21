export interface PaymentGatewayPayload {
  amount: number;
  currency: string;
  paymentMethod: string;
  productId: string;
}

export interface PaymentGatewayResponse {
  txId: string | null;
  status: string;
}

export interface PaymentGateway {
  createPayment(payload: PaymentGatewayPayload): Promise<PaymentGatewayResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse>;
}
