import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async getAssets(accountId?: string, provider?: string) {
    const where: any = {};
    
    if (accountId) {
      where.accountId = accountId;
    }
    
    if (provider) {
      where.provider = provider;
    }

    return this.prisma.asset.findMany({
      where,
      include: {
        configs: {
          take: 1,
          orderBy: { collectedAt: 'desc' },
        },
        findings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getAssetDetails(assetId: string) {
    return this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        configs: {
          orderBy: { collectedAt: 'desc' },
        },
        findings: {
          orderBy: { createdAt: 'desc' },
          include: {
            scan: {
              select: {
                id: true,
                startedAt: true,
              },
            },
          },
        },
        driftEvents: {
          orderBy: { detectedAt: 'desc' },
        },
      },
    });
  }

  async getAssetConfigHistory(assetId: string, limit: number = 10) {
    return this.prisma.assetConfig.findMany({
      where: { assetId },
      orderBy: { collectedAt: 'desc' },
      take: limit,
    });
  }
}
