import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Search, 
  CheckCircle2, 
  Clock, 
  Wrench,
  ShieldAlert,
  BookOpen
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventoryDB, InventoryItem } from '@/hooks/useInventoryDB';
import { useLocations } from '@/hooks/useLocations';
import { useSelectableUsers } from '@/hooks/useSelectableUsers';
import { useBundles } from '@/hooks/useBundles';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/StatsCard';
import { ItemCard } from '@/components/ItemCard';
import { AddItemDialog } from '@/components/AddItemDialog';
import { ItemDetailDialog } from '@/components/ItemDetailDialog';
import { QRScanner } from '@/components/QRScanner';
import { ScanResultDialog } from '@/components/ScanResultDialog';
import { UserMenu } from '@/components/UserMenu';
import { ScanButton, ScanMode } from '@/components/ScanButton';
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { AdminNotifications } from '@/components/AdminNotifications';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { MyRequestsSheet } from '@/components/MyRequestsSheet';

const Index = () => {
  const { 
    items, 
    isLoading, 
    isAdmin,
    addItem,
    bulkAddItems,
    updateItem,
    checkIn, 
    checkOut, 
    deleteItem, 
    setMaintenance,
    findByQrCode, 
    getStats 
  } = useInventoryDB();
  
  const { locations } = useLocations();
  const { users: selectableUsers } = useSelectableUsers();
  const { bundles, getItemBundles } = useBundles();
  const { profile, canCheckInOut, userRole, userTags } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('default');
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
      // Tag-based filtering for members
      // Members only see items with matching tags or items tagged with "All"
      if (userRole === 'member') {
        const itemTags = item.tags || [];
        // If item has no tags, member can't see it
        if (itemTags.length === 0) return false;
        // If item has "All" tag, member can see it
        if (itemTags.includes('All')) {
          // Continue to other filters
        } else {
          // Check if member has any matching tags
          const hasMatchingTag = itemTags.some(tag => userTags.includes(tag));
          if (!hasMatchingTag) return false;
        }
      }

      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        item.qr_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, statusFilter, categoryFilter, userRole, userTags]);

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

  const userName = profile?.full_name || 'Unknown User';

  const handleAddItem = async (item: { 
    name: string; 
    description: string; 
    category: string; 
    location: string; 
    location_id?: string; 
    image_url?: string; 
    tags?: string[];
    quantity?: number;
    is_consumable?: boolean;
  }) => {
    await addItem({
      name: item.name,
      description: item.description,
      category: item.category,
      location: item.location,
      location_id: item.location_id,
      image_url: item.image_url,
      tags: item.tags,
      quantity: item.quantity,
      is_consumable: item.is_consumable,
    });
  };

  const handleCheckIn = async (itemId: string, selectedUserName: string, locationId?: string) => {
    const result = await checkIn(itemId, selectedUserName, locationId, locations);
    if (result && scannedItem) {
      const newLocation = locationId ? locations.find(l => l.id === locationId) : null;
      setScannedItem({ 
        ...scannedItem, 
        status: 'available', 
        checked_out_by: null, 
        checked_out_at: null, 
        ...(newLocation && { location: newLocation.name, location_id: locationId }) 
      });
    }
    return result;
  };

  const handleCheckOut = async (itemId: string, selectedUserName: string, locationId?: string, bundleItemIds?: string[]) => {
    const result = await checkOut(itemId, selectedUserName, locationId, locations, 1, bundleItemIds);
    if (result && scannedItem) {
      const newLocation = locationId ? locations.find(l => l.id === locationId) : null;
      setScannedItem({ 
        ...scannedItem, 
        status: 'checked-out', 
        ...(newLocation && { location: newLocation.name, location_id: locationId }) 
      });
    }
    return result;
  };

  const handleMaintenance = async (itemId: string, selectedUserName: string, locationId?: string) => {
    const result = await setMaintenance(itemId, locationId, locations);
    if (result && scannedItem) {
      const newLocation = locationId ? locations.find(l => l.id === locationId) : null;
      setScannedItem({ 
        ...scannedItem, 
        status: 'maintenance', 
        checked_out_by: null, 
        checked_out_at: null, 
        ...(newLocation && { location: newLocation.name, location_id: locationId }) 
      });
    }
    return result;
  };

  const handleDelete = async (itemId: string) => {
    await deleteItem(itemId);
  };

  // Convert DB item to UI format for dialogs
  const convertToUIItem = (item: InventoryItem) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    category: item.category,
    status: item.status,
    qrCode: item.qr_code,
    location: item.location,
    locationId: item.location_id || undefined,
    imageUrl: item.image_url || undefined,
    tags: item.tags || undefined,
    quantity: item.quantity ?? undefined,
    isConsumable: item.is_consumable || undefined,
    checkedOutBy: item.checked_out_by || undefined,
    checkedOutAt: item.checked_out_at || undefined,
    bundleId: item.bundle_id || undefined,
    createdAt: item.created_at,
    lastUpdated: item.updated_at,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse-soft">
            <img src={logo} alt="ExplrNexus" className="h-24 w-auto mx-auto opacity-70" />
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
              <img src={logo} alt="ExplrNexus" className="h-16 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <InstallPWAButton />
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/resources">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Resources</span>
                </Link>
              </Button>
              {isAdmin && <AdminNotifications />}
              {userRole === 'member' && <MyRequestsSheet />}
              {canCheckInOut && (
                <ScanButton 
                  onScan={(mode) => {
                    setScanMode(mode);
                    setScannerOpen(true);
                  }}
                  isAdmin={isAdmin}
                />
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Admin Notice */}
        {isAdmin && (
          <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-accent text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>You have administrator privileges. You can add, edit, and delete items.</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Total Items" 
            value={stats.total} 
            icon={Package}
            onClick={() => setStatusFilter('all')}
            isActive={statusFilter === 'all'}
          />
          <StatsCard 
            title="Available" 
            value={stats.available} 
            icon={CheckCircle2}
            variant="available"
            onClick={() => setStatusFilter('available')}
            isActive={statusFilter === 'available'}
          />
          <StatsCard 
            title="Checked Out" 
            value={stats.checkedOut} 
            icon={Clock}
            variant="checked-out"
            onClick={() => setStatusFilter('checked-out')}
            isActive={statusFilter === 'checked-out'}
          />
          <StatsCard 
            title="Maintenance" 
            value={stats.maintenance} 
            icon={Wrench}
            variant="maintenance"
            onClick={() => setStatusFilter('maintenance')}
            isActive={statusFilter === 'maintenance'}
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
            {isAdmin && (
              <>
                <CSVImportDialog onImport={bulkAddItems} />
                <AddItemDialog onAdd={handleAddItem} locations={locations} />
              </>
            )}
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
                ? isAdmin 
                  ? "Add your first item to get started"
                  : "No items in inventory yet. Ask an admin to add items."
                : "Try adjusting your search or filters"}
            </p>
            {items.length === 0 && isAdmin && (
              <div className="mt-4">
                <AddItemDialog onAdd={handleAddItem} locations={locations} />
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item, index) => (
              <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                <ItemCard 
                  item={convertToUIItem(item)} 
                  onClick={() => handleItemClick(item)} 
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Item Detail Dialog */}
      <ItemDetailDialog
        item={selectedItem ? convertToUIItem(selectedItem) : null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCheckIn={(itemId, selectedUserName) => checkIn(itemId, selectedUserName)}
        onCheckOut={(itemId, selectedUserName, bundleItemIds) => checkOut(itemId, selectedUserName, undefined, locations, 1, bundleItemIds)}
        onDelete={handleDelete}
        onUpdate={updateItem}
        locations={locations}
        users={selectableUsers}
        isAdmin={isAdmin}
        canCheckInOut={canCheckInOut}
        bundles={bundles}
        items={items}
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
        item={scannedItem ? convertToUIItem(scannedItem) : null}
        notFound={scanNotFound}
        open={scanResultOpen}
        scanMode={scanMode}
        locations={locations}
        users={selectableUsers}
        onOpenChange={setScanResultOpen}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onMaintenance={handleMaintenance}
        isAdmin={isAdmin}
        canCheckInOut={canCheckInOut}
      />
    </div>
  );
};

export default Index;
