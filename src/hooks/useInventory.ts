import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { InventoryItem, CheckoutLog, ItemStatus } from '@/types/inventory';

const STORAGE_KEY = 'gearwise_inventory';
const LOGS_KEY = 'gearwise_logs';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<CheckoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const storedItems = localStorage.getItem(STORAGE_KEY);
    const storedLogs = localStorage.getItem(LOGS_KEY);
    
    if (storedItems) {
      setItems(JSON.parse(storedItems));
    }
    if (storedLogs) {
      setLogs(JSON.parse(storedLogs));
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    }
  }, [logs, isLoading]);

  const addItem = (item: Omit<InventoryItem, 'id' | 'qrCode' | 'createdAt' | 'lastUpdated' | 'status'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: uuidv4(),
      qrCode: `GW-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'available',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, ...updates, lastUpdated: new Date().toISOString() }
          : item
      )
    );
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const checkOut = (itemId: string, userName: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.status !== 'available') return false;

    updateItem(itemId, {
      status: 'checked-out',
      checkedOutBy: userName,
      checkedOutAt: new Date().toISOString(),
    });

    const log: CheckoutLog = {
      id: uuidv4(),
      itemId,
      itemName: item.name,
      action: 'check-out',
      performedBy: userName,
      timestamp: new Date().toISOString(),
    };
    setLogs(prev => [log, ...prev]);
    return true;
  };

  const checkIn = (itemId: string, userName: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.status !== 'checked-out') return false;

    updateItem(itemId, {
      status: 'available',
      checkedOutBy: undefined,
      checkedOutAt: undefined,
    });

    const log: CheckoutLog = {
      id: uuidv4(),
      itemId,
      itemName: item.name,
      action: 'check-in',
      performedBy: userName,
      timestamp: new Date().toISOString(),
    };
    setLogs(prev => [log, ...prev]);
    return true;
  };

  const findByQrCode = (qrCode: string): InventoryItem | undefined => {
    return items.find(item => item.qrCode === qrCode);
  };

  const getStats = () => {
    const total = items.length;
    const available = items.filter(i => i.status === 'available').length;
    const checkedOut = items.filter(i => i.status === 'checked-out').length;
    const maintenance = items.filter(i => i.status === 'maintenance').length;
    return { total, available, checkedOut, maintenance };
  };

  return {
    items,
    logs,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    checkOut,
    checkIn,
    findByQrCode,
    getStats,
  };
}
