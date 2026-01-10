import { Module } from '@nestjs/common';
import { DriftService } from './drift.service';
import { DriftController } from './drift.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DriftService],
  controllers: [DriftController],
  exports: [DriftService],
})
export class DriftModule {}
