import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { bigintTransformer } from './listing.entity';

export enum RequestStatus {
  OPEN = 'OPEN',
  FULFILLED = 'FULFILLED',
}

@Entity('requests')
export class BuyerRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  buyerId: string;

  @Column()
  buyerName: string;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  budgetMinor: number;

  @Column({ length: 3, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', default: RequestStatus.OPEN })
  status: RequestStatus;

  @CreateDateColumn()
  createdAt: Date;
}
