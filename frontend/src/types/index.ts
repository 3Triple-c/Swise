// ─── Auth ──────────────────────────────────────────────────

export type Role = 'OWNER' | 'MANAGER' | 'STAFF';
export type Plan = 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE';

export interface User {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
}

export interface AuthResponse {
  user: User;
  organisation: Organisation;
  accessToken: string;
  refreshToken: string;
}

// ─── API ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

// ─── Products ─────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  isActive: boolean;
  category?: Category;
  createdAt: string;
}

// ─── Inventory ────────────────────────────────────────────

export interface Location {
  id: string;
  name: string;
  address?: string;
  isDefault: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  product: Product;
  location: Location;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN'
  | 'DAMAGE';

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  type: StockMovementType;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  notes?: string;
  createdAt: string;
  performedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  product: Pick<Product, 'id' | 'name' | 'sku'>;
}

// ─── Pagination ───────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
