import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import {
  LedgerAccount,
  LedgerDirection,
} from '../../database/entities/ledger-entry.entity';
import { Listing, ListingStatus } from '../../database/entities/listing.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import {
  BuyerRequest,
  RequestStatus,
} from '../../database/entities/request.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { LedgerService } from '../ledger/ledger.service';
import {
  IPaymentProvider,
  PAYMENT_PROVIDER,
} from '../payments/payment-provider.interface';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
    @InjectRepository(BuyerRequest)
    private readonly requestsRepo: Repository<BuyerRequest>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: IPaymentProvider,
    private readonly ledgerService: LedgerService,
  ) {}

  async listForUser(user: User) {
    if (user.role === UserRole.ADMIN) {
      return this.ordersRepo.find({ order: { createdAt: 'DESC' } });
    }
    return this.ordersRepo.find({
      where: [{ buyerId: user.id }, { sellerId: user.id }],
      order: { createdAt: 'DESC' },
    });
  }

  async createFromListing(listingId: string, buyer: User) {
    const listing = await this.listingsRepo.findOne({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new ConflictException('Listing is no longer active');
    }
    if (listing.sellerId === buyer.id) {
      throw new BadRequestException('Cannot buy your own listing');
    }

    const order = this.ordersRepo.create({
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      title: listing.title,
      amountMinor: listing.priceMinor,
      currency: listing.currency,
      status: OrderStatus.PENDING_PAYMENT,
    });
    const saved = await this.ordersRepo.save(order);

    const intent = await this.paymentProvider.createEscrowIntent(
      saved.id,
      saved.amountMinor,
      saved.currency,
      buyer.id,
    );
    saved.providerReferenceId = intent.providerReferenceId;
    await this.ordersRepo.save(saved);

    listing.status = ListingStatus.SOLD;
    await this.listingsRepo.save(listing);

    return { order: saved, paymentIntent: intent };
  }

  async createFromRequest(requestId: string, seller: User) {
    const request = await this.requestsRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.OPEN) {
      throw new ConflictException('Request is already fulfilled');
    }
    if (request.buyerId === seller.id) {
      throw new BadRequestException('Cannot fulfill your own request');
    }

    const order = this.ordersRepo.create({
      buyerId: request.buyerId,
      buyerName: request.buyerName,
      sellerId: seller.id,
      sellerName: seller.name,
      title: request.title,
      amountMinor: request.budgetMinor,
      currency: request.currency,
      status: OrderStatus.PENDING_PAYMENT,
    });
    const saved = await this.ordersRepo.save(order);

    const intent = await this.paymentProvider.createEscrowIntent(
      saved.id,
      saved.amountMinor,
      saved.currency,
      request.buyerId,
    );
    saved.providerReferenceId = intent.providerReferenceId;
    await this.ordersRepo.save(saved);

    request.status = RequestStatus.FULFILLED;
    await this.requestsRepo.save(request);

    return { order: saved, paymentIntent: intent };
  }

  async simulatePaymentSucceeded(orderId: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException(
          `Order is ${order.status}, expected PENDING_PAYMENT`,
        );
      }

      order.status = OrderStatus.FUNDED;
      await manager.save(Order, order);

      await this.ledgerService.recordBalancedEntries(
        manager,
        order.id,
        order.currency,
        [
          {
            account: LedgerAccount.BUYER_EXTERNAL,
            direction: LedgerDirection.DEBIT,
            amountMinor: order.amountMinor,
            description: `Escrow funding for ${order.title}`,
          },
          {
            account: LedgerAccount.ESCROW_HOLDING,
            direction: LedgerDirection.CREDIT,
            amountMinor: order.amountMinor,
            description: `Escrow holding for ${order.title}`,
          },
        ],
      );

      return order;
    });
  }

  async generateHandoverToken(orderId: string, caller: User) {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== caller.id) {
      throw new ForbiddenException('Only the seller can generate a handover QR');
    }
    if (order.status !== OrderStatus.FUNDED) {
      throw new ConflictException(
        `Order must be FUNDED to generate handover QR (current: ${order.status})`,
      );
    }

    const nonce = randomBytes(32).toString('hex');
    const ttlSeconds = 45;
    await this.redis.set(
      `qr_nonce:${nonce}`,
      JSON.stringify({ orderId: order.id, sellerId: order.sellerId }),
      'EX',
      ttlSeconds,
    );

    return {
      orderId: order.id,
      nonce,
      expiresInSeconds: ttlSeconds,
    };
  }

  async releaseWithNonce(
    orderId: string,
    caller: User,
    nonce: string,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (!nonce) {
      throw new BadRequestException('nonce is required');
    }

    const existing = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!existing) throw new NotFoundException('Order not found');
    if (
      existing.status === OrderStatus.RELEASED &&
      existing.releaseIdempotencyKey === idempotencyKey
    ) {
      return existing;
    }

    if (existing.buyerId !== caller.id) {
      throw new ForbiddenException('Only the buyer can release funds');
    }
    if (existing.status !== OrderStatus.FUNDED) {
      throw new ConflictException(
        `Order must be FUNDED to release (current: ${existing.status})`,
      );
    }

    // Atomic single-use nonce consumption via Redis GETDEL
    const raw = await this.redis.getdel(`qr_nonce:${nonce}`);
    if (!raw) {
      throw new BadRequestException('Invalid, expired, or already used QR nonce');
    }
    const parsed = JSON.parse(raw) as { orderId: string; sellerId: string };
    if (parsed.orderId !== orderId || parsed.sellerId !== existing.sellerId) {
      throw new BadRequestException('QR nonce does not match this order/seller');
    }

    const releasedOrder = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.FUNDED) {
        throw new ConflictException(`Order is ${order.status}`);
      }

      const feeMinor = Math.floor(order.amountMinor * 0.05);
      const sellerMinor = order.amountMinor - feeMinor;

      const lines = [
        {
          account: LedgerAccount.ESCROW_HOLDING,
          direction: LedgerDirection.DEBIT,
          amountMinor: order.amountMinor,
          description: `Release escrow for ${order.title}`,
        },
        {
          account: LedgerAccount.SELLER_PAYABLE,
          direction: LedgerDirection.CREDIT,
          amountMinor: sellerMinor,
          description: `Seller payout for ${order.title}`,
        },
      ];
      if (feeMinor > 0) {
        lines.push({
          account: LedgerAccount.PLATFORM_REVENUE,
          direction: LedgerDirection.CREDIT,
          amountMinor: feeMinor,
          description: `Platform 5% fee for ${order.title}`,
        });
      }

      await this.ledgerService.recordBalancedEntries(
        manager,
        order.id,
        order.currency,
        lines,
      );

      const payout = await this.paymentProvider.releasePayoutToSeller(
        order.id,
        sellerMinor,
        order.currency,
        order.sellerId,
        idempotencyKey,
      );

      order.status = OrderStatus.RELEASED;
      order.releaseIdempotencyKey = idempotencyKey;
      order.payoutReferenceId = payout.payoutReferenceId;
      return manager.save(Order, order);
    });

    return releasedOrder;
  }

  async raiseDispute(orderId: string, caller: User, reason: string) {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== caller.id && order.sellerId !== caller.id) {
      throw new ForbiddenException('Only buyer or seller can raise a dispute');
    }
    if (order.status !== OrderStatus.FUNDED) {
      throw new ConflictException('Only FUNDED orders can be disputed');
    }
    order.status = OrderStatus.DISPUTED;
    order.disputeReason = reason || 'Dispute raised';
    return this.ordersRepo.save(order);
  }

  async resolveDispute(
    orderId: string,
    caller: User,
    resolution: 'RELEASE' | 'REFUND',
  ) {
    if (caller.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can resolve disputes');
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.DISPUTED) {
        throw new ConflictException('Order is not DISPUTED');
      }

      if (resolution === 'RELEASE') {
        const feeMinor = Math.floor(order.amountMinor * 0.05);
        const sellerMinor = order.amountMinor - feeMinor;
        const lines = [
          {
            account: LedgerAccount.ESCROW_HOLDING,
            direction: LedgerDirection.DEBIT,
            amountMinor: order.amountMinor,
            description: `Admin release for ${order.title}`,
          },
          {
            account: LedgerAccount.SELLER_PAYABLE,
            direction: LedgerDirection.CREDIT,
            amountMinor: sellerMinor,
            description: `Admin seller payout for ${order.title}`,
          },
        ];
        if (feeMinor > 0) {
          lines.push({
            account: LedgerAccount.PLATFORM_REVENUE,
            direction: LedgerDirection.CREDIT,
            amountMinor: feeMinor,
            description: `Platform 5% fee for ${order.title}`,
          });
        }
        await this.ledgerService.recordBalancedEntries(
          manager,
          order.id,
          order.currency,
          lines,
        );
        order.status = OrderStatus.RELEASED;
      } else {
        await this.ledgerService.recordBalancedEntries(
          manager,
          order.id,
          order.currency,
          [
            {
              account: LedgerAccount.ESCROW_HOLDING,
              direction: LedgerDirection.DEBIT,
              amountMinor: order.amountMinor,
              description: `Admin refund for ${order.title}`,
            },
            {
              account: LedgerAccount.BUYER_EXTERNAL,
              direction: LedgerDirection.CREDIT,
              amountMinor: order.amountMinor,
              description: `Buyer refund for ${order.title}`,
            },
          ],
        );
        await this.paymentProvider.refundBuyer(
          order.id,
          order.providerReferenceId ?? '',
          order.amountMinor,
          `refund_${order.id}`,
        );
        order.status = OrderStatus.REFUNDED;
      }

      return manager.save(Order, order);
    });
  }
}
