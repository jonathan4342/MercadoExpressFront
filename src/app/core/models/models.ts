// Interfaces espejo de los DTOs de la API

export type MovementType = 'ENTRADA' | 'SALIDA';
export type AlertStatus = 'ACTIVA' | 'RESUELTA';
export type OrderStatus = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'RECIBIDA';

export interface CatalogItem {
  id: number;
  name: string;
}

export interface Product {
  uid: string;
  sku: string;
  name: string;
  categoryId: number;
  category: string;
  price: number;
  currentStock: number;
  minimumStock: number;
  supplierId: number;
  supplier: string;
  belowMinimum: boolean;
}

export interface CreateProductPayload {
  name: string;
  categoryId: number;
  price: number;
  currentStock: number;
  minimumStock: number;
  supplierId: number;
}

export interface InventoryMovement {
  uid: string;
  type: MovementType;
  quantity: number;
  reason: string;
  stockAfter: number;
  createdAt: string;
}

export interface Alert {
  uid: string;
  productUid: string;
  type: 'STOCK_BAJO';
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PurchaseOrder {
  uid: string;
  productUid: string;
  supplier: string;
  alertId: number | null;
  quantity: number;
  status: OrderStatus;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
}

export interface InventoryFilters {
  category?: string;
  supplier?: string;
  activeAlert?: boolean;
  minStock?: number;
  maxStock?: number;
}


export interface AuthToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // segundos
}
