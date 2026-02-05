import { useState } from 'react';
import { Bell, Check, X, Mail, Building, Clock, MessageSquare, CalendarIcon, CalendarPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { DateTimePicker } from '@/components/DateTimePicker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AdminNotifications() {
  const { requests, pendingCount, updateRequest, deleteRequest, loading } = useItemRequests();
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'deny' | 'propose' | 'edit' | null>(null);
  const [response, setResponse] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [proposedDate, setProposedDate] = useState<Date | undefined>(undefined);
  const [editStatus, setEditStatus] = useState<'approved' | 'denied' | 'pending' | 'pending_confirmation'>('approved');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const sendNotification = async (request: ItemRequest, newStatus: string, adminResponse?: string, confirmedDate?: string, proposedDate?: string) => {
    if (!request.requesterEmail) return;
    
    try {
      await supabase.functions.invoke('notify-request-update', {
        body: {
          recipientEmail: request.requesterEmail,
          recipientName: request.requesterName,
          itemName: request.itemName,
          newStatus,
          adminResponse,
          confirmedDate,
          proposedDate,
        },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !action) return;

    setIsProcessing(true);
    let success = false;
    let newStatus = '';
    let confirmedDateStr: string | undefined;
    let proposedDateStr: string | undefined;
    
    if (action === 'approve') {
      newStatus = 'approved';
      confirmedDateStr = selectedDate || undefined;
      success = await updateRequest(
        selectedRequest.id,
        'approved',
        response,
        confirmedDateStr
      );
    } else if (action === 'deny') {
      newStatus = 'denied';
      success = await updateRequest(
        selectedRequest.id,
        'denied',
        response
      );
    } else if (action === 'propose' && proposedDate) {
      newStatus = 'pending_confirmation';
      proposedDateStr = proposedDate.toISOString();
      success = await updateRequest(
        selectedRequest.id,
        'pending_confirmation',
        response,
        undefined,
        proposedDateStr
      );
    } else if (action === 'edit') {
      newStatus = editStatus;
      if (editStatus === 'approved') {
        confirmedDateStr = selectedDate || proposedDate?.toISOString();
      } else if (editStatus === 'pending_confirmation' && proposedDate) {
        proposedDateStr = proposedDate.toISOString();
      }
      success = await updateRequest(
        selectedRequest.id,
        editStatus,
        response,
        confirmedDateStr,
        proposedDateStr
      );
    }

    // Send notification email if request has an email and action was successful
    if (success && selectedRequest.requesterEmail) {
      await sendNotification(
        selectedRequest,
        newStatus,
        response || undefined,
        confirmedDateStr,
        proposedDateStr
      );
      toast({
        title: 'Notification Sent',
        description: `${selectedRequest.requesterName} has been notified of the update.`,
      });
    }
    
    setSelectedRequest(null);
    setAction(null);
    setResponse('');
    setSelectedDate('');
    setProposedDate(undefined);
    setEditStatus('approved');
    setIsProcessing(false);
  };

  const openActionDialog = (request: ItemRequest, actionType: 'approve' | 'deny' | 'propose' | 'edit') => {
    setSelectedRequest(request);
    setAction(actionType);
    // Pre-select first date if available for approval
    if (actionType === 'approve' && request.preferredDates.length > 0) {
      setSelectedDate(request.preferredDates[0]);
    }
    // Reset proposed date
    if (actionType === 'propose') {
      setProposedDate(undefined);
    }
    // For edit, pre-fill with current values
    if (actionType === 'edit') {
      setEditStatus(request.status as 'approved' | 'denied' | 'pending' | 'pending_confirmation');
      setResponse(request.adminResponse || '');
      if (request.confirmedDate) {
        setSelectedDate(request.confirmedDate);
      }
      if (request.adminProposedDate) {
        setProposedDate(new Date(request.adminProposedDate));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Denied</Badge>;
      case 'pending_confirmation':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Awaiting Confirmation</Badge>;
      default:
        return null;
    }
  };

  const pendingActionCount = requests.filter((r) => r.status === 'pending' || r.status === 'pending_confirmation').length;

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/10">
            <Bell className="h-5 w-5" />
            {pendingActionCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
                {pendingActionCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Item Requests
              {pendingActionCount > 0 && (
                <Badge variant="secondary">{pendingActionCount} need attention</Badge>
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

                    {/* Preferred Pickup Dates */}
                    {request.preferredDates.length > 0 && (
                      <div className="p-2 bg-accent/30 rounded text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Preferred Pickup Times:
                        </div>
                        <ul className="space-y-1 pl-5">
                          {request.preferredDates.map((date, idx) => (
                            <li key={idx} className="list-disc">
                              {format(new Date(date), 'EEE, MMM d, yyyy • h:mm a')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Admin Proposed Date - Waiting for member confirmation */}
                    {request.status === 'pending_confirmation' && request.adminProposedDate && (
                      <div className="p-2 bg-blue-500/10 rounded text-sm border-l-2 border-blue-500">
                        <div className="flex items-center gap-1.5 font-medium text-blue-700 mb-1">
                          <CalendarPlus className="h-3.5 w-3.5" />
                          Proposed Pickup (Awaiting Confirmation):
                        </div>
                        {format(new Date(request.adminProposedDate), 'EEE, MMM d, yyyy • h:mm a')}
                      </div>
                    )}

                    {/* Confirmed Date */}
                    {request.confirmedDate && (
                      <div className="p-2 bg-green-500/10 rounded text-sm border-l-2 border-green-500">
                        <div className="flex items-center gap-1.5 font-medium text-green-700 mb-1">
                          <Check className="h-3.5 w-3.5" />
                          Confirmed Pickup:
                        </div>
                        {format(new Date(request.confirmedDate), 'EEE, MMM d, yyyy • h:mm a')}
                      </div>
                    )}

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
                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => openActionDialog(request, 'approve')}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1 text-destructive hover:text-destructive"
                            onClick={() => openActionDialog(request, 'deny')}
                          >
                            <X className="h-3.5 w-3.5" />
                            Deny
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1"
                          onClick={() => openActionDialog(request, 'propose')}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          Propose Different Date
                        </Button>
                      </div>
                    )}

                    {/* Edit button for approved/denied requests */}
                    {(request.status === 'approved' || request.status === 'denied') && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1"
                          onClick={() => openActionDialog(request, 'edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit Request
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
        setSelectedDate('');
        setProposedDate(undefined);
      }}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' ? 'Approve Request' : action === 'propose' ? 'Propose Different Date' : action === 'edit' ? 'Edit Request' : 'Deny Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'approve'
                ? `Are you sure you want to approve the request for "${selectedRequest?.itemName}"?`
                : action === 'propose'
                ? `Propose a different pickup date for "${selectedRequest?.itemName}". The member will need to confirm.`
                : action === 'edit'
                ? `Edit the request for "${selectedRequest?.itemName}". A notification will be sent to the requester.`
                : `Are you sure you want to deny the request for "${selectedRequest?.itemName}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Status Selection for Edit */}
          {action === 'edit' && (
            <div className="space-y-3 py-2">
              <Label>Status</Label>
              <RadioGroup value={editStatus} onValueChange={(v) => setEditStatus(v as 'approved' | 'denied' | 'pending' | 'pending_confirmation')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approved" id="status-approved" />
                  <Label htmlFor="status-approved" className="font-normal cursor-pointer">Approved</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="denied" id="status-denied" />
                  <Label htmlFor="status-denied" className="font-normal cursor-pointer">Denied</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="status-pending" />
                  <Label htmlFor="status-pending" className="font-normal cursor-pointer">Pending</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending_confirmation" id="status-pending-conf" />
                  <Label htmlFor="status-pending-conf" className="font-normal cursor-pointer">Pending Confirmation</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Date Selection for Approval or Edit with approved status */}
          {(action === 'approve' || (action === 'edit' && editStatus === 'approved')) && selectedRequest?.preferredDates && selectedRequest.preferredDates.length > 0 && (
            <div className="space-y-3 py-2">
              <Label>Select Pickup Date & Time</Label>
              <RadioGroup value={selectedDate} onValueChange={setSelectedDate}>
                {selectedRequest.preferredDates.map((date, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <RadioGroupItem value={date} id={`date-${idx}`} />
                    <Label htmlFor={`date-${idx}`} className="font-normal cursor-pointer">
                      {format(new Date(date), 'EEE, MMM d, yyyy • h:mm a')}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Date Picker for Proposing Different Date or Edit with pending_confirmation */}
          {(action === 'propose' || (action === 'edit' && editStatus === 'pending_confirmation')) && (
            <div className="space-y-3 py-2">
              <Label>Select a Date & Time to Propose</Label>
              <DateTimePicker
                value={proposedDate}
                onChange={setProposedDate}
                placeholder="Select proposed pickup date/time"
              />
            </div>
          )}

          {/* Custom date picker for edit with approved status if no preferred dates */}
          {action === 'edit' && editStatus === 'approved' && (!selectedRequest?.preferredDates || selectedRequest.preferredDates.length === 0) && (
            <div className="space-y-3 py-2">
              <Label>Select Pickup Date & Time</Label>
              <DateTimePicker
                value={proposedDate}
                onChange={setProposedDate}
                placeholder="Select pickup date/time"
              />
            </div>
          )}

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
              disabled={
                isProcessing || 
                (action === 'approve' && selectedRequest?.preferredDates && selectedRequest.preferredDates.length > 0 && !selectedDate) ||
                (action === 'propose' && !proposedDate) ||
                (action === 'edit' && editStatus === 'pending_confirmation' && !proposedDate)
              }
              className={action === 'deny' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {action === 'approve' ? 'Approve' : action === 'propose' ? 'Send Proposal' : action === 'edit' ? 'Save & Notify' : 'Deny'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
