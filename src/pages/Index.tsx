import { useState, useMemo } from 'react';
import { 
  Package, 
  ScanLine, 
  Search, 
  Boxes, 
  CheckCircle2, 
  Clock, 
  Wrench,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventory } from '@/hooks/useInventory';
import { StatsCard } from '@/components/StatsCard';
import { ItemCard } from '@/components/ItemCard';
import { AddItemDialog } from '@/components/AddItemDialog';
import { ItemDetailDialog } from '@/components/ItemDetailDialog';
import { QRScanner } from '@/components/QRScanner';
import { ScanResultDialog } from '@/components/ScanResultDialog';
import { InventoryItem } from '@/types/inventory';

const Index = () => {
  const { 
    items, 
    isLoading, 
    addItem, 
    checkIn, 
    checkOut, 
    deleteItem, 
    findByQrCode, 
    getStats 
  } = useInventory();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResultOpen, setScanResultOpen] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [scanNotFound, setScanNotFound] = useState(false);

  const stats = getStats();

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(item => item.category))];
    return cats.sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.qrCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, statusFilter, categoryFilter]);

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleScan = (qrCode: string) => {
    setScannerOpen(false);
    const item = findByQrCode(qrCode);
    if (item) {
      setScannedItem(item);
      setScanNotFound(false);
    } else {
      setScannedItem(null);
      setScanNotFound(true);
    }
    setScanResultOpen(true);
  };

  const handleScanCheckIn = (itemId: string, userName: string) => {
    const result = checkIn(itemId, userName);
    if (result) {
      // Refresh the scanned item to get updated status
      const updated = items.find(i => i.id === itemId);
      if (updated) setScannedItem({ ...updated, status: 'available' });
    }
    return result;
  };

  const handleScanCheckOut = (itemId: string, userName: string) => {
    const result = checkOut(itemId, userName);
    if (result) {
      // Refresh the scanned item to get updated status
      const updated = items.find(i => i.id === itemId);
      if (updated) setScannedItem({ ...updated, status: 'checked-out', checkedOutBy: userName });
    }
    return result;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse-soft">
            <Boxes className="h-12 w-12 text-accent mx-auto" />
          </div>
          <p className="mt-4 text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Boxes className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">GearWise</h1>
                <p className="text-xs text-primary-foreground/70">Inventory Management</p>
              </div>
            </div>
            <Button 
              onClick={() => setScannerOpen(true)}
              size="lg"
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg"
            >
              <ScanLine className="h-5 w-5" />
              Scan QR
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Total Items" 
            value={stats.total} 
            icon={Package}
          />
          <StatsCard 
            title="Available" 
            value={stats.available} 
            icon={CheckCircle2}
            variant="available"
          />
          <StatsCard 
            title="Checked Out" 
            value={stats.checkedOut} 
            icon={Clock}
            variant="checked-out"
          />
          <StatsCard 
            title="Maintenance" 
            value={stats.maintenance} 
            icon={Wrench}
            variant="maintenance"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items, QR codes, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="checked-out">Checked Out</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddItemDialog onAdd={addItem} />
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No items found</h3>
            <p className="text-muted-foreground mt-1">
              {items.length === 0 
                ? "Add your first item to get started" 
                : "Try adjusting your search or filters"}
            </p>
            {items.length === 0 && (
              <div className="mt-4">
                <AddItemDialog onAdd={addItem} />
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item, index) => (
              <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                <ItemCard item={item} onClick={() => handleItemClick(item)} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Item Detail Dialog */}
      <ItemDetailDialog
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCheckIn={checkIn}
        onCheckOut={checkOut}
        onDelete={deleteItem}
      />

      {/* QR Scanner */}
      {scannerOpen && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Scan Result Dialog */}
      <ScanResultDialog
        item={scannedItem}
        notFound={scanNotFound}
        open={scanResultOpen}
        onOpenChange={setScanResultOpen}
        onCheckIn={handleScanCheckIn}
        onCheckOut={handleScanCheckOut}
      />
    </div>
  );
};

export default Index;
