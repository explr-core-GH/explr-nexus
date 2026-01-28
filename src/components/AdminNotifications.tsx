import { useState } from 'react';
import { Bell, Check, X, Mail, Building, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useItemRequests, ItemRequest } from '@/hooks/useItemRequests';
import { format } from 'date-fns';

export function AdminNotifications() {
  const { requests, pendingCount, updateRequest, deleteRequest, loading } = useItemRequests();
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'deny' | null>(null);
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async () => {
    if (!selectedRequest || !action) return;

    setIsProcessing(true);
    await updateRequest(selectedRequest.id, action === 'approve' ? 'approved' : 'denied', response);
    setSelectedRequest(null);
    setAction(null);
    setResponse('');
    setIsProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Denied</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/10">
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Item Requests
              {pendingCount > 0 && (
                <Badge variant="secondary">{pendingCount} pending</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No item requests yet
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{request.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested by: {request.requesterName}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-1.5 text-sm">
                      {request.requesterEmail && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <a href={`mailto:${request.requesterEmail}`} className="hover:underline">
                            {request.requesterEmail}
                          </a>
                        </div>
                      )}
                      {request.requesterOrganization && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-3.5 w-3.5" />
                          {request.requesterOrganization}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>

                    {request.message && (
                      <div className="p-2 bg-secondary/50 rounded text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message:
                        </div>
                        {request.message}
                      </div>
                    )}

                    {request.adminResponse && (
                      <div className="p-2 bg-primary/5 rounded text-sm border-l-2 border-primary">
                        <span className="font-medium">Response: </span>
                        {request.adminResponse}
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAction('approve');
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAction('deny');
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          Deny
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!selectedRequest && !!action} onOpenChange={() => {
        setSelectedRequest(null);
        setAction(null);
        setResponse('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' ? 'Approve Request' : 'Deny Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'approve'
                ? `Are you sure you want to approve the request for "${selectedRequest?.itemName}"?`
                : `Are you sure you want to deny the request for "${selectedRequest?.itemName}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="response">Response message (optional)</Label>
            <Textarea
              id="response"
              placeholder="Add a message for the requester..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isProcessing}
              className={action === 'deny' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {action === 'approve' ? 'Approve' : 'Deny'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
