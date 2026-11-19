import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Listing, ListingStatus } from '../../database/entities/listing.entity';
import { DummyAuthGuard } from '../auth/dummy-auth.guard';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
  ) {}

  @Get()
  async findAll(@Query('q') q?: string) {
    if (q && q.trim()) {
      return this.listingsRepo.find({
        where: [
          { title: ILike(`%${q.trim()}%`), status: ListingStatus.ACTIVE },
          { description: ILike(`%${q.trim()}%`), status: ListingStatus.ACTIVE },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.listingsRepo.find({
      where: { status: ListingStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  @Post()
  @UseGuards(DummyAuthGuard)
  async create(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      description?: string;
      priceMinor: number;
      currency?: string;
    },
  ) {
    const listing = this.listingsRepo.create({
      sellerId: req.user.id,
      sellerName: req.user.name,
      title: body.title,
      description: body.description ?? '',
      priceMinor: Math.round(Number(body.priceMinor)),
      currency: body.currency ?? 'MYR',
      status: ListingStatus.ACTIVE,
    });
    return this.listingsRepo.save(listing);
  }
}
