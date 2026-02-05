import { MapPin, Package, Users, Mail, Building2, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Location } from '@/hooks/useLocations';
import { InventoryItem } from '@/hooks/useInventoryDB';
import { useState } from 'react';

interface Educator {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  organization_name: string | null;
  organization_address: string | null;
  items: InventoryItem[];
}

interface LocationItemsDialogProps {
  location: Location | null;
  items: InventoryItem[];
  educators?: Educator[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationItemsDialog({
  location,
  items,
  educators = [],
  open,
  onOpenChange,
}: LocationItemsDialogProps) {
  const [expandedEducators, setExpandedEducators] = useState<Set<string>>(new Set());

  if (!location) return null;

  const statusColors = {
    available: 'bg-available text-available-foreground',
    'checked-out': 'bg-checked-out text-checked-out-foreground',
    maintenance: 'bg-maintenance text-maintenance-foreground',
  };

  const statusLabels = {
    available: 'Available',
    'checked-out': 'Checked Out',
    maintenance: 'Maintenance',
  };

  const toggleEducator = (id: string) => {
    setExpandedEducators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{location.address}</p>
        
        <Tabs defaultValue="items" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" />
              Items ({items.length})
            </TabsTrigger>
            <TabsTrigger value="educators" className="gap-2">
              <Users className="h-4 w-4" />
              Educators ({educators.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="mt-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No items at this location
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <Badge className={statusColors[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="educators" className="mt-4">
            {educators.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No educators at this location
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {educators.map((educator) => (
                    <Collapsible
                      key={educator.id}
                      open={expandedEducators.has(educator.id)}
                      onOpenChange={() => toggleEducator(educator.id)}
                    >
                      <Card className="overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(educator.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <p className="font-medium">{educator.full_name}</p>
                              {educator.organization_name && (
                                <p className="text-xs text-muted-foreground">
                                  {educator.organization_name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {educator.items.length} items
                              </Badge>
                              <ChevronDown 
                                className={`h-4 w-4 text-muted-foreground transition-transform ${
                                  expandedEducators.has(educator.id) ? 'rotate-180' : ''
                                }`} 
                              />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-3 px-3">
                            {/* Profile Details */}
                            <div className="space-y-2 mb-3 pt-2 border-t">
                              {educator.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  <a 
                                    href={`mailto:${educator.email}`} 
                                    className="hover:text-primary hover:underline"
                                  >
                                    {educator.email}
                                  </a>
                                </div>
                              )}
                              {educator.organization_name && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Building2 className="h-3.5 w-3.5" />
                                  <span>{educator.organization_name}</span>
                                </div>
                              )}
                              {educator.organization_address && (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                  <span className="text-xs">{educator.organization_address}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Checked Out Items */}
                            {educator.items.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Checked Out Items
                                </p>
                                {educator.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                                  >
                                    <div>
                                      <span className="font-medium">{item.name}</span>
                                      {item.checked_out_at && (
                                        <p className="text-xs text-muted-foreground">
                                          Since {new Date(item.checked_out_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {item.category}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}