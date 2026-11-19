import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { bigintTransformer } from './listing.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  FUNDED = 'FUNDED',
  RELEASED = 'RELEASED',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  buyerId: string;

  @Column()
  buyerName: string;

  @Column('uuid')
  sellerId: string;

  @Column()
  sellerName: string;

  @Column()
  title: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  amountMinor: number;

  @Column({ length: 3, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Column({ nullable: true })
  providerReferenceId: string;

  @Column({ nullable: true })
  payoutReferenceId: string;

  @Column({ nullable: true })
  releaseIdempotencyKey: string;

  @Column({ type: 'text', nullable: true })
  disputeReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
