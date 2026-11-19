import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './database/entities/ledger-entry.entity';
import { Listing } from './database/entities/listing.entity';
import { Order } from './database/entities/order.entity';
import { BuyerRequest } from './database/entities/request.entity';
import { User } from './database/entities/user.entity';
import { SeedService } from './database/seed.service';
import { AuthModule } from './modules/auth/auth.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { ListingsModule } from './modules/listings/listings.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RequestsModule } from './modules/requests/requests.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [User, Listing, BuyerRequest, Order, LedgerEntry],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Listing, BuyerRequest]),
    RedisModule,
    PaymentsModule,
    AuthModule,
    LedgerModule,
    ListingsModule,
    RequestsModule,
    OrdersModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
