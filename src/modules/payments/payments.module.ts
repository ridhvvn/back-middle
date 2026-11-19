import { Global, Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { MockPaymentAdapter } from './mock-payment.adapter';

@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useClass: MockPaymentAdapter,
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
