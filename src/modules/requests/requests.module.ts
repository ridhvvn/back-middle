import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuyerRequest } from '../../database/entities/request.entity';
import { RequestsController } from './requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BuyerRequest])],
  controllers: [RequestsController],
  exports: [TypeOrmModule],
})
export class RequestsModule {}
