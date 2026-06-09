import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from '../products/dto/products.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(
    @CurrentUser('orgId') orgId: string,
    @Query() query: QueryProductsDto,
  ) {
    return this.productsService.findAll(orgId, query);
  }

  @Get('stats')
  getStats(@CurrentUser('orgId') orgId: string) {
    return this.productsService.getStats(orgId);
  }

  @Get('sku/:sku')
  findBySku(
    @CurrentUser('orgId') orgId: string,
    @Param('sku') sku: string,
  ) {
    return this.productsService.findBySku(orgId, sku);
  }

  @Get('barcode/:barcode')
  findByBarcode(
    @CurrentUser('orgId') orgId: string,
    @Param('barcode') barcode: string,
  ) {
    return this.productsService.findByBarcode(orgId, barcode);
  }

  @Get(':id')
  findOne(@CurrentUser('orgId') orgId: string, @Param('id') id: string) {
    return this.productsService.findOne(orgId, id);
  }

  @Post()
  @Roles(Role.MANAGER)
  create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(orgId, userId, dto);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  update(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(orgId, userId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  remove(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(orgId, userId, id);
  }
}
