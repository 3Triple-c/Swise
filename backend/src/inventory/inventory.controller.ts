import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, TransferStockDto, QueryMovementsDto } from './dto/inventory.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('inventory')
@UseGuards(RolesGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // Stock levels
  @Get()
  getStockLevels(@CurrentUser('orgId') orgId: string) {
    return this.inventoryService.getStockLevels(orgId);
  }

  @Get('alerts')
  getLowStockAlerts(@CurrentUser('orgId') orgId: string) {
    return this.inventoryService.getLowStockAlerts(orgId);
  }

  @Get('movements')
  getMovements(
    @CurrentUser('orgId') orgId: string,
    @Query() query: QueryMovementsDto,
  ) {
    return this.inventoryService.getMovements(orgId, query);
  }

  @Get('locations')
  getLocations(@CurrentUser('orgId') orgId: string) {
    return this.inventoryService.getLocations(orgId);
  }

  @Get('product/:productId')
  getProductStock(
    @CurrentUser('orgId') orgId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getProductStock(orgId, productId);
  }

  // Adjustments
  @Post('adjust')
  @Roles(Role.MANAGER)
  adjustStock(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(orgId, userId, dto);
  }

  @Post('transfer')
  @Roles(Role.MANAGER)
  transferStock(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TransferStockDto,
  ) {
    return this.inventoryService.transferStock(orgId, userId, dto);
  }

  @Post('locations')
  @Roles(Role.MANAGER)
  createLocation(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { name: string; address?: string },
  ) {
    return this.inventoryService.createLocation(orgId, body.name, body.address);
  }
}
