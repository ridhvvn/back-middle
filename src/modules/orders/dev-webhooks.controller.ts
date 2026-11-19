import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('dev')
@Controller('dev/webhooks')
export class DevWebhooksController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('simulate-payment')
  simulatePayment(@Body() body: { orderId: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Disabled in production');
    }
    return this.ordersService.simulatePaymentSucceeded(body.orderId);
  }
}
