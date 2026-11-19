import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { bigintTransformer } from './listing.entity';

export enum LedgerAccount {
  BUYER_EXTERNAL = 'BUYER_EXTERNAL',
  ESCROW_HOLDING = 'ESCROW_HOLDING',
  PLATFORM_REVENUE = 'PLATFORM_REVENUE',
  SELLER_PAYABLE = 'SELLER_PAYABLE',
  SELLER_EXTERNAL = 'SELLER_EXTERNAL',
}

export enum LedgerDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  orderId: string;

  @Column({ type: 'varchar' })
  account: LedgerAccount;

  @Column({ type: 'varchar' })
  direction: LedgerDirection;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  amountMinor: number;

  @Column({ length: 3, default: 'MYR' })
  currency: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
