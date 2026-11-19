import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from '../../database/entities/ledger-entry.entity';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry])],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
