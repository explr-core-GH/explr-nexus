import { useState, useEffect } from 'react';
import { ClipboardList, Clock, CheckCircle, XCircle, MessageSquare, CalendarIcon, CalendarPlus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useItemRequests } from '@/hooks/useItemRequests';

interface MyRequest {
  id: string;
  itemName: string;
  message: string | null;
  status: 'pending' | 'approved' | 'denied' | 'pending_confirmation';
  adminResponse: string | null;
  preferredDates: string[];
  confirmedDate: string | null;
  adminProposedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export function MyRequestsSheet() {
  const { user } = useAuth();
  const { confirmProposedDate } = useItemRequests();
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionCount, setActionCount] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMyRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('item_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped: MyRequest[] = (data || []).map((r) => ({
        id: r.id,
        itemName: r.item_name,
        message: r.message,
        status: r.status as 'pending' | 'approved' | 'denied' | 'pending_confirmation',
        adminResponse: r.admin_response,
        preferredDates: (r.preferred_dates as string[]) || [],
        confirmedDate: r.confirmed_date,
        adminProposedDate: r.admin_proposed_date,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      setRequests(mapped);
      // Count requests that need action (pending confirmation) or have responses
      setActionCount(mapped.filter((r) => r.status === 'pending_confirmation').length);
    } catch (error) {
      console.error('Error fetching my requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [user]);

  const handleConfirmDate = async (requestId: string, accept: boolean) => {
    setProcessingId(requestId);
    await confirmProposedDate(requestId, accept);
    await fetchMyRequests();
    setProcessingId(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending_confirmation':
        return <CalendarPlus className="h-4 w-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
      case 'pending_confirmation':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Action Required</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Denied</Badge>;
      default:
        return null;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/10">
          <ClipboardList className="h-5 w-5" />
          {actionCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center animate-pulse">
              {actionCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            My Requests
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No requests yet</p>
              <p className="text-sm mt-1">Request items from the inventory to see them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <p className="font-medium">{request.itemName}</p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Requested: {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>

                  {/* Preferred Dates */}
                  {request.preferredDates.length > 0 && (
                    <div className="p-2 bg-secondary/50 rounded text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Your preferred times:
                      </div>
                      <ul className="space-y-0.5 pl-5">
                        {request.preferredDates.map((date, idx) => (
                          <li key={idx} className="list-disc text-muted-foreground">
                            {format(new Date(date), 'EEE, MMM d • h:mm a')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Admin Proposed Date - Needs Confirmation */}
                  {request.status === 'pending_confirmation' && request.adminProposedDate && (
                    <div className="p-3 bg-blue-500/10 rounded text-sm border-l-4 border-blue-500 space-y-3">
                      <div>
                        <div className="font-medium mb-1 flex items-center gap-1.5 text-blue-700">
                          <CalendarPlus className="h-3.5 w-3.5" />
                          Admin Proposed Date
                        </div>
                        <p className="font-semibold text-blue-800">
                          {format(new Date(request.adminProposedDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-blue-700">
                          {format(new Date(request.adminProposedDate), 'h:mm a')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          disabled={processingId === request.id}
                          onClick={() => handleConfirmDate(request.id, true)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          disabled={processingId === request.id}
                          onClick={() => handleConfirmDate(request.id, false)}
                        >
                          <X className="h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Confirmed Pickup Date */}
                  {request.confirmedDate && (
                    <div className="p-3 bg-green-500/10 rounded text-sm border-l-4 border-green-500">
                      <div className="font-medium mb-1 flex items-center gap-1.5 text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Confirmed Pickup
                      </div>
                      <p className="font-semibold text-green-800">
                        {format(new Date(request.confirmedDate), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-green-700">
                        {format(new Date(request.confirmedDate), 'h:mm a')}
                      </p>
                    </div>
                  )}

                  {request.message && (
                    <div className="p-2 bg-secondary/50 rounded text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Your message:
                      </div>
                      {request.message}
                    </div>
                  )}

                  {request.adminResponse && (
                    <div className={`p-3 rounded text-sm border-l-4 ${
                      request.status === 'approved' 
                        ? 'bg-green-500/10 border-green-500' 
                        : request.status === 'denied'
                        ? 'bg-red-500/10 border-red-500'
                        : 'bg-primary/5 border-primary'
                    }`}>
                      <div className="font-medium mb-1 flex items-center gap-1.5">
                        {request.status === 'approved' ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        ) : request.status === 'denied' ? (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        ) : null}
                        Admin Response:
                      </div>
                      {request.adminResponse}
                    </div>
                  )}

                  {request.status !== 'pending' && !request.adminResponse && !request.confirmedDate && (
                    <div className={`p-2 rounded text-sm ${
                      request.status === 'approved' 
                        ? 'bg-green-500/10 text-green-700' 
                        : 'bg-red-500/10 text-red-700'
                    }`}>
                      {request.status === 'approved' 
                        ? 'Your request has been approved!' 
                        : 'Your request has been denied.'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
