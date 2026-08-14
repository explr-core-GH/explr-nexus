import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Lock, PackageCheck, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReservations } from '@/hooks/useReservations';
import { useItemRequests } from '@/hooks/useItemRequests';
import { useInventoryDB } from '@/hooks/useInventoryDB';
import { useLocations } from '@/hooks/useLocations';
import { useAuth } from '@/contexts/AuthContext';

export function ReservedHoldsPanel() {
  const { activeReservations, releaseForRequest, fulfillForRequest, isLoading } = useReservations();
  const { requests } = useItemRequests();
  const { items, checkOut } = useInventoryDB();
  const { locations } = useLocations();
  const { profile } = useAuth();
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const holds = useMemo(() => {
    const byRequest = new Map<string, typeof activeReservations>();
    activeReservations.forEach(r => {
      byRequest.set(r.requestId, [...(byRequest.get(r.requestId) ?? []), r]);
    });
    return Array.from(byRequest.entries()).map(([requestId, lines]) => ({
      requestId,
      lines,
      request: requests.find(r => r.id === requestId),
    }));
  }, [activeReservations, requests]);

  const handleCheckOut = async (requestId: string, lines: typeof activeReservations) => {
    const request = requests.find(r => r.id === requestId);
    const itemIds = lines.map(l => l.itemId).filter(id => items.some(i => i.id === id));
    if (itemIds.length === 0) return;

    setBusyRequestId(requestId);
    const ok = await checkOut(
      itemIds[0],
      request?.requesterName || profile?.full_name || 'Admin',
      undefined,
      locations,
      1,
      itemIds.slice(1),
      request?.requesterId,
      true
    );
    if (ok) {
      await fulfillForRequest(requestId);
    }
    setBusyRequestId(null);
  };

  const handleRelease = async (requestId: string) => {
    setBusyRequestId(requestId);
    await releaseForRequest(requestId);
    setBusyRequestId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5" /> Reserved Holds
        </h2>
        <p className="text-sm text-muted-foreground">
          Items held for submitted project requests. Reserved quantities are subtracted from availability everywhere until
          they're picked up or released.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading holds...</p>
      ) : holds.length === 0 ? (
        <p className="text-muted-foreground">No active reserved holds.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {holds.map(({ requestId, lines, request }) => (
            <Card key={requestId}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {request?.projectName || request?.itemName || 'Request'}
                  </CardTitle>
                  <Badge variant="secondary">{request?.status ?? 'reserved'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {request?.requesterName}
                  {request?.requesterOrganization ? ` — ${request.requesterOrganization}` : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-0.5">
                  {lines.map(line => (
                    <div key={line.id} className="flex justify-between">
                      <span>{line.itemName}</span>
                      <span className="text-muted-foreground">×{line.quantity}</span>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  Pickup:{' '}
                  {request?.confirmedDate
                    ? format(new Date(request.confirmedDate), 'PPp')
                    : request?.adminProposedDate
                    ? `${format(new Date(request.adminProposedDate), 'PPp')} (proposed)`
                    : request?.preferredDates?.length
                    ? `${format(new Date(request.preferredDates[0]), 'PPp')} (requested)`
                    : 'Not scheduled'}
                </p>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyRequestId === requestId}
                    onClick={() => handleCheckOut(requestId, lines)}
                  >
                    <PackageCheck className="h-4 w-4 mr-1" /> Check out project
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyRequestId === requestId}
                    onClick={() => handleRelease(requestId)}
                  >
                    <Undo2 className="h-4 w-4 mr-1" /> Release hold
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
