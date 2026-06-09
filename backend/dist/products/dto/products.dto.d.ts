import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class CreateProductDto {
    name: string;
    description?: string;
    sku?: string;
    barcode?: string;
    categoryId?: string;
    costPrice?: number;
    sellingPrice?: number;
    reorderPoint?: number;
    initialStock?: number;
}
export declare class UpdateProductDto {
    name?: string;
    description?: string;
    barcode?: string;
    categoryId?: string;
    costPrice?: number;
    sellingPrice?: number;
    reorderPoint?: number;
    isActive?: boolean;
}
export declare class QueryProductsDto extends PaginationDto {
    categoryId?: string;
    status?: 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
}
