import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IPaymentProvider,
  PaymentIntentResult,
  PayoutResult,
} from './payment-provider.interface';

@Injectable()
export class MockPaymentAdapter implements IPaymentProvider {
  async createEscrowIntent(
    orderId: string,
    _amountMinor: number,
    _currency: string,
    _buyerId: string,
  ): Promise<PaymentIntentResult> {
    return {
      providerReferenceId: `mock_pi_${orderId.slice(0, 8)}_${randomUUID().slice(0, 6)}`,
      clientSecretOrToken: `mock_secret_${randomUUID()}`,
      status: 'REQUIRES_PAYMENT_METHOD',
    };
  }

  async releasePayoutToSeller(
    orderId: string,
    _amountMinor: number,
    _currency: string,
    _sellerAccountId: string,
    _idempotencyKey: string,
  ): Promise<PayoutResult> {
    return {
      payoutReferenceId: `mock_po_${orderId.slice(0, 8)}_${randomUUID().slice(0, 6)}`,
      status: 'PAID',
    };
  }

  async refundBuyer(
    orderId: string,
    _providerReferenceId: string,
    _amountMinor: number,
    _idempotencyKey: string,
  ): Promise<PayoutResult> {
    return {
      payoutReferenceId: `mock_rf_${orderId.slice(0, 8)}_${randomUUID().slice(0, 6)}`,
      status: 'PAID',
    };
  }

  verifyWebhookSignature(_rawBody: Buffer, _signatureHeader: string): boolean {
    return true;
  }

  async createSellerOnboardingLink(sellerId: string): Promise<{ onboardingUrl: string }> {
    return {
      onboardingUrl: `https://mock-payments.local/onboard/${sellerId}`,
    };
  }
}
