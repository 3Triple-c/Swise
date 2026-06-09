import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { ProductsService } from '../products/products.service';
import { AdjustStockDto, TransferStockDto, QueryMovementsDto } from './dto/inventory.dto';
export declare class InventoryService {
    private prisma;
    private audit;
    private productsService;
    constructor(prisma: PrismaService, audit: AuditLogService, productsService: ProductsService);
    getStockLevels(orgId: string): Promise<{
        stockStatus: "low_stock" | "out_of_stock" | "in_stock";
        location: {
            id: string;
            name: string;
        };
        product: {
            category: {
                id: string;
                name: string;
            } | null;
            id: string;
            name: string;
            sku: string;
            costPrice: import("@prisma/client/runtime/library").Decimal;
            sellingPrice: import("@prisma/client/runtime/library").Decimal;
            reorderPoint: number;
            imageUrl: string | null;
        };
        id: string;
        updatedAt: Date;
        productId: string;
        locationId: string;
        quantity: number;
        batchNumber: string | null;
        mfgDate: Date | null;
        expiryDate: Date | null;
    }[]>;
    getProductStock(orgId: string, productId: string): Promise<{
        product: {
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
        };
        locations: ({
            location: {
                id: string;
                orgId: string;
                name: string;
                address: string | null;
                isDefault: boolean;
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
        totalStock: number;
        stockStatus: "low_stock" | "out_of_stock" | "in_stock";
    }>;
    adjustStock(orgId: string, userId: string, dto: AdjustStockDto): Promise<{
        alert: {
            type: string;
            message: string;
        } | null;
        inventoryItem: {
            id: string;
            updatedAt: Date;
            productId: string;
            locationId: string;
            quantity: number;
            batchNumber: string | null;
            mfgDate: Date | null;
            expiryDate: Date | null;
        };
        movement: {
            id: string;
            createdAt: Date;
            productId: string;
            locationId: string;
            type: import("@prisma/client").$Enums.StockMovementType;
            quantityDelta: number;
            quantityBefore: number;
            quantityAfter: number;
            referenceId: string | null;
            notes: string | null;
            performedById: string;
        };
    }>;
    transferStock(orgId: string, userId: string, dto: TransferStockDto): Promise<{
        message: string;
    }>;
    getMovements(orgId: string, query: QueryMovementsDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<{
        location: {
            id: string;
            name: string;
        };
        product: {
            id: string;
            name: string;
            sku: string;
        };
        performedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        productId: string;
        locationId: string;
        type: import("@prisma/client").$Enums.StockMovementType;
        quantityDelta: number;
        quantityBefore: number;
        quantityAfter: number;
        referenceId: string | null;
        notes: string | null;
        performedById: string;
    }>>;
    getLowStockAlerts(orgId: string): Promise<{
        totalStock: number;
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
    }[]>;
    getLocations(orgId: string): Promise<({
        _count: {
            inventoryItems: number;
        };
    } & {
        id: string;
        orgId: string;
        name: string;
        address: string | null;
        isDefault: boolean;
    })[]>;
    createLocation(orgId: string, name: string, address?: string): Promise<{
        id: string;
        orgId: string;
        name: string;
        address: string | null;
        isDefault: boolean;
    }>;
    private checkAlert;
}
