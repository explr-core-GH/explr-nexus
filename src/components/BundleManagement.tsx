import { useState } from 'react';
import { Package, Search, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CreateBundleDialog } from '@/components/CreateBundleDialog';
import { EditBundleDialog } from '@/components/EditBundleDialog';
import { BundleWithItems } from '@/hooks/useBundles';
import { InventoryItem } from '@/hooks/useInventoryDB';
import { format } from 'date-fns';

interface BundleManagementProps {
  bundles: BundleWithItems[];
  items: InventoryItem[];
  onCreateBundle: (name: string, description: string, itemIds: string[], allItems?: InventoryItem[]) => Promise<unknown>;
  onUpdateBundle: (id: string, name: string, description: string, itemIds: string[], allItems?: InventoryItem[]) => Promise<boolean>;
  onDeleteBundle: (id: string) => Promise<boolean>;
}

export function BundleManagement({
  bundles,
  items,
  onCreateBundle,
  onUpdateBundle,
  onDeleteBundle,
}: BundleManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  const filteredBundles = bundles.filter(bundle =>
    bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bundle.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const toggleExpanded = (bundleId: string) => {
    setExpandedBundles(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) {
        next.delete(bundleId);
      } else {
        next.add(bundleId);
      }
      return next;
    });
  };

  const getItemsForBundle = (itemIds: string[]): InventoryItem[] => {
    return items.filter(item => itemIds.includes(item.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <Package className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Bundle Management</h2>
            <p className="text-muted-foreground">
              Group items together for easier checkout
            </p>
          </div>
        </div>
        <CreateBundleDialog items={items} onCreateBundle={onCreateBundle} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Bundles</p>
          <p className="text-2xl font-bold">{bundles.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Items in Bundles</p>
          <p className="text-2xl font-bold">
            {new Set(bundles.flatMap(b => b.items)).size}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Avg. Items per Bundle</p>
          <p className="text-2xl font-bold">
            {bundles.length > 0
              ? Math.round(bundles.reduce((sum, b) => sum + b.items.length, 0) / bundles.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bundles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Bundles Table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead>Bundle</TableHead>
              <TableHead className="hidden sm:table-cell">Items</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBundles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {bundles.length === 0 ? 'No bundles created yet' : 'No matching bundles'}
                </TableCell>
              </TableRow>
            ) : (
              filteredBundles.map(bundle => {
                const isExpanded = expandedBundles.has(bundle.id);
                const bundleItems = getItemsForBundle(bundle.items);

                return (
                  <Collapsible key={bundle.id} asChild open={isExpanded}>
                    <>
                      <TableRow className="group">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpanded(bundle.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{bundle.name}</p>
                            {bundle.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {bundle.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary">
                            {bundle.items.length} items
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {format(new Date(bundle.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <EditBundleDialog
                              bundle={bundle}
                              items={items}
                              onUpdateBundle={onUpdateBundle}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{bundle.name}"? This will not delete the items inside, only the bundle grouping.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDeleteBundle(bundle.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Bundle
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Items in this bundle:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {bundleItems.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">
                                    No items found (items may have been deleted)
                                  </p>
                                ) : (
                                  bundleItems.map(item => (
                                    <Badge
                                      key={item.id}
                                      variant={item.status === 'available' ? 'default' : 'secondary'}
                                      className="flex items-center gap-1"
                                    >
                                      {item.name}
                                      <span className="text-xs opacity-70">
                                        ({item.status})
                                      </span>
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
