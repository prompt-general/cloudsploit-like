import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ScanModule } from './scan/scan.module';
import { AssetsModule } from './assets/assets.module';
import { DriftModule } from './drift/drift.module';
import { ComplianceModule } from './compliance/compliance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    ScanModule,
    AssetsModule,
    DriftModule,
    ComplianceModule,
  ],
})
export class AppModule { }
