import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { AuthController } from './auth.controller';
import { DummyAuthGuard } from './dummy-auth.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [DummyAuthGuard],
  exports: [DummyAuthGuard, TypeOrmModule],
})
export class AuthModule {}
