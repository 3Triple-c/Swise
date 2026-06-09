import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { ProductsService } from '../products/products.service';
import {
  AdjustStockDto,
  TransferStockDto,
  QueryMovementsDto,
} from './dto/inventory.dto';
import { paginate } from '../common/dto/pagination.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditLogService,
    private productsService: ProductsService,
  ) {}

  // ── Current stock levels across all locations ────────────

  async getStockLevels(orgId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { product: { orgId } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            reorderPoint: true,
            costPrice: true,
            sellingPrice: true,
            imageUrl: true,
            category: { select: { id: true, name: true } },
          },
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    return items.map((item) => ({
      ...item,
      stockStatus: this.productsService.getStockStatus(
        item.quantity,
        item.product.reorderPoint,
      ),
    }));
  }

  // ── Stock level for a single product ─────────────────────

  async getProductStock(orgId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, orgId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const items = await this.prisma.inventoryItem.findMany({
      where: { productId },
      include: { location: true },
    });

    const totalStock = items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      product,
      locations: items,
      totalStock,
      stockStatus: this.productsService.getStockStatus(
        totalStock,
        product.reorderPoint,
      ),
    };
  }

  // ── Adjust stock ──────────────────────────────────────────

  async adjustStock(orgId: string, userId: string, dto: AdjustStockDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, orgId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, orgId },
    });
    if (!location) throw new NotFoundException('Location not found');

    // Get or create inventory item
    let inventoryItem = dto.batchNumber
      ? await this.prisma.inventoryItem.findUnique({
          where: {
            productId_locationId_batchNumber: {
              productId: dto.productId,
              locationId: dto.locationId,
              batchNumber: dto.batchNumber,
            },
          },
        })
      : await this.prisma.inventoryItem.findFirst({
          where: {
            productId: dto.productId,
            locationId: dto.locationId,
            batchNumber: null,
          },
        });

    const quantityBefore = inventoryItem?.quantity ?? 0;
    const quantityAfter = quantityBefore + dto.quantityDelta;

    if (quantityAfter < 0) {
      throw new BadRequestException(
        `Cannot reduce stock below zero. Current: ${quantityBefore}, Delta: ${dto.quantityDelta}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert inventory item
      if (inventoryItem) {
        inventoryItem = await tx.inventoryItem.update({
          where: {
            id: inventoryItem.id,
          },
          data: {
            quantity: quantityAfter,
          },
        });
      } else {
        inventoryItem = await tx.inventoryItem.create({
          data: {
            productId: dto.productId,
            locationId: dto.locationId,
            quantity: quantityAfter,
            batchNumber: dto.batchNumber,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          },
        });
      }

      // Record movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          locationId: dto.locationId,
          performedById: userId,
          type: dto.type,
          quantityDelta: dto.quantityDelta,
          quantityBefore,
          quantityAfter,
          notes: dto.notes,
        },
      });

      return { inventoryItem, movement };
    });

    await this.audit.log({
      orgId,
      userId,
      action: 'inventory.adjusted',
      entityType: 'InventoryItem',
      entityId: result.inventoryItem.id,
      oldValues: { quantity: quantityBefore },
      newValues: {
        quantity: quantityAfter,
        delta: dto.quantityDelta,
        type: dto.type,
      },
    });

    // Check if we need to fire a low-stock alert
    const alert = this.checkAlert(
      quantityAfter,
      product.reorderPoint,
      product.name,
    );

    return { ...result, alert };
  }

  // ── Transfer between locations ────────────────────────────

  async transferStock(orgId: string, userId: string, dto: TransferStockDto) {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException(
        'Source and destination locations must be different',
      );
    }

    const [fromItem] = await this.prisma.inventoryItem.findMany({
      where: { productId: dto.productId, locationId: dto.fromLocationId },
    });

    if (!fromItem || fromItem.quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${fromItem?.quantity ?? 0}, Requested: ${dto.quantity}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Deduct from source
      await tx.inventoryItem.update({
        where: { id: fromItem.id },
        data: { quantity: { decrement: dto.quantity } },
      });

      // Add to destination (upsert)
      const destinationItem = await tx.inventoryItem.findFirst({
        where: {
          productId: dto.productId,
          locationId: dto.toLocationId,
          batchNumber: null,
        },
      });

      if (destinationItem) {
        await tx.inventoryItem.update({
          where: { id: destinationItem.id },
          data: {
            quantity: {
              increment: dto.quantity,
            },
          },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            productId: dto.productId,
            locationId: dto.toLocationId,
            quantity: dto.quantity,
          },
        });
      }

      // Two movement records — one out, one in
      await tx.stockMovement.createMany({
        data: [
          {
            productId: dto.productId,
            locationId: dto.fromLocationId,
            performedById: userId,
            type: StockMovementType.TRANSFER_OUT,
            quantityDelta: -dto.quantity,
            quantityBefore: fromItem.quantity,
            quantityAfter: fromItem.quantity - dto.quantity,
            notes: dto.notes,
          },
          {
            productId: dto.productId,
            locationId: dto.toLocationId,
            performedById: userId,
            type: StockMovementType.TRANSFER_IN,
            quantityDelta: dto.quantity,
            quantityBefore: 0, // simplified — could query exact qty
            quantityAfter: dto.quantity,
            notes: dto.notes,
          },
        ],
      });
    });

    return { message: `Transferred ${dto.quantity} units successfully` };
  }

  // ── Movement history ──────────────────────────────────────

  async getMovements(orgId: string, query: QueryMovementsDto) {
    const { page = 1, limit = 20, productId, locationId, type } = query;
    const skip = (page - 1) * limit;

    const where: any = { product: { orgId } };
    if (productId) where.productId = productId;
    if (locationId) where.locationId = locationId;
    if (type) where.type = type;

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          location: { select: { id: true, name: true } },
          performedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return paginate(movements, total, page, limit);
  }

  // ── Low stock alerts list ────────────────────────────────

  async getLowStockAlerts(orgId: string) {
    const products = await this.prisma.product.findMany({
      where: { orgId, isActive: true },
      include: {
        inventoryItems: { select: { quantity: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return products
      .map((p) => {
        const totalStock = p.inventoryItems.reduce((s, i) => s + i.quantity, 0);
        return { ...p, totalStock, inventoryItems: undefined };
      })
      .filter((p) => p.totalStock <= p.reorderPoint)
      .sort((a, b) => a.totalStock - b.totalStock); // most critical first
  }

  // ── Locations ────────────────────────────────────────────

  async getLocations(orgId: string) {
    return this.prisma.location.findMany({
      where: { orgId },
      include: { _count: { select: { inventoryItems: true } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async createLocation(orgId: string, name: string, address?: string) {
    return this.prisma.location.create({
      data: { orgId, name, address },
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private checkAlert(qty: number, reorderPoint: number, productName: string) {
    if (qty === 0) {
      return {
        type: 'out_of_stock',
        message: `${productName} is out of stock`,
      };
    }
    if (qty <= reorderPoint) {
      return {
        type: 'low_stock',
        message: `${productName} is low on stock (${qty} remaining)`,
      };
    }
    return null;
  }
}
