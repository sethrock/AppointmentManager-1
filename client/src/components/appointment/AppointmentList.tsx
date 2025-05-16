import { Appointment } from "@shared/schema";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, Calendar, Clock, Phone, Mail, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface AppointmentListProps {
  appointments: Appointment[];
  isLoading: boolean;
}

export default function AppointmentList({ 
  appointments,
  isLoading,
}: AppointmentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 border border-border/40 rounded-lg bg-card/50 backdrop-blur-sm">
            <Skeleton className="h-12 w-12 rounded-full bg-muted/50" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48 bg-muted/50" />
              <Skeleton className="h-4 w-32 bg-muted/50" />
            </div>
            <Skeleton className="h-8 w-16 bg-muted/50" />
          </div>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-md">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-foreground">No appointments found</h3>
          <p className="text-muted-foreground mb-6">Start by creating your first appointment</p>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
            <Link href="/appointments/new">
              Create Your First Appointment
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Desktop view - Table
  const desktopView = (
    <div className="hidden md:block rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-muted/50">
            <TableHead className="font-semibold">Client</TableHead>
            <TableHead className="font-semibold">Date & Time</TableHead>
            <TableHead className="font-semibold">Provider</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Revenue</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment.id} className="hover:bg-muted/20">
              <TableCell className="font-medium">
                {appointment.clientName || "Unnamed Client"}
                <div className="text-xs text-muted-foreground">
                  {appointment.callType === "in-call" ? "In-Call" : "Out-Call"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.startDate}
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.startTime}
                </div>
              </TableCell>
              <TableCell>{appointment.provider}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  appointment.dispositionStatus === "Complete" 
                    ? "status-complete" 
                    : appointment.dispositionStatus === "Cancel"
                      ? "status-cancel"
                      : appointment.dispositionStatus === "Reschedule"
                        ? "status-reschedule"
                        : "status-scheduled"
                }`}>
                  {appointment.dispositionStatus || "Scheduled"}
                </span>
              </TableCell>
              <TableCell>{formatCurrency(appointment.grossRevenue || 0)}</TableCell>
              <TableCell className="text-right">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary"
                  asChild
                >
                  <Link href={`/appointments/${appointment.id}`}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
  
  // Mobile view - Cards
  const mobileView = (
    <div className="md:hidden space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="border-border/50 bg-card shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-foreground">{appointment.clientName || "Unnamed Client"}</h3>
                <div className="text-xs text-muted-foreground">
                  Provider: {appointment.provider}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                appointment.dispositionStatus === "Complete" 
                  ? "status-complete" 
                  : appointment.dispositionStatus === "Cancel"
                    ? "status-cancel"
                    : appointment.dispositionStatus === "Reschedule"
                      ? "status-reschedule"
                      : "status-scheduled"
              }`}>
                {appointment.dispositionStatus || "Scheduled"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 my-2 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" /> 
                {appointment.startDate}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" /> 
                {appointment.startTime}
              </div>
              
              {appointment.phoneNumber && (
                <div className="flex items-center col-span-2">
                  <Phone className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.phoneNumber}
                </div>
              )}
              
              {appointment.clientEmail && (
                <div className="flex items-center col-span-2">
                  <Mail className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.clientEmail}
                </div>
              )}
              
              {appointment.callType === "out-call" && appointment.city && (
                <div className="flex items-center col-span-2">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.city}, {appointment.state}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/30">
              <div className="font-medium text-foreground">
                Projected Revenue: {formatCurrency(appointment.grossRevenue || 0)}
                {(appointment.dispositionStatus === "Complete" || appointment.dispositionStatus === "Cancel") && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Total Collected: {formatCurrency((appointment.totalCollectedCash || 0) + (appointment.totalCollectedDigital || 0) + (appointment.depositAmount || 0))}
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary"
                asChild
              >
                <Link href={`/appointments/${appointment.id}`}>
                  <Eye className="h-4 w-4 mr-1" /> Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {desktopView}
      {mobileView}
    </>
  );
}
