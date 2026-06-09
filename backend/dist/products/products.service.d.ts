import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from '../products/dto/products.dto';
export declare class ProductsService {
    private prisma;
    private audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    findAll(orgId: string, query: QueryProductsDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<{
        totalStock: number;
        stockStatus: "low_stock" | "out_of_stock" | "in_stock";
        inventoryItems: undefined;
        category: {
            id: string;
            name: string;
        } | null;
        id: string;
        createdAt: Date;
        orgId: string;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sku: string;
        barcode: string | null;
        categoryId: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        reorderPoint: number;
        imageUrl: string | null;
    }>>;
    findOne(orgId: string, id: string): Promise<{
        totalStock: number;
        stockStatus: "low_stock" | "out_of_stock" | "in_stock";
        category: {
            id: string;
            orgId: string;
            name: string;
            description: string | null;
        } | null;
        inventoryItems: ({
            location: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            updatedAt: Date;
            productId: string;
            locationId: string;
            quantity: number;
            batchNumber: string | null;
            mfgDate: Date | null;
            expiryDate: Date | null;
        })[];
        id: string;
        createdAt: Date;
        orgId: string;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sku: string;
        barcode: string | null;
        categoryId: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        reorderPoint: number;
        imageUrl: string | null;
    }>;
    findBySku(orgId: string, sku: string): Promise<{
        id: string;
        createdAt: Date;
        orgId: string;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sku: string;
        barcode: string | null;
        categoryId: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        reorderPoint: number;
        imageUrl: string | null;
    }>;
    findByBarcode(orgId: string, barcode: string): Promise<{
        id: string;
        createdAt: Date;
        orgId: string;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sku: string;
        barcode: string | null;
        categoryId: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        reorderPoint: number;
        imageUrl: string | null;
    }>;
    create(orgId: string, userId: string, dto: CreateProductDto): Promise<{
        category: {
            id: string;
            orgId: string;
            name: string;
            description: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        orgId: string;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sku: string;
        barcode: string | null;
        categoryId: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        reorderPoint: number;
        imageUrl: string | null;
    }>;
    update(orgId: string, userId: string, id: string, dto: UpdateProductDto): Promise<{
        category: {
            id: string;
            orgId: string;
            name: string;
            description: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        orgId: string;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sku: string;
        barcode: string | null;
        categoryId: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        reorderPoint: number;
        imageUrl: string | null;
    }>;
    remove(orgId: string, userId: string, id: string): Promise<{
        message: string;
    }>;
    getStats(orgId: string): Promise<{
        totalProducts: number;
        totalStockValue: number;
        lowStockCount: number;
        outOfStockCount: number;
    }>;
    private generateSku;
    getStockStatus(qty: number, reorderPoint: number): 'in_stock' | 'low_stock' | 'out_of_stock';
}
