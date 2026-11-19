export interface PaymentIntentResult {
  providerReferenceId: string;
  clientSecretOrToken: string;
  status: 'REQUIRES_PAYMENT_METHOD' | 'PROCESSING' | 'SUCCEEDED';
}

export interface PayoutResult {
  payoutReferenceId: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export interface IPaymentProvider {
  createEscrowIntent(
    orderId: string,
    amountMinor: number,
    currency: string,
    buyerId: string,
  ): Promise<PaymentIntentResult>;

  releasePayoutToSeller(
    orderId: string,
    amountMinor: number,
    currency: string,
    sellerAccountId: string,
    idempotencyKey: string,
  ): Promise<PayoutResult>;

  refundBuyer(
    orderId: string,
    providerReferenceId: string,
    amountMinor: number,
    idempotencyKey: string,
  ): Promise<PayoutResult>;

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;

  createSellerOnboardingLink(sellerId: string): Promise<{ onboardingUrl: string }>;
}
