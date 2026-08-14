import { InventoryItem } from '@/hooks/useInventoryDB';

/** Total units the library owns of an item (non-quantified items count as 1). */
export function totalQuantity(item: Pick<InventoryItem, 'quantity'>): number {
  return item.quantity ?? 1;
}

/**
 * Units that can still be promised: on-hand stock minus anything currently held
 * by a reserved (submitted but not yet picked up) project request.
 */
export function availableQuantity(
  item: Pick<InventoryItem, 'quantity' | 'status'>,
  reserved = 0
): number {
  if (item.status !== 'available') return 0;
  return Math.max(0, totalQuantity(item) - reserved);
}
