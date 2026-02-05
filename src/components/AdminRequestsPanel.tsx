import { useState } from 'react';
import { Check, X, Mail, Building, Clock, MessageSquare, CalendarIcon, CalendarPlus, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useItemRequests, ItemRequest } from '@/hooks/useItemRequests';
import { format } from 'date-fns';
import { DateTimePicker } from '@/components/DateTimePicker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AdminRequestsPanel() {
  const { requests, updateRequest, deleteRequest, loading } = useItemRequests();
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'deny' | 'propose' | 'edit' | null>(null);
  const [response, setResponse] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [proposedDate, setProposedDate] = useState<Date | undefined>(undefined);
  const [editStatus, setEditStatus] = useState<'approved' | 'denied' | 'pending' | 'pending_confirmation'>('approved');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const sendNotification = async (request: ItemRequest, newStatus: string, adminResponse?: string, confirmedDate?: string, proposedDateStr?: string) => {
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
          proposedDate: proposedDateStr,
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
    if (actionType === 'approve' && request.preferredDates.length > 0) {
      setSelectedDate(request.preferredDates[0]);
    }
    if (actionType === 'propose') {
      setProposedDate(undefined);
    }
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
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-available/10 text-available border-available/30">Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Denied</Badge>;
      case 'pending_confirmation':
        return <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">Awaiting Confirmation</Badge>;
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.requesterEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    pending_confirmation: requests.filter(r => r.status === 'pending_confirmation').length,
    approved: requests.filter(r => r.status === 'approved').length,
    denied: requests.filter(r => r.status === 'denied').length,
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-accent' : 'hover:border-accent/50'}`}
          onClick={() => setStatusFilter('all')}
        >
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{statusCounts.all}</p>
        </div>
        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-warning' : 'hover:border-warning/50'}`}
          onClick={() => setStatusFilter('pending')}
        >
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-warning">{statusCounts.pending}</p>
        </div>
        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${statusFilter === 'pending_confirmation' ? 'ring-2 ring-accent' : 'hover:border-accent/50'}`}
          onClick={() => setStatusFilter('pending_confirmation')}
        >
          <p className="text-sm text-muted-foreground">Awaiting</p>
          <p className="text-2xl font-bold text-accent">{statusCounts.pending_confirmation}</p>
        </div>
        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-available' : 'hover:border-available/50'}`}
          onClick={() => setStatusFilter('approved')}
        >
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold text-available">{statusCounts.approved}</p>
        </div>
        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${statusFilter === 'denied' ? 'ring-2 ring-destructive' : 'hover:border-destructive/50'}`}
          onClick={() => setStatusFilter('denied')}
        >
          <p className="text-sm text-muted-foreground">Denied</p>
          <p className="text-2xl font-bold text-destructive">{statusCounts.denied}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by item name, requester name, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-xl">
          No requests found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="p-4 border rounded-xl space-y-3 bg-card"
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

              {request.preferredDates.length > 0 && (
                <div className="p-2 bg-accent/10 rounded text-sm">
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

              {request.status === 'pending_confirmation' && request.adminProposedDate && (
                <div className="p-2 bg-accent/10 rounded text-sm border-l-2 border-accent">
                  <div className="flex items-center gap-1.5 font-medium text-accent mb-1">
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Proposed Pickup (Awaiting Confirmation):
                  </div>
                  {format(new Date(request.adminProposedDate), 'EEE, MMM d, yyyy • h:mm a')}
                </div>
              )}

              {request.confirmedDate && (
                <div className="p-2 bg-available/10 rounded text-sm border-l-2 border-available">
                  <div className="flex items-center gap-1.5 font-medium text-available mb-1">
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

      {/* Action Dialog */}
      <AlertDialog open={!!selectedRequest && !!action} onOpenChange={() => {
        setSelectedRequest(null);
        setAction(null);
        setResponse('');
        setSelectedDate('');
        setProposedDate(undefined);
        setEditStatus('approved');
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

          {action === 'edit' && (
            <div className="space-y-3 py-2">
              <Label>Status</Label>
              <RadioGroup value={editStatus} onValueChange={(v) => setEditStatus(v as 'approved' | 'denied' | 'pending' | 'pending_confirmation')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approved" id="panel-status-approved" />
                  <Label htmlFor="panel-status-approved" className="font-normal cursor-pointer">Approved</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="denied" id="panel-status-denied" />
                  <Label htmlFor="panel-status-denied" className="font-normal cursor-pointer">Denied</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="panel-status-pending" />
                  <Label htmlFor="panel-status-pending" className="font-normal cursor-pointer">Pending</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending_confirmation" id="panel-status-pending-conf" />
                  <Label htmlFor="panel-status-pending-conf" className="font-normal cursor-pointer">Pending Confirmation</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {(action === 'approve' || (action === 'edit' && editStatus === 'approved')) && selectedRequest?.preferredDates && selectedRequest.preferredDates.length > 0 && (
            <div className="space-y-3 py-2">
              <Label>Select Pickup Date & Time</Label>
              <RadioGroup value={selectedDate} onValueChange={setSelectedDate}>
                {selectedRequest.preferredDates.map((date, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <RadioGroupItem value={date} id={`panel-date-${idx}`} />
                    <Label htmlFor={`panel-date-${idx}`} className="font-normal cursor-pointer">
                      {format(new Date(date), 'EEE, MMM d, yyyy • h:mm a')}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

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
            <Label htmlFor="panel-response">Response message (optional)</Label>
            <Textarea
              id="panel-response"
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
    </div>
  );
}
