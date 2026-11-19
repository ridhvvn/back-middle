import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DummyAuthGuard } from '../auth/dummy-auth.guard';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
@UseGuards(DummyAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Req() req: any) {
    return this.ordersService.listForUser(req.user);
  }

  @Post('from-listing/:listingId')
  createFromListing(@Param('listingId') listingId: string, @Req() req: any) {
    return this.ordersService.createFromListing(listingId, req.user);
  }

  @Post('from-request/:requestId')
  createFromRequest(@Param('requestId') requestId: string, @Req() req: any) {
    return this.ordersService.createFromRequest(requestId, req.user);
  }

  @Post(':id/handover-token')
  handoverToken(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.generateHandoverToken(id, req.user);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: { nonce: string },
  ) {
    return this.ordersService.releaseWithNonce(
      id,
      req.user,
      body.nonce,
      idempotencyKey,
    );
  }

  @Post(':id/dispute')
  dispute(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.raiseDispute(id, req.user, body.reason ?? '');
  }

  @Post(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { resolution: 'RELEASE' | 'REFUND' },
  ) {
    return this.ordersService.resolveDispute(id, req.user, body.resolution);
  }
}
