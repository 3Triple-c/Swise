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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_log_service_1 = require("../common/services/audit-log.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const client_1 = require("@prisma/client");
let ProductsService = class ProductsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async findAll(orgId, query) {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', categoryId, status } = query;
        const skip = (page - 1) * limit;
        const where = { orgId };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (categoryId)
            where.categoryId = categoryId;
        if (status === 'active')
            where.isActive = true;
        if (status === 'inactive')
            where.isActive = false;
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
                inventoryItems: undefined,
            };
        });
        const filtered = status === 'low_stock'
            ? enriched.filter((p) => p.stockStatus === 'low_stock')
            : status === 'out_of_stock'
                ? enriched.filter((p) => p.stockStatus === 'out_of_stock')
                : enriched;
        return (0, pagination_dto_1.paginate)(filtered, status ? filtered.length : total, page, limit);
    }
    async findOne(orgId, id) {
        const product = await this.prisma.product.findFirst({
            where: { id, orgId },
            include: {
                category: true,
                inventoryItems: {
                    include: { location: { select: { id: true, name: true } } },
                },
            },
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const totalStock = product.inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
        return {
            ...product,
            totalStock,
            stockStatus: this.getStockStatus(totalStock, product.reorderPoint),
        };
    }
    async findBySku(orgId, sku) {
        const product = await this.prisma.product.findFirst({ where: { orgId, sku } });
        if (!product)
            throw new common_1.NotFoundException(`No product with SKU: ${sku}`);
        return product;
    }
    async findByBarcode(orgId, barcode) {
        const product = await this.prisma.product.findFirst({ where: { orgId, barcode } });
        if (!product)
            throw new common_1.NotFoundException(`No product with barcode: ${barcode}`);
        return product;
    }
    async create(orgId, userId, dto) {
        const sku = dto.sku ?? (await this.generateSku(orgId, dto.name));
        const skuTaken = await this.prisma.product.findUnique({ where: { orgId_sku: { orgId, sku } } });
        if (skuTaken)
            throw new common_1.ConflictException(`SKU "${sku}" is already in use`);
        const { initialStock, ...productData } = dto;
        const product = await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: { orgId, ...productData, sku },
                include: { category: true },
            });
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
                            type: client_1.StockMovementType.ADJUSTMENT,
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
    async update(orgId, userId, id, dto) {
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
    async remove(orgId, userId, id) {
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
    async getStats(orgId) {
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
            if (qty === 0)
                outOfStock++;
            else if (qty <= p.reorderPoint)
                lowStock++;
        }
        return {
            totalProducts: products.length,
            totalStockValue: totalValue,
            lowStockCount: lowStock,
            outOfStockCount: outOfStock,
        };
    }
    async generateSku(orgId, name) {
        const prefix = name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 3)
            .padEnd(3, 'X');
        const count = await this.prisma.product.count({ where: { orgId } });
        const seq = String(count + 1).padStart(4, '0');
        return `${prefix}-${seq}`;
    }
    getStockStatus(qty, reorderPoint) {
        if (qty === 0)
            return 'out_of_stock';
        if (qty <= reorderPoint)
            return 'low_stock';
        return 'in_stock';
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], ProductsService);
//# sourceMappingURL=products.service.js.map