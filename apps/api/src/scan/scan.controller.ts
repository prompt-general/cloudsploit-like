import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ScanService } from './scan.service';

@Controller('scans')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  async startScan(@Body() body: any) {
    const { provider, accountId, config } = body;
    
    if (!provider || !accountId) {
      throw new Error('Provider and accountId are required');
    }

    const scanId = await this.scanService.startScan(provider, accountId, config);
    return { scanId, message: 'Scan started successfully' };
  }

  @Get(':id')
  async getScan(@Param('id') id: string) {
    return this.scanService.getScanResults(id);
  }

  @Get(':id/status')
  async getScanStatus(@Param('id') id: string) {
    return this.scanService.getScanStatus(id);
  }

  @Get()
  async getScans(@Query('accountId') accountId?: string) {
    if (accountId) {
      return this.scanService.getAccountScans(accountId);
    }
    
    // Return recent scans for all accounts
    return this.scanService.getAccountScans('');
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.scanService.getDashboardStats();
  }
}
