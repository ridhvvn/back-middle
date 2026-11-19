import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => (value === null || value === undefined ? null : Number(value)),
};

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
}

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sellerId: string;

  @Column()
  sellerName: string;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  priceMinor: number;

  @Column({ length: 3, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @CreateDateColumn()
  createdAt: Date;
}
