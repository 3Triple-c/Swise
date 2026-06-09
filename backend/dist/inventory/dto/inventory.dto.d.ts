import { StockMovementType } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class AdjustStockDto {
    productId: string;
    locationId: string;
    quantityDelta: number;
    type: StockMovementType;
    notes?: string;
    batchNumber?: string;
    expiryDate?: string;
}
export declare class TransferStockDto {
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    notes?: string;
}
export declare class QueryMovementsDto extends PaginationDto {
    productId?: string;
    locationId?: string;
    type?: StockMovementType;
}
