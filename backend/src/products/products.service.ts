import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from '../products/dto/products.dto';
import { paginate } from '../common/dto/pagination.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditLogService,
  ) {}

  // ── List with pagination, search, filters ────────────────

  async findAll(orgId: string, query: QueryProductsDto) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', categoryId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { orgId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true } },
          inventoryItems: {
            select: { quantity: true, locationId: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const enriched = products.map((p) => {
      const totalStock = p.inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
      return {
        ...p,
        totalStock,
        stockStatus: this.getStockStatus(totalStock, p.reorderPoint),
        inventoryItems: undefined, // exclude raw items from list
      };
    });

    // Filter by stock status after enrichment
    const filtered = status === 'low_stock'
      ? enriched.filter((p) => p.stockStatus === 'low_stock')
      : status === 'out_of_stock'
      ? enriched.filter((p) => p.stockStatus === 'out_of_stock')
      : enriched;

    return paginate(filtered, status ? filtered.length : total, page, limit);
  }

  // ── Find one with full inventory breakdown ───────────────

  async findOne(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, orgId },
      include: {
        category: true,
        inventoryItems: {
          include: { location: { select: { id: true, name: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const totalStock = product.inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
    return {
      ...product,
      totalStock,
      stockStatus: this.getStockStatus(totalStock, product.reorderPoint),
    };
  }

  async findBySku(orgId: string, sku: string) {
    const product = await this.prisma.product.findFirst({ where: { orgId, sku } });
    if (!product) throw new NotFoundException(`No product with SKU: ${sku}`);
    return product;
  }

  async findByBarcode(orgId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({ where: { orgId, barcode } });
    if (!product) throw new NotFoundException(`No product with barcode: ${barcode}`);
    return product;
  }

  // ── Create ───────────────────────────────────────────────

  async create(orgId: string, userId: string, dto: CreateProductDto) {
    const sku = dto.sku ?? (await this.generateSku(orgId, dto.name));

    // Check SKU uniqueness
    const skuTaken = await this.prisma.product.findUnique({ where: { orgId_sku: { orgId, sku } } });
    if (skuTaken) throw new ConflictException(`SKU "${sku}" is already in use`);

    const { initialStock, ...productData } = dto;

    const product = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { orgId, ...productData, sku },
        include: { category: true },
      });

      // If initial stock provided, create inventory record + movement
      if (initialStock && initialStock > 0) {
        const defaultLocation = await tx.location.findFirst({
          where: { orgId, isDefault: true },
        });
        if (defaultLocation) {
          await tx.inventoryItem.create({
            data: {
              productId: product.id,
              locationId: defaultLocation.id,
              quantity: initialStock,
            },
          });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              locationId: defaultLocation.id,
              performedById: userId,
              type: StockMovementType.ADJUSTMENT,
              quantityDelta: initialStock,
              quantityBefore: 0,
              quantityAfter: initialStock,
              notes: 'Initial stock on product creation',
            },
          });
        }
      }

      return product;
    });

    await this.audit.log({
      orgId,
      userId,
      action: 'product.created',
      entityType: 'Product',
      entityId: product.id,
      newValues: { name: product.name, sku: product.sku },
    });

    return product;
  }

  // ── Update ───────────────────────────────────────────────

  async update(orgId: string, userId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(orgId, id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true },
    });

    await this.audit.log({
      orgId,
      userId,
      action: 'product.updated',
      entityType: 'Product',
      entityId: id,
      oldValues: { name: existing.name, sellingPrice: existing.sellingPrice },
      newValues: dto,
    });

    return updated;
  }

  // ── Delete (soft delete by deactivating) ─────────────────

  async remove(orgId: string, userId: string, id: string) {
    await this.findOne(orgId, id);

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId, userId,
      action: 'product.deactivated',
      entityType: 'Product',
      entityId: id,
    });

    return { message: 'Product deactivated' };
  }

  // ── Stats for dashboard ──────────────────────────────────

  async getStats(orgId: string) {
    const [products, inventoryItems] = await Promise.all([
      this.prisma.product.findMany({
        where: { orgId, isActive: true },
        include: { inventoryItems: { select: { quantity: true } } },
      }),
      this.prisma.inventoryItem.findMany({
        where: { product: { orgId } },
        include: { product: { select: { costPrice: true, reorderPoint: true } } },
      }),
    ]);

    let totalValue = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const p of products) {
      const qty = p.inventoryItems.reduce((s, i) => s + i.quantity, 0);
      totalValue += qty * Number(p.costPrice);
      if (qty === 0) outOfStock++;
      else if (qty <= p.reorderPoint) lowStock++;
    }

    return {
      totalProducts: products.length,
      totalStockValue: totalValue,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
    };
  }

  // ── Helpers ──────────────────────────────────────────────

  private async generateSku(orgId: string, name: string): Promise<string> {
    const prefix = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 3)
      .padEnd(3, 'X');

    const count = await this.prisma.product.count({ where: { orgId } });
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  getStockStatus(qty: number, reorderPoint: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (qty === 0) return 'out_of_stock';
    if (qty <= reorderPoint) return 'low_stock';
    return 'in_stock';
  }
}
