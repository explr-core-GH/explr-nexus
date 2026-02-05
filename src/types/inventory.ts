export type ItemStatus = 'available' | 'checked-out' | 'maintenance';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ItemStatus;
  qrCode: string;
  checkedOutBy?: string;
  checkedOutAt?: string;
  location: string;
  locationId?: string;
  imageUrl?: string;
  tags?: string[];
  quantity?: number;
  isConsumable?: boolean;
  isAtEducatorLocation?: boolean;
  createdAt: string;
  lastUpdated: string;
}

export interface CheckoutLog {
  id: string;
  itemId: string;
  itemName: string;
  action: 'check-in' | 'check-out';
  performedBy: string;
  timestamp: string;
}
