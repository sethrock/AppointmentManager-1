import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, Appointment } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  User,
  Edit,
  Trash2,
  Tag,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ClientForm from "./ClientForm";
import { useLocation } from "wouter";

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ClientDetailModal({
  client,
  onClose,
  onUpdate,
}: ClientDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch client appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: [`/api/clients/${client.id}/appointments`],
    queryFn: () => apiRequest("GET", `/api/clients/${client.id}/appointments`),
  });

  // Fetch client analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/clients/${client.id}/analytics`],
    queryFn: () => apiRequest("GET", `/api/clients/${client.id}/analytics`),
  });

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clients/${client.id}`),
    onSuccess: () => {
      toast({
        title: "Client Deleted",
        description: "Client has been deleted successfully",
      });
      onUpdate();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Complete":
        return "text-green-600";
      case "Cancel":
        return "text-red-600";
      case "Reschedule":
        return "text-yellow-600";
      default:
        return "text-blue-600";
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const createNewAppointment = () => {
    setLocation(`/appointments/new?clientId=${client.id}`);
    onClose();
  };

  if (isEditMode) {
    return (
      <ClientForm
        client={client}
        onClose={() => setIsEditMode(false)}
        onSuccess={() => {
          setIsEditMode(false);
          onUpdate();
        }}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">{client.name}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge
                  variant={
                    client.status === "vip"
                      ? "default"
                      : client.status === "inactive"
                      ? "outline"
                      : "secondary"
                  }
                >
                  {client.status || "active"}
                </Badge>
                {client.marketingChannel && (
                  <Badge variant="outline">{client.marketingChannel}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-200px)] mt-6">
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{client.phoneNumber}</span>
                    </div>
                  )}
                  {(client.address || client.city || client.state || client.zipCode) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {client.address && <div>{client.address}</div>}
                        {(client.city || client.state || client.zipCode) && (
                          <div>
                            {client.city && <span>{client.city}</span>}
                            {client.city && client.state && <span>, </span>}
                            {client.state && <span>{client.state}</span>}
                            {client.zipCode && <span> {client.zipCode}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {client.communicationPreference && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Prefers: {client.communicationPreference}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Client Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                    <div className="text-2xl font-semibold">
                      {formatCurrency(client.totalRevenue || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Appointments</div>
                    <div className="text-2xl font-semibold">
                      {client.appointmentCount || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Last Visit</div>
                    <div className="text-lg">{formatDate(client.lastAppointmentDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Client Since</div>
                    <div className="text-lg">{formatDate(client.acquisitionDate || client.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>

              {client.tags && client.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center pt-4">
                <Button onClick={createNewAppointment}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book New Appointment
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="appointments" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Appointment History</h3>
                <Button size="sm" onClick={createNewAppointment}>
                  <Calendar className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              </div>

              {appointmentsLoading ? (
                <div className="text-center py-8">Loading appointments...</div>
              ) : !appointments || appointments.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    No appointments found for this client
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment: Appointment) => (
                    <Card key={appointment.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatDate(appointment.startDate)}
                              </span>
                              <span className="text-muted-foreground">
                                {appointment.startTime && formatTime(appointment.startTime)}
                              </span>
                              <Badge
                                variant="outline"
                                className={getStatusColor(
                                  appointment.dispositionStatus || "Scheduled"
                                )}
                              >
                                {appointment.dispositionStatus || "Scheduled"}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Provider: {appointment.provider}
                            </div>
                            <div className="text-sm">
                              Revenue: {formatCurrency(appointment.grossRevenue || 0)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLocation(`/appointments/${appointment.id}`);
                              onClose();
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {analyticsLoading ? (
                <div className="text-center py-8">Loading analytics...</div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(analytics.lifetimeValue)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Appointment Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(analytics.averageAppointmentValue)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analytics.totalAppointments > 0
                            ? Math.round(
                                (analytics.completedAppointments /
                                  analytics.totalAppointments) *
                                  100
                              )
                            : 0}
                          %
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {Math.round(analytics.cancellationRate)}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {analytics.preferredProviders && analytics.preferredProviders.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Preferred Providers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analytics.preferredProviders.map((prov: any) => (
                            <div key={prov.provider} className="flex justify-between">
                              <span>{prov.provider}</span>
                              <span className="text-muted-foreground">
                                {prov.count} appointments
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.preferredTimes && analytics.preferredTimes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Preferred Times</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analytics.preferredTimes.map((time: any) => (
                            <div key={time.hour} className="flex justify-between">
                              <span>{formatTime(`${time.hour}:00`)}</span>
                              <span className="text-muted-foreground">
                                {time.count} appointments
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    No analytics data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Internal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {client.internalNotes ? (
                    <div className="whitespace-pre-wrap">{client.internalNotes}</div>
                  ) : (
                    <div className="text-muted-foreground text-center py-4">
                      No internal notes for this client
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Important Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Reschedules:</span>{" "}
                    {analytics?.rescheduledAppointments || 0} times
                  </div>
                  <div>
                    <span className="font-medium">No-shows/Cancellations:</span>{" "}
                    {analytics?.cancelledAppointments || 0} times
                  </div>
                  {analytics?.paymentMethods && analytics.paymentMethods.length > 0 && (
                    <div>
                      <span className="font-medium">Payment Methods Used:</span>{" "}
                      {analytics.paymentMethods.map((pm: any) => pm.method).join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}