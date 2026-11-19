import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';

@ApiTags('ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  findAll(@Query('orderId') orderId?: string) {
    return this.ledgerService.findAll(orderId);
  }
}
