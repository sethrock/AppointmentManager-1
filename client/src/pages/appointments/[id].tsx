import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Appointment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, Clock, ArrowLeft, Trash2 } from "lucide-react";
import AppointmentDetail from "@/components/appointment/AppointmentDetail";
import AppointmentStatus from "@/components/appointment/AppointmentStatus";
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
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // State for appointment status modals
  const [statusAction, setStatusAction] = useState<"Reschedule" | "Complete" | "Cancel" | null>(null);

  const { data: appointment, isLoading, error } = useQuery<Appointment>({
    queryKey: [`/api/appointments/${id}`],
    enabled: !isNaN(id),
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/appointments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      navigate('/appointments');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete appointment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleDelete = () => {
    deleteAppointmentMutation.mutate();
  };
  
  // Handlers for status updates
  const handleReschedule = () => {
    setStatusAction("Reschedule");
  };
  
  const handleComplete = () => {
    setStatusAction("Complete");
  };
  
  const handleCancel = () => {
    setStatusAction("Cancel");
  };
  
  const handleStatusDialogClose = () => {
    setStatusAction(null);
  };
  
  const handleStatusSuccess = () => {
    // This will be called after successful status update
    toast({
      title: "Success",
      description: `Appointment ${statusAction?.toLowerCase()}d successfully`,
    });
  };

  if (isNaN(id)) {
    return (
      <div className="p-6">
        <Card className="bg-destructive/10">
          <CardContent className="pt-6 pb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
            <p>Invalid appointment ID.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-destructive/10">
          <CardContent className="pt-6 pb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
            <p>Error loading appointment: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/appointments">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Appointments
          </Link>
        </Button>

        {!isLoading && appointment && (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this appointment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the appointment
                  and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-2/5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : appointment ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold">
              Appointment with {appointment.clientName || "Unnamed Client"}
            </h1>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              appointment.dispositionStatus === "Complete" 
                ? "bg-green-100 text-green-800" 
                : appointment.dispositionStatus === "Cancel"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
            }`}>
              {appointment.dispositionStatus || "Scheduled"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{appointment.startDate}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{appointment.startTime}</span>
                </div>
                {appointment.callDuration && (
                  <div className="text-xs text-muted-foreground">
                    Duration: {appointment.callDuration} hours
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Provider
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">{appointment.provider}</div>
                <div className="text-xs text-muted-foreground">
                  Marketing Channel: {appointment.marketingChannel}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projected Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  {formatCurrency(appointment.grossRevenue || 0)}
                </div>
                {appointment.totalCollected > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Collected: {formatCurrency(appointment.totalCollected)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              {appointment.hasClientNotes && (
                <TabsTrigger value="notes">Notes</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="details">
              <AppointmentDetail 
                appointment={appointment} 
                onReschedule={handleReschedule}
                onComplete={handleComplete}
                onCancel={handleCancel}
              />
            </TabsContent>
            
            <TabsContent value="financials">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Projected Revenue</h3>
                      <p className="text-lg font-medium">{formatCurrency(appointment.grossRevenue || 0)}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Expenses</h3>
                      <p className="text-lg font-medium">{formatCurrency(appointment.totalExpenses || 0)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Deposit Amount</h3>
                      <p className="text-lg font-medium">{formatCurrency(appointment.depositAmount || 0)}</p>
                      {appointment.depositReceivedBy && (
                        <p className="text-xs text-muted-foreground">
                          Received by: {appointment.depositReceivedBy}
                        </p>
                      )}
                      {appointment.paymentProcessUsed && (
                        <p className="text-xs text-muted-foreground">
                          Payment method: {appointment.paymentProcessUsed}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Due To Provider</h3>
                      <p className="text-lg font-medium">{formatCurrency(appointment.dueToProvider || 0)}</p>
                    </div>
                  </div>
                  
                  {appointment.dispositionStatus === "Complete" && (
                    <div className="mt-6">
                      <h3 className="text-base font-medium mb-2">Payment Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Cash Collected</h4>
                          <p className="text-lg font-medium">{formatCurrency(appointment.totalCollectedCash || 0)}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Digital Collected</h4>
                          <p className="text-lg font-medium">{formatCurrency(appointment.totalCollectedDigital || 0)}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Collected</h4>
                          <p className="text-lg font-medium">{formatCurrency(appointment.totalCollected || 0)}</p>
                        </div>
                      </div>
                      
                      {appointment.paymentProcessor && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Processor</h4>
                          <p>{appointment.paymentProcessor}</p>
                        </div>
                      )}
                      
                      {appointment.paymentNotes && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Notes</h4>
                          <p className="text-sm">{appointment.paymentNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {appointment.hasClientNotes && (
              <TabsContent value="notes">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {appointment.clientNotes ? (
                      <p className="whitespace-pre-line">{appointment.clientNotes}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No notes provided.</p>
                    )}
                    
                    {appointment.appointmentNotes && (
                      <div className="mt-6">
                        <h3 className="text-base font-medium mb-2">Appointment Notes</h3>
                        <p className="whitespace-pre-line">{appointment.appointmentNotes}</p>
                      </div>
                    )}
                    
                    {appointment.dispositionStatus === "Cancel" && appointment.cancellationDetails && (
                      <div className="mt-6">
                        <h3 className="text-base font-medium mb-2">Cancellation Details</h3>
                        <p className="whitespace-pre-line">{appointment.cancellationDetails}</p>
                        {appointment.whoCanceled && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Canceled by: {appointment.whoCanceled}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
          
          {/* Status update modals */}
          {statusAction && appointment && (
            <AppointmentStatus 
              appointmentId={id}
              appointment={appointment}
              action={statusAction}
              isOpen={!!statusAction}
              onClose={handleStatusDialogClose}
              onSuccess={handleStatusSuccess}
            />
          )}
        </>
      ) : (
        <Card className="bg-destructive/10">
          <CardContent className="pt-6 pb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
            <p>Appointment not found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
