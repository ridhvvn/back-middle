import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  LedgerAccount,
  LedgerDirection,
  LedgerEntry,
} from '../../database/entities/ledger-entry.entity';

export interface LedgerLineInput {
  account: LedgerAccount;
  direction: LedgerDirection;
  amountMinor: number;
  description?: string;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
  ) {}

  async recordBalancedEntries(
    manager: EntityManager,
    orderId: string,
    currency: string,
    lines: LedgerLineInput[],
  ): Promise<LedgerEntry[]> {
    let debits = 0;
    let credits = 0;
    for (const line of lines) {
      if (!Number.isInteger(line.amountMinor) || line.amountMinor <= 0) {
        throw new BadRequestException('Ledger amountMinor must be a positive integer');
      }
      if (line.direction === LedgerDirection.DEBIT) debits += line.amountMinor;
      else credits += line.amountMinor;
    }

    if (debits !== credits) {
      throw new BadRequestException(
        `Unbalanced ledger entries: debits=${debits}, credits=${credits}`,
      );
    }

    const entities = lines.map((line) =>
      manager.create(LedgerEntry, {
        orderId,
        currency,
        account: line.account,
        direction: line.direction,
        amountMinor: line.amountMinor,
        description: line.description ?? '',
      }),
    );

    return manager.save(LedgerEntry, entities);
  }

  async findAll(orderId?: string) {
    if (orderId) {
      return this.ledgerRepo.find({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });
    }
    return this.ledgerRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
  }
}
