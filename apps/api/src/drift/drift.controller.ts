import { Controller, Get, Post, Body, Param, Query, Delete } from '@nestjs/common';
import { DriftService } from './drift.service';

@Controller('drift')
export class DriftController {
  constructor(private readonly driftService: DriftService) {}

  @Get()
  async getDriftEvents(
    @Query('assetId') assetId?: string,
    @Query('changeType') changeType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.driftService.getDriftEvents({
      assetId,
      changeType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('summary')
  async getDriftSummary(@Query('hours') hours?: string) {
    return this.driftService.getDriftSummary(
      hours ? parseInt(hours) : 24
    );
  }

  @Get('asset/:assetId')
  async getAssetDriftStatus(@Param('assetId') assetId: string) {
    return this.driftService.getAssetDriftStatus(assetId);
  }

  @Get('asset/:assetId/timeline')
  async getDriftTimeline(
    @Param('assetId') assetId: string,
    @Query('days') days?: string,
  ) {
    return this.driftService.getDriftTimeline(
      assetId,
      days ? parseInt(days) : 7
    );
  }

  @Get('compare/:configId1/:configId2')
  async compareConfigs(
    @Param('configId1') configId1: string,
    @Param('configId2') configId2: string,
  ) {
    return this.driftService.compareConfigs(configId1, configId2);
  }

  @Post('baseline')
  async setBaseline(@Body() body: any) {
    return this.driftService.setBaseline(body);
  }

  @Get('baseline/:assetId')
  async getBaselineHistory(@Param('assetId') assetId: string) {
    return this.driftService.getBaselineHistory(assetId);
  }

  @Delete('baseline/:baselineId')
  async deleteBaseline(@Param('baselineId') baselineId: string) {
    // Implementation would go here
    return { message: 'Baseline deletion endpoint', baselineId };
  }

  @Post('revert/:assetId/:baselineId')
  async revertToBaseline(
    @Param('assetId') assetId: string,
    @Param('baselineId') baselineId: string,
  ) {
    return this.driftService.revertToBaseline(assetId, baselineId);
  }

  @Get('assets/with-drift')
  async getAssetsWithDrift(@Query('hours') hours?: string) {
    const summary = await this.driftService.getDriftSummary(
      hours ? parseInt(hours) : 24
    );
    return summary.assetsWithDrift;
  }
}
