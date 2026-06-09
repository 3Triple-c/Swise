import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @IsInt()
  @Type(() => Number)
  quantityDelta!: number; // positive = add, negative = remove

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}

export class TransferStockDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  fromLocationId!: string;

  @IsString()
  @IsNotEmpty()
  toLocationId!: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class QueryMovementsDto extends PaginationDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsEnum(StockMovementType)
  @IsOptional()
  type?: StockMovementType;
}
