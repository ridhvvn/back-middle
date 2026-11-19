import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { BuyerRequest, RequestStatus } from '../../database/entities/request.entity';
import { DummyAuthGuard } from '../auth/dummy-auth.guard';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(
    @InjectRepository(BuyerRequest)
    private readonly requestsRepo: Repository<BuyerRequest>,
  ) {}

  @Get()
  async findAll(@Query('q') q?: string) {
    if (q && q.trim()) {
      return this.requestsRepo.find({
        where: [
          { title: ILike(`%${q.trim()}%`), status: RequestStatus.OPEN },
          { description: ILike(`%${q.trim()}%`), status: RequestStatus.OPEN },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.requestsRepo.find({
      where: { status: RequestStatus.OPEN },
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
      budgetMinor: number;
      currency?: string;
    },
  ) {
    const request = this.requestsRepo.create({
      buyerId: req.user.id,
      buyerName: req.user.name,
      title: body.title,
      description: body.description ?? '',
      budgetMinor: Math.round(Number(body.budgetMinor)),
      currency: body.currency ?? 'MYR',
      status: RequestStatus.OPEN,
    });
    return this.requestsRepo.save(request);
  }
}
