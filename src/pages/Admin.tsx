import { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  ArrowLeft,
  Search,
  Loader2,
  Crown,
  MapPin,
  Trash2,
  Map,
  Eye,
  UserCheck,
  Tags,
  BookOpen,
  FolderOpen,
  Package,
  UserPlus,
  MessageSquare
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement, UserWithRole, AppRole } from '@/hooks/useUserManagement';
import { useLocations, Location } from '@/hooks/useLocations';
import { useInventoryDB } from '@/hooks/useInventoryDB';
import { UserMenu } from '@/components/UserMenu';
import { AddLocationDialog } from '@/components/AddLocationDialog';
import { LocationsMap } from '@/components/LocationsMap';
import { LocationItemsDialog } from '@/components/LocationItemsDialog';
import { EditUserTagsDialog } from '@/components/EditUserTagsDialog';
import { ResourceManagement } from '@/components/ResourceManagement';
import { CategoryManagement } from '@/components/CategoryManagement';
import { BundleManagement } from '@/components/BundleManagement';
import { useBundles } from '@/hooks/useBundles';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { useItemRequests } from '@/hooks/useItemRequests';
import { AdminRequestsPanel } from '@/components/AdminRequestsPanel';
import { format } from 'date-fns';

const Admin = () => {
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const { users, isLoading: usersLoading, setUserRole, updateUserTags, deleteUser } = useUserManagement();
  const { locations, isLoading: locationsLoading, addLocation, deleteLocation } = useLocations();
  const { items, isLoading: itemsLoading } = useInventoryDB();
  const { bundles, isLoading: bundlesLoading, createBundle, updateBundle, deleteBundle } = useBundles();
  const { requests, pendingCount } = useItemRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedLocationItems, setSelectedLocationItems] = useState<typeof items>([]);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(locationSearchQuery.toLowerCase())
  );

  const handleRoleChange = async (userItem: UserWithRole, newRole: string) => {
    const role = newRole === 'none' ? null : newRole as AppRole;
    await setUserRole(userItem.user_id, userItem.full_name, role);
  };

  const handleLocationClick = (location: Location, locationItems: typeof items) => {
    setSelectedLocation(location);
    setSelectedLocationItems(locationItems);
    setLocationDialogOpen(true);
  };

  // Calculate item counts by category
  const itemCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  const isLoading = authLoading || usersLoading || locationsLoading || itemsLoading || bundlesLoading;

  // Redirect non-admins (moved after all hooks)
  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
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
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Inventory
                </Link>
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-4xl">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="bundles" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Bundles</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">User Management</h2>
                  <p className="text-muted-foreground">
                    Manage user roles and permissions
                  </p>
                </div>
              </div>
              <InviteUserDialog />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-card border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <div className="bg-card border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Administrators</p>
                <p className="text-2xl font-bold text-accent">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="bg-card border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'user').length}
                </p>
              </div>
              <div className="bg-card border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'member').length}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users Table */}
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Tags</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {users.length === 0 ? 'No users found' : 'No matching users'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userItem) => {
                      const isCurrentUser = userItem.user_id === user?.id;
                      return (
                        <TableRow key={userItem.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                                {userItem.isAdmin ? (
                                  <Crown className="h-4 w-4 text-accent" />
                                ) : (
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {userItem.full_name}
                                  {isCurrentUser && (
                                    <Badge variant="outline" className="text-xs">You</Badge>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {userItem.email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {userItem.role === 'admin' ? (
                              <Badge className="bg-accent text-accent-foreground">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            ) : userItem.role === 'user' ? (
                              <Badge className="bg-primary text-primary-foreground">
                                <UserCheck className="h-3 w-3 mr-1" />
                                User
                              </Badge>
                            ) : userItem.role === 'member' ? (
                              <Badge variant="secondary">
                                <Eye className="h-3 w-3 mr-1" />
                                Member
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                No Role
                              </Badge>
                          )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {userItem.tags.length > 0 ? (
                                userItem.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">No tags</span>
                              )}
                              {userItem.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{userItem.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isCurrentUser && (
                                <EditUserTagsDialog
                                  userName={userItem.full_name}
                                  userId={userItem.user_id}
                                  currentTags={userItem.tags}
                                  onSave={updateUserTags}
                                />
                              )}
                              {isCurrentUser ? (
                                <span className="text-sm text-muted-foreground">—</span>
                              ) : (
                                <>
                                  <Select
                                    value={userItem.role || 'none'}
                                    onValueChange={(value) => handleRoleChange(userItem, value)}
                                  >
                                    <SelectTrigger className="w-[130px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background">
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="member">Member</SelectItem>
                                      <SelectItem value="none">No Role</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete <span className="font-semibold">{userItem.full_name}</span>? 
                                          This will permanently remove their account, profile, and all associated data. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteUser(userItem.user_id, userItem.full_name)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6 mt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/10">
                <MessageSquare className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Item Requests</h2>
                <p className="text-muted-foreground">
                  Manage item requests from members
                </p>
              </div>
            </div>
            <AdminRequestsPanel />
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-6 mt-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-accent/10">
                  <MapPin className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Location Management</h2>
                  <p className="text-muted-foreground">
                    Manage equipment locations and view on map
                  </p>
                </div>
              </div>
              <AddLocationDialog onAdd={addLocation} />
            </div>

            {/* Map Section */}
            <div className="bg-card border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Equipment Map</h3>
              </div>
              <LocationsMap 
                locations={locations} 
                items={items}
                onLocationClick={handleLocationClick}
              />
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                  <span>All Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
                  <span>All Checked Out</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
                  <span>All Maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(221, 83%, 53%)' }} />
                  <span>Mixed Status</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-card border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Total Locations</p>
                <p className="text-2xl font-bold">{locations.length}</p>
              </div>
              <div className="bg-card border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">With Coordinates</p>
                <p className="text-2xl font-bold text-accent">
                  {locations.filter(l => l.latitude && l.longitude).length}
                </p>
              </div>
              <div className="bg-card border rounded-xl p-4 col-span-2 sm:col-span-1">
                <p className="text-sm text-muted-foreground">Items with Location</p>
                <p className="text-2xl font-bold">
                  {items.filter(i => i.location_id).length}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Locations Table */}
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Location</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="hidden sm:table-cell">Items</TableHead>
                    <TableHead className="hidden md:table-cell">Coordinates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {locations.length === 0 ? 'No locations added yet' : 'No matching locations'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocations.map((location) => {
                      const itemCount = items.filter(i => i.location_id === location.id).length;
                      return (
                        <TableRow key={location.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-accent" />
                              </div>
                              <p className="font-medium">{location.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {location.address}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">{itemCount} items</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {location.latitude && location.longitude ? (
                              <span className="font-mono">
                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-destructive">Not geocoded</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete{' '}
                                    <strong>{location.name}</strong>? Items at this location will have their location cleared.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteLocation(location.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Bundles Tab */}
          <TabsContent value="bundles" className="space-y-6 mt-6">
            <BundleManagement
              bundles={bundles}
              items={items}
              onCreateBundle={createBundle}
              onUpdateBundle={updateBundle}
              onDeleteBundle={deleteBundle}
            />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6 mt-6">
            <CategoryManagement itemCounts={itemCountsByCategory} />
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6 mt-6">
            <ResourceManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Location Items Dialog */}
      <LocationItemsDialog
        location={selectedLocation}
        items={selectedLocationItems}
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
      />
    </div>
  );
};

export default Admin;
