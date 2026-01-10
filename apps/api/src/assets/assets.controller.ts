import { Controller, Get, Param, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async getAssets(@Query('accountId') accountId?: string, @Query('provider') provider?: string) {
    return this.assetsService.getAssets(accountId, provider);
  }

  @Get(':id')
  async getAsset(@Param('id') id: string) {
    return this.assetsService.getAssetDetails(id);
  }

  @Get(':id/config-history')
  async getConfigHistory(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.assetsService.getAssetConfigHistory(id, limit ? parseInt(limit) : 10);
  }
}
