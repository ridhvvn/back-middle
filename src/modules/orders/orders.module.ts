import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../../database/entities/listing.entity';
import { Order } from '../../database/entities/order.entity';
import { BuyerRequest } from '../../database/entities/request.entity';
import { DevWebhooksController } from './dev-webhooks.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Listing, BuyerRequest])],
  controllers: [OrdersController, DevWebhooksController],
  providers: [OrdersService],
})
export class OrdersModule {}
