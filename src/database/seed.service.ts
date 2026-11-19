import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing, ListingStatus } from './entities/listing.entity';
import { BuyerRequest, RequestStatus } from './entities/request.entity';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Listing) private readonly listingsRepo: Repository<Listing>,
    @InjectRepository(BuyerRequest) private readonly requestsRepo: Repository<BuyerRequest>,
  ) {}

  async onModuleInit() {
    const userCount = await this.usersRepo.count();
    if (userCount > 0) return;

    const alice = await this.usersRepo.save(
      this.usersRepo.create({
        name: 'Alice (Buyer)',
        role: UserRole.BUYER,
        phone: '+60123456789',
      }),
    );

    const bob = await this.usersRepo.save(
      this.usersRepo.create({
        name: 'Bob (Seller)',
        role: UserRole.SELLER,
        phone: '+60198765432',
      }),
    );

    await this.usersRepo.save(
      this.usersRepo.create({
        name: 'Admin',
        role: UserRole.ADMIN,
        phone: '+60111111111',
      }),
    );

    await this.listingsRepo.save([
      this.listingsRepo.create({
        sellerId: bob.id,
        sellerName: bob.name,
        title: 'MacBook Pro M3 14"',
        description: 'Mint condition, complete box, meetup in KL.',
        priceMinor: 550000,
        currency: 'MYR',
        status: ListingStatus.ACTIVE,
      }),
      this.listingsRepo.create({
        sellerId: bob.id,
        sellerName: bob.name,
        title: 'Sony WH-1000XM5 Headphones',
        description: 'Lightly used noise-cancelling headphones.',
        priceMinor: 95000,
        currency: 'MYR',
        status: ListingStatus.ACTIVE,
      }),
    ]);

    await this.requestsRepo.save(
      this.requestsRepo.create({
        buyerId: alice.id,
        buyerName: alice.name,
        title: 'Looking for Nintendo Switch OLED',
        description: 'Prefer local handover with screen protector.',
        budgetMinor: 110000,
        currency: 'MYR',
        status: RequestStatus.OPEN,
      }),
    );
  }
}
