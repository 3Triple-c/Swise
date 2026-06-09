"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_log_service_1 = require("../common/services/audit-log.service");
const products_service_1 = require("../products/products.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const client_1 = require("@prisma/client");
let InventoryService = class InventoryService {
    prisma;
    audit;
    productsService;
    constructor(prisma, audit, productsService) {
        this.prisma = prisma;
        this.audit = audit;
        this.productsService = productsService;
    }
    async getStockLevels(orgId) {
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
            stockStatus: this.productsService.getStockStatus(item.quantity, item.product.reorderPoint),
        }));
    }
    async getProductStock(orgId, productId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, orgId },
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const items = await this.prisma.inventoryItem.findMany({
            where: { productId },
            include: { location: true },
        });
        const totalStock = items.reduce((sum, i) => sum + i.quantity, 0);
        return {
            product,
            locations: items,
            totalStock,
            stockStatus: this.productsService.getStockStatus(totalStock, product.reorderPoint),
        };
    }
    async adjustStock(orgId, userId, dto) {
        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, orgId },
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const location = await this.prisma.location.findFirst({
            where: { id: dto.locationId, orgId },
        });
        if (!location)
            throw new common_1.NotFoundException('Location not found');
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
            throw new common_1.BadRequestException(`Cannot reduce stock below zero. Current: ${quantityBefore}, Delta: ${dto.quantityDelta}`);
        }
        const result = await this.prisma.$transaction(async (tx) => {
            if (inventoryItem) {
                inventoryItem = await tx.inventoryItem.update({
                    where: {
                        id: inventoryItem.id,
                    },
                    data: {
                        quantity: quantityAfter,
                    },
                });
            }
            else {
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
        const alert = this.checkAlert(quantityAfter, product.reorderPoint, product.name);
        return { ...result, alert };
    }
    async transferStock(orgId, userId, dto) {
        if (dto.fromLocationId === dto.toLocationId) {
            throw new common_1.BadRequestException('Source and destination locations must be different');
        }
        const [fromItem] = await this.prisma.inventoryItem.findMany({
            where: { productId: dto.productId, locationId: dto.fromLocationId },
        });
        if (!fromItem || fromItem.quantity < dto.quantity) {
            throw new common_1.BadRequestException(`Insufficient stock. Available: ${fromItem?.quantity ?? 0}, Requested: ${dto.quantity}`);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: { id: fromItem.id },
                data: { quantity: { decrement: dto.quantity } },
            });
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
            }
            else {
                await tx.inventoryItem.create({
                    data: {
                        productId: dto.productId,
                        locationId: dto.toLocationId,
                        quantity: dto.quantity,
                    },
                });
            }
            await tx.stockMovement.createMany({
                data: [
                    {
                        productId: dto.productId,
                        locationId: dto.fromLocationId,
                        performedById: userId,
                        type: client_1.StockMovementType.TRANSFER_OUT,
                        quantityDelta: -dto.quantity,
                        quantityBefore: fromItem.quantity,
                        quantityAfter: fromItem.quantity - dto.quantity,
                        notes: dto.notes,
                    },
                    {
                        productId: dto.productId,
                        locationId: dto.toLocationId,
                        performedById: userId,
                        type: client_1.StockMovementType.TRANSFER_IN,
                        quantityDelta: dto.quantity,
                        quantityBefore: 0,
                        quantityAfter: dto.quantity,
                        notes: dto.notes,
                    },
                ],
            });
        });
        return { message: `Transferred ${dto.quantity} units successfully` };
    }
    async getMovements(orgId, query) {
        const { page = 1, limit = 20, productId, locationId, type } = query;
        const skip = (page - 1) * limit;
        const where = { product: { orgId } };
        if (productId)
            where.productId = productId;
        if (locationId)
            where.locationId = locationId;
        if (type)
            where.type = type;
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
        return (0, pagination_dto_1.paginate)(movements, total, page, limit);
    }
    async getLowStockAlerts(orgId) {
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
            .sort((a, b) => a.totalStock - b.totalStock);
    }
    async getLocations(orgId) {
        return this.prisma.location.findMany({
            where: { orgId },
            include: { _count: { select: { inventoryItems: true } } },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });
    }
    async createLocation(orgId, name, address) {
        return this.prisma.location.create({
            data: { orgId, name, address },
        });
    }
    checkAlert(qty, reorderPoint, productName) {
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        products_service_1.ProductsService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map